/**
 * OAuth client helpers for App Router Route Handlers.
 * Returns NextResponse for errors instead of mutating res.
 */
import {NextResponse} from 'next/server';
import {OAuth2Client, Credentials} from 'google-auth-library';
import type {IronSessionData} from 'iron-session';

/** Session object from iron-session (has save() in addition to IronSessionData) */
type SessionWithSave = IronSessionData & {save(): Promise<void>};

export async function getAuthenticatedClientApp(
  session: SessionWithSave
): Promise<
  | {client: OAuth2Client; sessionUpdated: boolean}
  | {error: NextResponse}
> {
  if (!session.googleTokens?.access_token) {
    return {
      error: NextResponse.json(
        {error: 'Not authenticated', requiresReauth: true},
        {status: 401}
      ),
    };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const CLIENT_ID = isProduction
    ? process.env.OAUTH_CLIENT_ID_PROD || process.env.OAUTH_CLIENT_ID
    : process.env.OAUTH_CLIENT_ID_LOCAL || process.env.OAUTH_CLIENT_ID;
  const CLIENT_SECRET = isProduction
    ? process.env.OAUTH_CLIENT_SECRET_PROD || process.env.OAUTH_CLIENT_SECRET
    : process.env.OAUTH_CLIENT_SECRET_LOCAL || process.env.OAUTH_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      error: NextResponse.json(
        {
          error: `OAuth credentials not configured for ${
            isProduction ? 'production' : 'development'
          } environment`,
        },
        {status: 500}
      ),
    };
  }

  const auth = new OAuth2Client({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });

  const credentials: Credentials = {
    access_token: session.googleTokens.access_token || undefined,
    refresh_token: session.googleTokens.refresh_token || undefined,
    expiry_date: session.googleTokens.expiry_date || undefined,
  };
  auth.setCredentials(credentials);

  const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
  const isExpired =
    credentials.expiry_date &&
    credentials.expiry_date <= Date.now() + EXPIRY_BUFFER_MS;

  if (isExpired) {
    if (!credentials.refresh_token) {
      return {
        error: NextResponse.json(
          {
            error: 'Session expired. Please log in again.',
            requiresReauth: true,
          },
          {status: 401}
        ),
      };
    }

    try {
      const {credentials: newCredentials} = await auth.refreshAccessToken();
      auth.setCredentials(newCredentials);

      session.googleTokens = {
        access_token: newCredentials.access_token || undefined,
        refresh_token:
          newCredentials.refresh_token ||
          credentials.refresh_token ||
          undefined,
        expiry_date: newCredentials.expiry_date || undefined,
      };

      if (!session.googleUserId && newCredentials.access_token) {
        try {
          const info = await auth.getTokenInfo(
            newCredentials.access_token as string
          );
          if (info?.sub) session.googleUserId = info.sub;
        } catch {
          // ignore
        }
      }

      await session.save();

      return {
        client: auth,
        sessionUpdated: true,
      };
    } catch (refreshError: unknown) {
      console.error(
        '[getAuthenticatedClient] Error refreshing access token:',
        refreshError
      );
      return {
        error: NextResponse.json(
          {
            error: 'Failed to refresh session. Please log in again.',
            requiresReauth: true,
          },
          {status: 401}
        ),
      };
    }
  }

  return {
    client: auth,
    sessionUpdated: false,
  };
}
