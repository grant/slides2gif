import {http} from '@google-cloud/functions-framework';
import {Credentials} from 'google-auth-library';
import {Auth} from './auth';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});

/**
 * Request for OAuth2 authorization.
 * 2 routes
 * - / - Make the auth request
 * - /callback - Get the access / refresh tokens after auth
 */
http(Auth.OAUTH2_URL, async (req, res) => {
  const baseURL = req.protocol + '://' + req.get('host');
  Auth.setup(baseURL);

  // Auth and callback handlers
  if (req.path === '/') {
    return res.send({
      url: Auth.getAuthURL(),
    });
  } else if (req.path === `/${Auth.OAUTH2_URL_CALLBACK}`) {
    if (!req.query || !req.query.code) {
      return res.status(400).send('Invalid response code');
    }
    const code = req.query.code as string;
    const tokens: Credentials | null = await Auth.exchangeAuthCodeForTokens(
      code
    );
    if (!tokens) {
      return res.send({
        error:
          'Failed to create access token. This auth token is already used. Try creating a new one.',
      });
    }

    // Send the tokens to the user
    return res.send({
      ...tokens,
      user_id: await Auth.getUserIDFromCredentials(tokens as Credentials),
    });
  } else {
    return res.sendStatus(404).send('Bad URL');
  }
});
