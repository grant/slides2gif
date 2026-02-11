import {NextRequest, NextResponse} from 'next/server';
import {getSession} from '../../../lib/sessionApp';
import {Auth} from '../../../lib/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code') ?? '';
  const scope = searchParams.get('scope') ?? '';

  if (!code) {
    return new NextResponse('ERROR: Missing `code` query param', {
      status: 400,
    });
  }
  if (!scope) {
    return new NextResponse('ERROR: Missing `scope` query param', {
      status: 400,
    });
  }

  const host = request.headers.get('host') ?? '';
  const baseURL =
    host.includes('localhost') || host.includes('127.0.0.1')
      ? `http://${host}`
      : `https://${host}`;

  try {
    Auth.setup(baseURL);
  } catch (error: unknown) {
    console.error('[oauth2callback] Error setting up Auth client:', error);
    return new NextResponse(
      `ERROR: Failed to setup OAuth client: ${(error as Error).message}`,
      {status: 500}
    );
  }

  try {
    const tokens = await Auth.exchangeAuthCodeForTokens(code);
    if (!tokens) {
      console.error('[oauth2callback] Token exchange returned null');
      return new NextResponse(
        'ERROR: Failed to exchange code for tokens. Check server logs for details.',
        {status: 500}
      );
    }

    const session = await getSession();

    session.googleOAuth = {
      code,
      scope,
      authDate: +new Date(),
    };

    session.googleTokens = {
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
    };

    try {
      const userId = await Auth.getUserIDFromCredentials(tokens);
      if (userId) {
        session.googleUserId = userId;
      }
    } catch {
      // ignore
    }

    await session.save();

    return NextResponse.redirect(new URL('/dashboard', baseURL));
  } catch (error: unknown) {
    console.error('[oauth2callback] Error:', error);
    return new NextResponse('ERROR: Token exchange failed', {status: 500});
  }
}
