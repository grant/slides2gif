import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/sessionApp';
import {google} from 'googleapis';
import {Credentials} from 'google-auth-library';
import {
  cacheSlideThumbnail,
  makePresentationFilesPublic,
  userPrefix,
} from '../../../../../lib/storage';
import {checkRateLimit} from '../../../../../lib/rateLimit';
import {Auth} from '../../../../../lib/oauth';
import {getAuthenticatedClientApp} from '../../../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../../../lib/oauthClient';

export async function POST(
  request: NextRequest,
  {params}: {params: Promise<{fileId: string}>}
) {
  const {fileId} = await params;

  if (!fileId) {
    return NextResponse.json(
      {error: 'Missing fileId parameter'},
      {status: 400}
    );
  }

  const session = await getSession();

  let userId = 'anonymous';
  try {
    const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
    const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        {error: 'OAuth credentials not configured'},
        {status: 500}
      );
    }

    const host = request.headers.get('host') ?? '';
    const baseURL =
      host.includes('localhost') || host.includes('127.0.0.1')
        ? `http://${host}`
        : `https://${host}`;
    Auth.setup(baseURL);

    const accessToken = session.googleTokens?.access_token;
    if (!accessToken) {
      return NextResponse.json(
        {error: 'Not authenticated'},
        {status: 401}
      );
    }

    const fetchedUserId = await Auth.getUserIDFromCredentials({
      access_token: accessToken,
    } as Credentials);
    if (fetchedUserId) {
      userId = fetchedUserId;
    } else {
      userId =
        session.googleOAuth?.code ||
        accessToken.substring(0, 20) ||
        'anonymous';
    }
  } catch {
    userId =
      session.googleOAuth?.code ||
      session.googleTokens?.access_token?.substring(0, 20) ||
      'anonymous';
  }

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  const sessionUserId = await getSessionUserId(session);
  if (!sessionUserId) {
    return NextResponse.json(
      {
        error:
          'Could not identify user. Please log out and log in again.',
      },
      {status: 401}
    );
  }

  const prefix = userPrefix(sessionUserId);

  try {
    const {client: auth} = authResult;
    const slides = google.slides({version: 'v1', auth: auth as google.auth.OAuth2Client});

    const presentation = await slides.presentations.get({
      presentationId: fileId,
    });

    const slidePages = presentation.data.slides || [];
    const results: Array<{
      objectId: string;
      success: boolean;
      error?: string;
    }> = [];

    const DELAY_MS = 2000;
    const BATCH_SIZE = 1;

    for (let i = 0; i < slidePages.length; i += BATCH_SIZE) {
      const batch = slidePages.slice(i, i + BATCH_SIZE);

      for (const page of batch) {
        const objectId = page.objectId || '';

        const rateLimit = checkRateLimit(userId);
        if (!rateLimit.allowed) {
          results.push({
            objectId,
            success: false,
            error: 'Rate limit exceeded',
          });
          continue;
        }

        try {
          const thumbnail = await slides.presentations.pages.getThumbnail({
            presentationId: fileId,
            pageObjectId: objectId,
            'thumbnailProperties.thumbnailSize': 'SMALL',
            'thumbnailProperties.mimeType': 'PNG',
          });

          const thumbnailUrl = thumbnail.data.contentUrl;

          if (thumbnailUrl) {
            await cacheSlideThumbnail(
              fileId,
              objectId,
              thumbnailUrl,
              'SMALL',
              prefix
            );
            results.push({objectId, success: true});
          } else {
            results.push({
              objectId,
              success: false,
              error: 'No thumbnail URL returned',
            });
          }
        } catch (error: unknown) {
          const err = error as {code?: number; message?: string};
          results.push({
            objectId,
            success: false,
            error:
              err.code === 429
                ? 'API rate limit exceeded'
                : err.message || 'Unknown error',
          });

          if (err.code === 429) {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }

        if (i + BATCH_SIZE < slidePages.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    const publicResult = await makePresentationFilesPublic(fileId, prefix);

    return NextResponse.json({
      success: true,
      total: slidePages.length,
      succeeded: successCount,
      failed: failureCount,
      results,
      publicFiles: {
        succeeded: publicResult.succeeded,
        failed: publicResult.failed,
      },
    });
  } catch (error: unknown) {
    console.error('Error refetching presentation:', error);
    return NextResponse.json(
      {
        error: 'Failed to refetch presentation',
        message: (error as Error).message,
      },
      {status: 500}
    );
  }
}
