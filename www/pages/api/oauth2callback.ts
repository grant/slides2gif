// import {ParsedUrlQuery} from 'querystring';
// import Head from 'next/head';
import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
// import {GoogleOAuthData} from 'lib/oauth';

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

  // Set session Google OAuth
  req.session.googleOAuth = {
    code,
    scope,
    authDate: +new Date(),
  };

  console.log('SAVED SESSION!!!');
  console.log(req.session.googleOAuth);

  // Save session
  await req.session.save();

  // Redirect to create page.
  return res.redirect('/create');
}
