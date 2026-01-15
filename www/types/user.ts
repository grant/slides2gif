import { GoogleOAuthData } from "lib/oauth";

export interface APIResUser {
  auth?: GoogleOAuthData;
  count?: number;
  isLoggedIn: boolean;
}