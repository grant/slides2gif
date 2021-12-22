import {OAuth2Client} from 'google-auth-library';
import {Credentials} from 'googleapis/node_modules/google-auth-library/build/src/auth/credentials';

// TODO: Remove Client secret
// TODO: Use dynamic redirect URI
const googleOAuthClient = new OAuth2Client({
  clientId:
    '392236462496-qmtv90s0k7ha15li7ej07d146c32vhdj.apps.googleusercontent.com',
  clientSecret: 'PmtzackdT4U1XoucheLq_mZw',
  redirectUri: 'http://localhost:8080/oauth2callback',
});

/**
 * Utility methods for Google OAuth authorization.
 */
export class Auth {
  /**
   * Generates an OAuth URL for the user to start an OAuth flow.
   * @returns {string} An OAuth URL.
   */
  static getAuthURL(): string {
    const SCOPES = [
      'https://www.googleapis.com/auth/userinfo.profile', // User info for storing tokens
      'https://www.googleapis.com/auth/presentations.readonly', // Get Slides
      'https://www.googleapis.com/auth/drive.activity.readonly', // Activity for viewing recent Slides
    ];
    return googleOAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
  }

  /**
   * Gets Refresh/Access tokens from auth code.
   * @param {string} authCode The users authorization code.
   * @returns {Credentials} Google credentials (refresh/access tokens).
   */
  static async exchangeAuthCodeForTokens(
    authCode: string
  ): Promise<Credentials> {
    const tokens = (await googleOAuthClient.getToken(authCode)).tokens;
    return tokens;
  }

  /**
   * Gets Google user info. Uniquely identifies an individual.
   * For Google OAuth, we'll use the `sub` key for identifying a Google login.
   * @see https://developers.google.com/identity/protocols/oauth2/openid-connect
   * @returns {string} The user ID.
   */
  static async getUserIDFromCredentials(credentials: Credentials) {
    const tokenInfo = await googleOAuthClient.getTokenInfo(
      credentials.access_token || ''
    );
    const userID = tokenInfo.sub || '';
    return userID;
  }
}
