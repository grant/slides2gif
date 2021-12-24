import { http } from '@google-cloud/functions-framework';
import { Auth } from './auth';

http('oauth2-authorize', async (req, res) => {
  console.log(req.get('host'));
  res.send(Auth.getAuthURL());
});

