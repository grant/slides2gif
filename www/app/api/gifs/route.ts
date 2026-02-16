import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../lib/sessionApp';
import {GoogleAuth} from 'google-auth-library';
import {google} from 'googleapis';
import {
  cacheSlideThumbnail,
  getCachedSlideUrl,
  userPrefix,
} from '../../../lib/storage';
import {getAuthenticatedClientApp} from '../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../lib/oauthClient';
import {Storage} from '@google-cloud/storage';
import {
  gifDeleteBodySchema,
  generateGifBodySchema,
} from '../../../lib/api/schemas';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';
const ALLOWED_PREFIX = `https://storage.googleapis.com/${BUCKET_NAME}/`;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.googleTokens?.access_token && !session.googleOAuth) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({error: 'Invalid JSON body'}, {status: 400});
    }

    const parsed = generateGifBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {error: 'Invalid request', issues: parsed.error.issues},
        {status: 400}
      );
    }

    const {
      presentationId,
      slideList,
      delay,
      quality,
      repeat,
      thumbnailSize = 'MEDIUM',
    } = parsed.data;

    const userId = await getSessionUserId(session);
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Could not identify user. Please log out and log in again.',
        },
        {status: 401}
      );
    }
    const prefix = userPrefix(userId);

    const slideObjectIds = slideList.split(',').map(id => id.trim());
    let presentationTitle: string | undefined;

    const authResult = await getAuthenticatedClientApp(session);
    if ('error' in authResult) {
      return authResult.error;
    }

    try {
      const {client: auth} = authResult;
      /* eslint-disable @typescript-eslint/no-explicit-any -- @google-cloud/storage bundles different google-auth-library */
      const slides = google.slides({version: 'v1', auth: auth as any});
      try {
        const drive = google.drive({version: 'v3', auth: auth as any});
        /* eslint-enable @typescript-eslint/no-explicit-any */
        const fileData = await drive.files.get({
          fileId: presentationId,
          fields: 'name',
        });
        presentationTitle =
          (fileData.data as {name?: string}).name || undefined;
      } catch {
        // Continue without title
      }

      const thumbnailPromises = slideObjectIds.map(async objectId => {
        const cachedUrl = await getCachedSlideUrl(
          presentationId,
          objectId,
          thumbnailSize,
          prefix
        );
        if (cachedUrl) {
          return {objectId, cached: true};
        }

        try {
          const thumbnail = await slides.presentations.pages.getThumbnail({
            presentationId,
            pageObjectId: objectId,
            'thumbnailProperties.thumbnailSize': thumbnailSize,
            'thumbnailProperties.mimeType': 'PNG',
          });

          const thumbnailUrl = thumbnail.data.contentUrl;
          if (thumbnailUrl) {
            await cacheSlideThumbnail(
              presentationId,
              objectId,
              thumbnailUrl,
              thumbnailSize,
              prefix
            );
            return {objectId, cached: false};
          }
          return {objectId, cached: false, error: 'No thumbnail URL'};
        } catch (error: unknown) {
          return {objectId, error: (error as Error).message};
        }
      });

      await Promise.all(thumbnailPromises);
    } catch (error: unknown) {
      console.error('[www] Error fetching high-res thumbnails:', error);
    }

    const isProd = !!process.env.GOOGLE_CLOUD_PROJECT;
    const png2gifServiceUrl =
      process.env.PNG2GIF_SERVICE_URL ||
      process.env.NEXT_PUBLIC_PNG2GIF_SERVICE_URL ||
      (isProd ? '' : 'http://localhost:3001');

    if (!png2gifServiceUrl) {
      return NextResponse.json(
        {
          error:
            'GIF generation is not configured. Deploy the png2gif service and redeploy www so PNG2GIF_SERVICE_URL is set.',
        },
        {status: 503}
      );
    }

    let authHeaders: Record<string, string> = {};
    if (isProd) {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const client = await auth.getIdTokenClient(png2gifServiceUrl);
      const idToken =
        await client.idTokenProvider.fetchIdToken(png2gifServiceUrl);
      authHeaders = {Authorization: `Bearer ${idToken}`};
    }

    const baseUrl = png2gifServiceUrl.endsWith('/')
      ? png2gifServiceUrl.slice(0, -1)
      : png2gifServiceUrl;
    const url = new URL(`${baseUrl}/createGif`);
    url.searchParams.set('presentationId', presentationId);
    url.searchParams.set('slideList', slideList);
    url.searchParams.set('thumbnailSize', thumbnailSize);
    url.searchParams.set('userPrefix', prefix);
    if (presentationTitle) {
      url.searchParams.set('presentationTitle', presentationTitle);
    }
    if (delay !== undefined) {
      url.searchParams.set('delay', delay.toString());
    }
    if (quality !== undefined) {
      url.searchParams.set('quality', quality.toString());
    }
    if (repeat !== undefined) {
      url.searchParams.set('repeat', repeat.toString());
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          'X-User-Prefix': prefix,
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 300000);
          return controller.signal;
        })(),
      });
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException & {
        name?: string;
        cause?: {code?: string};
      };
      if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
        return NextResponse.json(
          {
            error: isProd
              ? 'png2gif service is unavailable. Ensure the png2gif Cloud Run service is deployed and PNG2GIF_SERVICE_URL is set on the www service.'
              : "png2gif service is not available. Please ensure it's running on port 3001.",
          },
          {status: 503}
        );
      }
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return NextResponse.json(
          {error: 'Request to png2gif service timed out.'},
          {status: 504}
        );
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {error: `Failed to generate GIF: ${errorText}`},
        {status: response.status}
      );
    }

    const result = (await response.json()) as {
      result?: string;
      file?: string;
    };

    if (result.result === 'SUCCESS' && result.file) {
      let gifUrl: string;
      if (result.file.startsWith('gs://')) {
        const gsPath = result.file.replace('gs://', '');
        const [bucket, ...pathParts] = gsPath.split('/');
        const filename = pathParts.join('/');
        gifUrl = `https://storage.googleapis.com/${bucket}/${filename}`;
      } else {
        const bucketName =
          process.env.GCS_CACHE_BUCKET || 'slides2gif-upload-test';
        gifUrl = `https://storage.googleapis.com/${bucketName}/${result.file}`;
      }

      return NextResponse.json({gifUrl});
    }

    return NextResponse.json(
      {error: result.result || 'Failed to generate GIF'},
      {status: 500}
    );
  } catch (error: unknown) {
    console.error('Error generating GIF:', error);
    return NextResponse.json(
      {
        error: (error as Error).message || 'Internal server error',
      },
      {status: 500}
    );
  }
}

export async function DELETE(request: NextRequest) {
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON body'}, {status: 400});
  }

  const parsed = gifDeleteBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'Invalid or missing gifUrl', issues: parsed.error.issues},
      {status: 400}
    );
  }
  const {gifUrl} = parsed.data;

  if (!gifUrl.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      {error: 'Invalid or disallowed gifUrl'},
      {status: 400}
    );
  }

  const path = gifUrl.slice(ALLOWED_PREFIX.length);
  const prefix = userPrefix(userId);

  if (!path.startsWith(prefix)) {
    return NextResponse.json(
      {error: 'You can only delete your own GIFs'},
      {status: 403}
    );
  }

  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(path);
    await file.delete();
    return NextResponse.json({ok: true});
  } catch (error: unknown) {
    const err = error as Error & {code?: number};
    console.error('[gifs DELETE] Error deleting file:', err);
    const message =
      err.code === 403
        ? 'Permission denied. Check bucket permissions.'
        : err.message || 'Failed to delete GIF';
    return NextResponse.json({error: message}, {status: 500});
  }
}
