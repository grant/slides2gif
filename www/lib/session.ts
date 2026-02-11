// This file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import type {SessionOptions} from 'iron-session';
import {GoogleOAuthData} from 'lib/oauth';
import {APIResUser} from 'types/user';

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'slides2gif-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

// This is where we specify the typings of req.session.*
declare module 'iron-session' {
  interface IronSessionData {
    user?: APIResUser;
    isLoggedIn: boolean;
    count: number;
    /** Google OAuth2 "sub" (stable user id). Used for per-user GCS paths. */
    googleUserId?: string;
    googleOAuth?: GoogleOAuthData;
    googleTokens?: {
      access_token?: string;
      refresh_token?: string;
      expiry_date?: number;
    };
  }
}
