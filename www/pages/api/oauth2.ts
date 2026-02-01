import {NextApiRequest, NextApiResponse} from 'next';
import {Auth} from '../../lib/oauth';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';

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
  const host = req.headers.host ?? '';
  const baseURL =
    host.includes('localhost') || host.includes('127.0.0.1')
      ? `http://${host}`
      : `https://${host}`;
  Auth.setup(baseURL);
  res.redirect(Auth.getAuthURL());
}
