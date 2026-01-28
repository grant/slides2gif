import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {Auth} from 'lib/oauth';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

export default withIronSessionApiRoute(oauth2callback as any, sessionOptions);

/**
 * The Google OAuth2 callback.
 * Should give the `code` and `scope` query parameters.
 * @see https://developers.google.com/identity/protocols/oauth2/web-server
 */
async function oauth2callback(req: NextApiRequest, res: NextApiResponse) {
  // Get URL parameters
  const code = req.query.code + '';
  const scope = req.query.scope + '';
  if (!code) return res.send('ERROR: Missing `code` query param');
  if (!scope) return res.send('ERROR: Missing `scope` query param');

  // Setup Auth client
  const baseURL = req.headers.host?.includes('localhost')
    ? `http://${req.headers.host}`
    : `https://${req.headers.host}`;
  Auth.setup(baseURL);

  // Exchange code for tokens
  const tokens = await Auth.exchangeAuthCodeForTokens(code);
  if (!tokens) {
    return res.send('ERROR: Failed to exchange code for tokens');
  }

  // Set session Google OAuth
  req.session.googleOAuth = {
    code,
    scope,
    authDate: +new Date(),
  };

  // Store tokens in session
  req.session.googleTokens = {
    access_token: tokens.access_token || undefined,
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
  };

  console.log('SAVED SESSION!!!');
  console.log(req.session.googleOAuth);
  console.log('Tokens stored:', !!req.session.googleTokens?.access_token);

  // Save session
  await req.session.save();

  // Redirect to dashboard page.
  return res.redirect('/dashboard');
}
