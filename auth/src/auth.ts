import { OAuth2Client, Credentials } from 'google-auth-library';

/**
 * Utility methods for Google OAuth authorization.
 */
export class Auth {
  static OAUTH2_URL: string = 'oauth2';
  static OAUTH2_URL_CALLBACK: string = 'oauth2callback';
  static #googleOAuthClient: OAuth2Client;

  public static setup(baseurl: string) {
    // TODO: Remove Client secret
    Auth.#googleOAuthClient = new OAuth2Client({
      clientId:
        '392236462496-qmtv90s0k7ha15li7ej07d146c32vhdj.apps.googleusercontent.com',
      clientSecret: 'PmtzackdT4U1XoucheLq_mZw',
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
      'https://www.googleapis.com/auth/presentations.readonly', // Get Slides
      'https://www.googleapis.com/auth/drive.activity.readonly', // Activity for viewing recent Slides
    ];
    return this.getOAuthClient().generateAuthUrl({
      access_type: 'offline',
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
  ): Promise<Credentials> {
    const tokens = (await this.getOAuthClient().getToken(authCode)).tokens;
    return tokens;
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
