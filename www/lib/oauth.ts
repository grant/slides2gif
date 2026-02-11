// The callback parameter data from Google OAuth.
export interface GoogleOAuthData {
  code: string; // The refresh token code
  scope: string; // The Google API scopes
  authDate: number; // The time of authorization
}

import {OAuth2Client, Credentials} from 'google-auth-library';

/**
 * Utility methods for Google OAuth authorization.
 */
export class Auth {
  static OAUTH2_URL = 'api/oauth2';
  static OAUTH2_URL_CALLBACK = 'api/oauth2callback';
  static #googleOAuthClient: OAuth2Client;

  public static setup(baseurl: string) {
    // Determine if we're in development or production
    const isLocalhost =
      baseurl.includes('localhost') || baseurl.includes('127.0.0.1');

    // Use environment-specific credentials if available, otherwise fall back to generic ones
    const CLIENT_ID = isLocalhost
      ? process.env.OAUTH_CLIENT_ID_LOCAL || process.env.OAUTH_CLIENT_ID
      : process.env.OAUTH_CLIENT_ID_PROD || process.env.OAUTH_CLIENT_ID;

    const CLIENT_SECRET = isLocalhost
      ? process.env.OAUTH_CLIENT_SECRET_LOCAL || process.env.OAUTH_CLIENT_SECRET
      : process.env.OAUTH_CLIENT_SECRET_PROD || process.env.OAUTH_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error(
        `OAuth credentials missing for ${
          isLocalhost ? 'local' : 'production'
        } environment! ` +
          `Required: ${
            isLocalhost ? 'OAUTH_CLIENT_ID_LOCAL' : 'OAUTH_CLIENT_ID_PROD'
          } and ` +
          `${
            isLocalhost
              ? 'OAUTH_CLIENT_SECRET_LOCAL'
              : 'OAUTH_CLIENT_SECRET_PROD'
          }`
      );
    }

    Auth.#googleOAuthClient = new OAuth2Client({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: `${baseurl}/${this.OAUTH2_URL_CALLBACK}`,
    });
  }

  /**
   * Gets the Google OAuth client
   * @param baseurl The base URL, i.e. "http://localhost:8080"
   * @returns the Google OAuth client
   */
  private static getOAuthClient(): OAuth2Client {
    return this.#googleOAuthClient;
  }

  /**
   * Generates an OAuth URL for the user to start an OAuth flow.
   * @returns {string} An OAuth URL.
   */
  public static getAuthURL(): string {
    const SCOPES = [
      'https://www.googleapis.com/auth/userinfo.profile', // User info for storing tokens
      'https://www.googleapis.com/auth/drive.file', // Access only files user opens/selects via Picker (covers Slides for selected file)
    ];
    return this.getOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent to always get a refresh token
      scope: SCOPES,
    });
  }

  /**
   * Gets Refresh/Access tokens from auth code.
   * @param {string} authCode The users authorization code.
   * @returns {Credentials} Google credentials (refresh/access tokens).
   */
  public static async exchangeAuthCodeForTokens(
    authCode: string
  ): Promise<Credentials | null> {
    try {
      const tokens = (await this.getOAuthClient().getToken(authCode)).tokens;
      return tokens;
    } catch (e: any) {
      console.error(
        '[Auth.exchangeAuthCodeForTokens] Error exchanging code for tokens:',
        e
      );
      console.error(
        '[Auth.exchangeAuthCodeForTokens] Error message:',
        e?.message
      );
      console.error('[Auth.exchangeAuthCodeForTokens] Error code:', e?.code);
      console.error(
        '[Auth.exchangeAuthCodeForTokens] Error response:',
        e?.response?.data
      );
      return null;
    }
  }

  /**
   * Gets Google user info. Uniquely identifies an individual.
   * For Google OAuth, we'll use the `sub` key for identifying a Google login.
   * @see https://developers.google.com/identity/protocols/oauth2/openid-connect
   * @returns {string} The user ID.
   */
  public static async getUserIDFromCredentials(credentials: Credentials) {
    const tokenInfo = await this.getOAuthClient().getTokenInfo(
      credentials.access_token || ''
    );
    const userID = tokenInfo.sub;
    return userID;
  }
}
