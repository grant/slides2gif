import { http } from '@google-cloud/functions-framework';
import { NextApiRequest, NextApiResponse } from 'next';
import { Credentials } from 'google-auth-library';
import { Auth } from '../../lib/oauth';
import {withIronSessionApiRoute} from 'iron-session/next';

import {sessionOptions} from 'lib/session';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});

export default withIronSessionApiRoute(userRoute as any, sessionOptions);

/**
 * Request for OAuth2 authorization.
 * 2 routes
 * - / - Make the auth request
 * - /callback - Get the access / refresh tokens after auth
 */
async function userRoute(req: NextApiRequest, res: NextApiResponse) {
  const url = new URL(req.headers.host + '');
  const baseURL = url.protocol + '//' + url.host;
  Auth.setup(`http://${req.headers.host}`);

  res.redirect(Auth.getAuthURL());

  // if (url.pathname === `/${Auth.OAUTH2_URL_CALLBACK}`) {
  //   if (!req.query || !req.query.code) {
  //     return res.status(400).send('Invalid response code');
  //   }
  //   const code = req.query.code as string;
  //   const tokens: Credentials | null = await Auth.exchangeAuthCodeForTokens(
  //     code
  //   );
  //   if (!tokens) {
  //     return res.send({
  //       error:
  //         'Failed to create access token. This auth token is already used. Try creating a new one.',
  //     });
  //   }

  //   // Send the tokens to the user
  //   return res.send({
  //     ...tokens,
  //     user_id: await Auth.getUserIDFromCredentials(tokens as Credentials),
  //   });
  // }
}
