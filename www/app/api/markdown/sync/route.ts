import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../lib/sessionApp';
import {getAuthenticatedClientApp} from '../../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../../lib/oauthClient';
import {
  getMarkdownPresentationId,
  setMarkdownPresentationId,
  userPrefix,
} from '../../../../lib/storage';
import {parseMarkdownSlides} from '../../../../lib/markdownSlides';
import {
  getOrCreatePresentation,
  syncSlidesToPresentation,
} from '../../../../lib/markdownToSlides';
import {z} from 'zod';

const syncBodySchema = z.object({
  markdown: z.string(),
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

  const parsed = syncBodySchema.safeParse(body);
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

  const prefix = userPrefix(userId);
  const existingId = await getMarkdownPresentationId(prefix);
  const {client: auth} = authResult;

  try {
    const {presentationId, created} = await getOrCreatePresentation(
      auth,
      existingId
    );
    if (created) {
      await setMarkdownPresentationId(prefix, presentationId);
    }

    const parsedSlides = parseMarkdownSlides(parsed.data.markdown);
    const theme = parsed.data.theme ?? undefined;
    const syncResult = await syncSlidesToPresentation(
      auth,
      presentationId,
      parsedSlides,
      theme
    );

    return NextResponse.json({
      presentationId: syncResult.presentationId,
      slides: syncResult.slides,
    });
  } catch (error: unknown) {
    console.error('[markdown/sync] Error:', error);
    return NextResponse.json(
      {
        error: (error as Error).message || 'Failed to sync markdown to slides',
      },
      {status: 500}
    );
  }
}
