import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../../../lib/sessionApp';
import {google} from 'googleapis';
import {Credentials} from 'google-auth-library';
import {
  getCachedSlideUrl,
  cacheSlideThumbnail,
  userPrefix,
} from '../../../../../../lib/storage';
import {getRateLimitInfo} from '../../../../../../lib/rateLimit';
import {Auth} from '../../../../../../lib/oauth';
import {getAuthenticatedClientApp} from '../../../../../../lib/oauthClientApp';
import {getSessionUserId} from '../../../../../../lib/oauthClient';

export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{fileId: string}>}
) {
  const {fileId} = await params;
  const objectId = request.nextUrl.searchParams.get('objectId');
  const index = parseInt(request.nextUrl.searchParams.get('index') ?? '0', 10);

  if (!fileId || !objectId || isNaN(index)) {
    return NextResponse.json(
      {error: 'Missing required parameters'},
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
      return NextResponse.json({error: 'Not authenticated'}, {status: 401});
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

    const cachedUrl = await getCachedSlideUrl(
      fileId,
      objectId,
      'SMALL',
      prefix
    );
    if (cachedUrl) {
      return NextResponse.json({
        objectId,
        thumbnailUrl: cachedUrl,
        width: 200,
        height: 112,
        cached: true,
        index,
      });
    }

    const currentRateLimit = getRateLimitInfo(userId);
    if (currentRateLimit.remaining <= 0) {
      return NextResponse.json({
        objectId,
        thumbnailUrl: null,
        width: null,
        height: null,
        error: 'Rate limited',
        index,
      });
    }

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
        console.error(`Failed to cache thumbnail for ${objectId}:`, error);
      });
    }

    return NextResponse.json({
      objectId,
      thumbnailUrl,
      width: thumbnail.data.width,
      height: thumbnail.data.height,
      cached: false,
      index,
    });
  } catch (error: unknown) {
    const err = error as {code?: number; response?: {status?: number}};
    if (err.code === 429 || err.response?.status === 429) {
      return NextResponse.json({
        objectId,
        thumbnailUrl: null,
        width: null,
        height: null,
        error: 'API rate limit exceeded',
        index,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch slide',
        message: (error as Error).message,
        index,
      },
      {status: 500}
    );
  }
}
