// The callback parameter data from Google OAuth.
export interface GoogleOAuthData {
  code: string; // The refresh token code
  scope: string; // The Google API scopes
  authDate: number; // The time of authorization
}
