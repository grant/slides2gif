import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../../lib/sessionApp';
import {google} from 'googleapis';
import {Credentials} from 'google-auth-library';
import {
  cacheSlideThumbnail,
  makePresentationFilesPublic,
  getCachedSlideUrl,
  savePresentationMeta,
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

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: rateLimit.resetTime - Date.now(),
      },
      {status: 429}
    );
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
      fields: 'slides(objectId)',
    });

    const firstSlide = presentation.data.slides?.[0];
    if (!firstSlide?.objectId) {
      return NextResponse.json(
        {error: 'Presentation has no slides'},
        {status: 404}
      );
    }

    const thumbnail = await slides.presentations.pages.getThumbnail({
      presentationId: fileId,
      pageObjectId: firstSlide.objectId,
      'thumbnailProperties.thumbnailSize': 'SMALL',
      'thumbnailProperties.mimeType': 'PNG',
    });

    const thumbnailUrl = thumbnail.data.contentUrl;

    if (!thumbnailUrl) {
      return NextResponse.json(
        {error: 'No thumbnail URL returned from API'},
        {status: 500}
      );
    }

    await cacheSlideThumbnail(
      fileId,
      firstSlide.objectId,
      thumbnailUrl,
      'SMALL',
      prefix
    );

    await savePresentationMeta(fileId, firstSlide.objectId, prefix);
    await makePresentationFilesPublic(fileId, prefix);

    const cachedUrl = await getCachedSlideUrl(
      fileId,
      firstSlide.objectId,
      'SMALL',
      prefix
    );

    return NextResponse.json({
      success: true,
      previewUrl: cachedUrl,
      presentationId: fileId,
      slideObjectId: firstSlide.objectId,
    });
  } catch (error: unknown) {
    const err = error as {code?: number; message?: string};
    console.error(`Error generating preview for ${fileId}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to generate preview',
        message:
          err.code === 429 ? 'API rate limit exceeded' : err.message || 'Unknown error',
      },
      {status: 500}
    );
  }
}
