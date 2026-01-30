import {OAuth2Client, Credentials} from 'google-auth-library';
import {IronSessionData} from 'iron-session';
import {NextApiResponse} from 'next';

/** Session object from API route (has save() in addition to IronSessionData) */
type SessionWithSave = IronSessionData & {save(): Promise<void>};

/**
 * Result of getting an authenticated OAuth2 client
 */
export interface AuthenticatedClientResult {
  client: OAuth2Client;
  sessionUpdated: boolean;
}

/**
 * Error response for authentication failures
 */
export interface AuthErrorResponse {
  error: string;
  requiresReauth?: boolean;
}

/**
 * Gets an authenticated OAuth2Client from the session, refreshing tokens if needed.
 * This follows best practices for token management:
 * - Checks if token is expired before attempting refresh
 * - Validates refresh token exists before refresh
 * - Updates session after successful refresh
 * - Handles errors gracefully
 *
 * @param session - The iron-session session object
 * @param res - Next.js API response object (for error responses)
 * @returns Object with authenticated client and whether session was updated, or null if auth failed
 */
export async function getAuthenticatedClient(
  session: SessionWithSave,
  res: NextApiResponse
): Promise<AuthenticatedClientResult | null> {
  // Check if user has tokens
  if (!session.googleTokens?.access_token) {
    res.status(401).json({
      error: 'Not authenticated',
      requiresReauth: true,
    });
    return null;
  }

  // Setup OAuth2 client
  // For token refresh, we need to use the same client that issued the original token
  // Determine environment: prefer PROD in production, LOCAL in development
  const isProduction = process.env.NODE_ENV === 'production';
  const CLIENT_ID = isProduction
    ? process.env.OAUTH_CLIENT_ID_PROD || process.env.OAUTH_CLIENT_ID
    : process.env.OAUTH_CLIENT_ID_LOCAL || process.env.OAUTH_CLIENT_ID;
  const CLIENT_SECRET = isProduction
    ? process.env.OAUTH_CLIENT_SECRET_PROD || process.env.OAUTH_CLIENT_SECRET
    : process.env.OAUTH_CLIENT_SECRET_LOCAL || process.env.OAUTH_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).json({
      error: `OAuth credentials not configured for ${
        isProduction ? 'production' : 'development'
      } environment`,
    });
    return null;
  }

  const auth = new OAuth2Client({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });

  // Set credentials from session
  const credentials: Credentials = {
    access_token: session.googleTokens.access_token || undefined,
    refresh_token: session.googleTokens.refresh_token || undefined,
    expiry_date: session.googleTokens.expiry_date || undefined,
  };
  auth.setCredentials(credentials);

  // Check if token needs refresh
  // Add a 5-minute buffer to refresh before actual expiry
  const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
  const isExpired =
    credentials.expiry_date &&
    credentials.expiry_date <= Date.now() + EXPIRY_BUFFER_MS;

  if (isExpired) {
    // Validate refresh token exists
    if (!credentials.refresh_token) {
      console.error(
        '[getAuthenticatedClient] Access token expired but no refresh token available'
      );
      console.error('[getAuthenticatedClient] Session googleTokens:', {
        hasAccessToken: !!session.googleTokens?.access_token,
        hasRefreshToken: !!session.googleTokens?.refresh_token,
        hasExpiryDate: !!session.googleTokens?.expiry_date,
      });
      res.status(401).json({
        error: 'Session expired. Please log in again.',
        requiresReauth: true,
      });
      return null;
    }

    try {
      const {credentials: newCredentials} = await auth.refreshAccessToken();
      auth.setCredentials(newCredentials);

      // Update session with new tokens
      // Preserve refresh_token if not provided in response (it's long-lived)
      session.googleTokens = {
        access_token: newCredentials.access_token || undefined,
        refresh_token:
          newCredentials.refresh_token ||
          credentials.refresh_token ||
          undefined,
        expiry_date: newCredentials.expiry_date || undefined,
      };
      await session.save();

      return {
        client: auth,
        sessionUpdated: true,
      };
    } catch (refreshError: any) {
      console.error(
        '[getAuthenticatedClient] Error refreshing access token:',
        refreshError
      );
      console.error('[getAuthenticatedClient] Error details:', {
        message: refreshError?.message,
        code: refreshError?.code,
        response: refreshError?.response?.data,
      });
      res.status(401).json({
        error: 'Failed to refresh session. Please log in again.',
        requiresReauth: true,
      });
      return null;
    }
  }

  // Token is still valid
  return {
    client: auth,
    sessionUpdated: false,
  };
}
