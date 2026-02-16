import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../../lib/sessionApp';
import {getSessionUserId} from '../../../../lib/oauthClient';
import {userPrefix} from '../../../../lib/storage';

const ALLOWED_BUCKET = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';
const ALLOWED_PREFIX = `https://storage.googleapis.com/${ALLOWED_BUCKET}/`;

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session.googleTokens?.access_token && !session.googleOAuth) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const userId = await getSessionUserId(session);
  if (!userId) {
    return NextResponse.json(
      {
        error: 'Could not identify user. Please log out and log in again.',
      },
      {status: 401}
    );
  }

  const url = request.nextUrl.searchParams.get('url');
  if (typeof url !== 'string' || !url.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json(
      {error: 'Invalid or disallowed URL'},
      {status: 400}
    );
  }

  const path = url.slice(ALLOWED_PREFIX.length);
  const prefix = userPrefix(userId);
  if (!path.startsWith(prefix)) {
    return NextResponse.json(
      {error: 'You can only download your own GIFs'},
      {status: 403}
    );
  }

  try {
    const response = await fetch(url, {method: 'GET'});
    if (!response.ok) {
      return NextResponse.json(
        {error: 'Failed to fetch GIF'},
        {status: response.status}
      );
    }
    const contentType = response.headers.get('content-type') || 'image/gif';
    const buffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="slides.gif"',
        'Cache-Control': 'private, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('[gifs/download] Error proxying GIF:', error);
    return NextResponse.json({error: 'Failed to download GIF'}, {status: 500});
  }
}
