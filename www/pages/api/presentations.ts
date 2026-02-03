import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {getAuthenticatedClient} from 'lib/oauthClient';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

export default withIronSessionApiRoute(
  presentationsRoute as any,
  sessionOptions
);

/**
 * Previously listed Drive presentations; we now use Google Picker (drive.file) only.
 * Returns an empty list so clients that still call this API get a valid response.
 */
async function presentationsRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return;
    }
    return res.json({presentations: []});
  } catch (error: any) {
    console.error('Error in presentations route:', error);
    return res.status(500).json({
      error: 'Failed to fetch presentations',
      message: error.message,
    });
  }
}
