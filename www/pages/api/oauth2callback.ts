import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {Auth} from 'lib/oauth';

// Load env vars (.env.local)
// Note: Next.js automatically loads .env.local, but we load it here for API routes
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env.local'),
});

// Also check if env vars are loaded
console.log('[oauth2callback] Environment check:');
console.log(
  '[oauth2callback] OAUTH_CLIENT_ID:',
  process.env.OAUTH_CLIENT_ID ? 'SET' : 'MISSING'
);
console.log(
  '[oauth2callback] OAUTH_CLIENT_SECRET:',
  process.env.OAUTH_CLIENT_SECRET ? 'SET' : 'MISSING'
);

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

  console.log('[oauth2callback] Setting up Auth client with baseURL:', baseURL);
  console.log(
    '[oauth2callback] Expected redirect URI:',
    `${baseURL}/api/oauth2callback`
  );

  try {
    Auth.setup(baseURL);
  } catch (error: any) {
    console.error('[oauth2callback] Error setting up Auth client:', error);
    return res.send(`ERROR: Failed to setup OAuth client: ${error.message}`);
  }

  // Exchange code for tokens
  console.log('[oauth2callback] Exchanging authorization code for tokens...');
  const tokens = await Auth.exchangeAuthCodeForTokens(code);
  if (!tokens) {
    console.error('[oauth2callback] Token exchange returned null');
    return res.send(
      'ERROR: Failed to exchange code for tokens. Check server logs for details.'
    );
  }

  // Log token details (without exposing sensitive data)
  console.log('[oauth2callback] Token exchange successful');
  console.log('[oauth2callback] Has access_token:', !!tokens.access_token);
  console.log('[oauth2callback] Has refresh_token:', !!tokens.refresh_token);
  console.log('[oauth2callback] Has expiry_date:', !!tokens.expiry_date);
  if (tokens.expiry_date) {
    const expiryDate = new Date(tokens.expiry_date);
    console.log('[oauth2callback] Token expires at:', expiryDate.toISOString());
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

  // Store stable Google user ID for per-user storage isolation
  try {
    const userId = await Auth.getUserIDFromCredentials(tokens);
    if (userId) {
      req.session.googleUserId = userId;
      console.log(
        '[oauth2callback] Stored googleUserId for per-user workspace'
      );
    }
  } catch (e) {
    console.warn('[oauth2callback] Could not resolve googleUserId:', e);
  }

  console.log('[oauth2callback] Session tokens stored');
  console.log(
    '[oauth2callback] Session has refresh_token:',
    !!req.session.googleTokens?.refresh_token
  );

  // Save session
  await req.session.save();
  console.log('[oauth2callback] Session saved successfully');

  // Redirect to dashboard page.
  return res.redirect('/dashboard');
}
