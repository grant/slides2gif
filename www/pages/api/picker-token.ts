import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';
import {getAuthenticatedClient} from '../../lib/oauthClient';

/**
 * Returns an OAuth access token (and Picker config) for the current user
 * so the client can open the Google Picker. Used with drive.file scope.
 */
async function pickerTokenHandler(
  req: NextApiRequest,
  res: NextApiResponse<
    {accessToken: string; appId: string; developerKey: string} | {error: string}
  >
) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const authResult = await getAuthenticatedClient(req.session, res);
  if (!authResult) {
    return;
  }

  const credentials = authResult.client.credentials;
  const accessToken = credentials.access_token;
  if (!accessToken) {
    return res.status(401).json({error: 'No access token'});
  }

  const appId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER || '';
  const developerKey =
    process.env.GOOGLE_PICKER_DEVELOPER_KEY || process.env.GOOGLE_API_KEY || '';
  if (!appId || !developerKey) {
    console.error(
      '[picker-token] Missing GOOGLE_CLOUD_PROJECT_NUMBER or GOOGLE_PICKER_DEVELOPER_KEY/GOOGLE_API_KEY. See www/.env.example.'
    );
    return res.status(503).json({
      error:
        'Picker not configured. Add GOOGLE_CLOUD_PROJECT_NUMBER and GOOGLE_PICKER_DEVELOPER_KEY to .env.local (see .env.example).',
    });
  }

  return res.status(200).json({
    accessToken,
    appId,
    developerKey,
  });
}

export default withIronSessionApiRoute(
  pickerTokenHandler as any,
  sessionOptions
);
