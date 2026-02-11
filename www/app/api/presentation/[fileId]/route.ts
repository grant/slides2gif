import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../lib/sessionApp';
import {google} from 'googleapis';
import {
  getCachedSlideUrl,
  cacheSlideThumbnail,
  ensureBucketExists,
  userPrefix,
} from '../../../../lib/storage';
import {checkRateLimit, getRateLimitInfo} from '../../../../lib/rateLimit';
import {Auth} from '../../../../lib/oauth';
import {getAuthenticatedClientApp} from '../../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../../lib/oauthClient';
import {Credentials} from 'google-auth-library';

export async function GET(
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
    if (accessToken) {
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
    } else {
      userId =
        session.googleOAuth?.code ||
        session.googleTokens?.access_token?.substring(0, 20) ||
        'anonymous';
    }
  } catch {
    userId =
      session.googleOAuth?.code ||
      session.googleTokens?.access_token?.substring(0, 20) ||
      'anonymous';
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    const info = getRateLimitInfo(userId);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${new Date(info.resetTime).toISOString()}`,
        resetTime: info.resetTime,
      },
      {status: 429}
    );
  }

  await ensureBucketExists().catch(error => {
    console.warn('Could not ensure bucket exists:', error);
  });

  const authResult = await getAuthenticatedClientApp(session);
  if ('error' in authResult) {
    return authResult.error;
  }

  const sessionUserId = await getSessionUserId(session);
  if (!sessionUserId) {
    return NextResponse.json(
      {
        error: 'Could not identify user. Please log out and log in again.',
      },
      {status: 401}
    );
  }

  const prefix = userPrefix(sessionUserId);

  try {
    const {client: auth} = authResult;
    const slides = google.slides({
      version: 'v1',
      auth: auth as google.auth.OAuth2Client,
    });

    const presentation = await slides.presentations.get({
      presentationId: fileId,
    });

    const presentationData = presentation.data;
    const slidePages = presentationData.slides || [];

    const slideThumbnails = await Promise.all(
      slidePages.map(async page => {
        const objectId = page.objectId || '';

        const cachedUrl = await getCachedSlideUrl(
          fileId,
          objectId,
          'SMALL',
          prefix
        );
        if (cachedUrl) {
          return {
            objectId,
            thumbnailUrl: cachedUrl,
            width: 200,
            height: 112,
            cached: true,
          };
        }

        const currentRateLimit = getRateLimitInfo(userId);
        if (currentRateLimit.remaining <= 0) {
          return {
            objectId,
            thumbnailUrl: null,
            width: null,
            height: null,
            error: 'Rate limited',
          };
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
            cacheSlideThumbnail(
              fileId,
              objectId,
              thumbnailUrl,
              'SMALL',
              prefix
            ).catch(error => {
              console.error(
                `Failed to cache thumbnail for ${objectId}:`,
                error
              );
            });
          }

          return {
            objectId,
            thumbnailUrl,
            width: thumbnail.data.width,
            height: thumbnail.data.height,
            cached: false,
          };
        } catch (error: unknown) {
          const err = error as {code?: number; response?: {status?: number}};
          if (err.code === 429 || err.response?.status === 429) {
            return {
              objectId,
              thumbnailUrl: null,
              width: null,
              height: null,
              error: 'API rate limit exceeded',
            };
          }

          return {
            objectId,
            thumbnailUrl: null,
            width: null,
            height: null,
            error: (error as Error).message,
          };
        }
      })
    );

    return NextResponse.json({
      id: fileId,
      title: presentationData.title,
      slides: slideThumbnails,
      locale: presentationData.locale,
      revisionId: presentationData.revisionId,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching presentation:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch presentation',
        message: (error as Error).message,
      },
      {status: 500}
    );
  }
}
