import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../lib/sessionApp';
import {google} from 'googleapis';
import {
  cacheSlideThumbnail,
  getCachedMarkdownSlideUrl,
  themeCacheKey,
  userPrefix,
} from '../../../../lib/storage';
import {getAuthenticatedClientApp} from '../../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../../lib/oauthClient';
import {z} from 'zod';

const thumbnailsBodySchema = z.object({
  presentationId: z.string().min(1),
  slides: z.array(
    z.object({
      objectId: z.string(),
      contentHash: z.string(),
    })
  ),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  theme: z
    .object({
      accentColor: z.string().nullable(),
      backgroundColor: z.string().nullable(),
      titleFontColor: z.string().nullable(),
      bodyFontColor: z.string().nullable(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.googleTokens?.access_token && !session.googleOAuth) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const userId = await getSessionUserId(session);
  if (!userId) {
    return NextResponse.json(
      {error: 'Could not identify user. Please log out and log in again.'},
      {status: 401}
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON body'}, {status: 400});
  }

  const parsed = thumbnailsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'Invalid request', issues: parsed.error.issues},
      {status: 400}
    );
  }

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  const {presentationId, slides, size = 'SMALL', theme} = parsed.data;
  const prefix = userPrefix(userId);
  const themeKey = themeCacheKey(theme ?? null);
  const {client: auth} = authResult;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const slidesApi = google.slides({version: 'v1', auth: auth as any});

  const results: {objectId: string; thumbnailUrl: string | null}[] = [];

  for (const slide of slides) {
    const cachedUrl = await getCachedMarkdownSlideUrl(
      slide.contentHash,
      size,
      prefix,
      themeKey
    );
    if (cachedUrl) {
      results.push({objectId: slide.objectId, thumbnailUrl: cachedUrl});
      continue;
    }

    try {
      const thumbnail = await slidesApi.presentations.pages.getThumbnail({
        presentationId,
        pageObjectId: slide.objectId,
        'thumbnailProperties.thumbnailSize': size,
        'thumbnailProperties.mimeType': 'PNG',
      });
      const thumbnailUrl = thumbnail.data.contentUrl;
      if (thumbnailUrl) {
        await cacheSlideThumbnail(
          presentationId,
          slide.objectId,
          thumbnailUrl,
          size,
          prefix,
          slide.contentHash,
          themeKey
        );
        const publicUrl = await getCachedMarkdownSlideUrl(
          slide.contentHash,
          size,
          prefix,
          themeKey
        );
        results.push({
          objectId: slide.objectId,
          thumbnailUrl: publicUrl || thumbnailUrl,
        });
      } else {
        results.push({objectId: slide.objectId, thumbnailUrl: null});
      }
    } catch (error: unknown) {
      console.error(
        `[markdown/thumbnails] getThumbnail failed for ${slide.objectId}:`,
        error
      );
      results.push({objectId: slide.objectId, thumbnailUrl: null});
    }
  }

  return NextResponse.json({slides: results});
}
