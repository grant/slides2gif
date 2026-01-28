// This file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import type {IronSessionOptions} from 'iron-session';
import {GoogleOAuthData} from 'lib/oauth';
import {APIResUser} from 'types/user';

export const sessionOptions: IronSessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'iron-session/examples/next.js',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

// This is where we specify the typings of req.session.*
declare module 'iron-session' {
  interface IronSessionData {
    user?: APIResUser;
    isLoggedIn: boolean;
    count: number;
    googleOAuth?: GoogleOAuthData;
    googleTokens?: {
      access_token?: string;
      refresh_token?: string;
      expiry_date?: number;
    };
  }
}
