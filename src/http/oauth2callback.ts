import {Credentials} from 'googleapis/node_modules/google-auth-library/build/src/auth/credentials';
import {Response} from 'express';
import {exchangeAuthCodeForTokens} from '../googleapis/auth';
import {getUserInfo} from '../googleapis/auth';
import DB from '../db/firestore';
const ejs = require('ejs');
const path = require('path');

// Extend Express to include session
import * as Express from 'express';
interface Request extends Express.Request {
  session: any;
}

/**
 * OAuth Callback. URL looks like this:
 *   http://localhost:8080/oauth2callback?
 *   code=4/0AHFg9gqDJRbejTGs9ZjISYNrdwEANKegDECmFeg37YeiiSyPLEl0yd7LdW8UJV4tuXcctGk-S_9G33LcefbvDw
 *   scope=https://www.googleapis.com/auth/presentations.readonly%20https://www.googleapis.com/auth/drive.activity.readonly
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
export default async (req: Request, res: Response) => {
  /**
   * Get credentials. Example:
   * {
   *   access_token: 'ya29.a0weH6SMBl2PrpKBGJ3oitvmSI4bPO0KRUqQ719rP4GYbvo6LtXlB99H7F2g_4CfcgWZVzjJt5An9NNs_kCU-VWjXc7VIFcyV_ZUFj6GiDsvKwV3aeGR-pjnZPJRQC8TTGj2nX7259bPXn_TE9IrtuyJc-4QxHRooO7LE',
   *   refresh_token: '1//06lPfjUmsBwuaCgYIARAAGAYSNwF-L9IrVKdJ-7aF-2G9vMsHYc3fMuTXFwiRzC5_jAW4fFZfRvODYsBv7nYhIHOdeg7wTIuJym8',
   *   scope: 'https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/drive.activity.readonly',
   *   token_type: 'Bearer',
   *   expiry_date: 1590858402413
   * }
   */
  const authTokens: Credentials = await exchangeAuthCodeForTokens(
    req.query.code + ''
  );

  /**
   * Get the Google User ID used to store credentials under.
   */
  const userinfo = await getUserInfo(authTokens);
  console.log(userinfo);

  /**
   * Store user info in Firestore.
   */
  await DB.saveUserInfo(userinfo);

  /**
   * Save the user id
   */
  req.session.userid = userinfo.userID;

  // Redirect to web.
  res.redirect('/web');
};
