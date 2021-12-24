import { http } from '@google-cloud/functions-framework';
import { Credentials } from 'google-auth-library';
import { Auth } from './auth';

/**
 * Request for OAuth2 authorization.
 * 2 routes
 * - / - Make the auth request
 * - /callback - Get the access / refresh tokens after auth
 */
http(Auth.OAUTH2_URL, async (req, res) => {
  const baseURL = req.protocol + '://' + req.get('host')
  Auth.setup(baseURL);

  // Auth and callback handlers
  if (req.path === '/') {
    res.send(Auth.getAuthURL());
  } else if (req.path === `/${Auth.OAUTH2_URL_CALLBACK}`) {
    const code = req.query.code as string;
    const tokens: Credentials = await Auth.exchangeAuthCodeForTokens(code);

    // Send the tokens to the user
    res.send({
      ...tokens,
      user_id: await Auth.getUserIDFromCredentials(tokens),
    });
  }
});
