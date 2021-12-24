import { http } from '@google-cloud/functions-framework';
import { Auth } from './auth';

http('oauth2-authorize', async (req, res) => {
  const baseURL = req.protocol + '://' + req.get('host')
  Auth.setup(baseURL);
  
  res.send(Auth.getAuthURL());
});

