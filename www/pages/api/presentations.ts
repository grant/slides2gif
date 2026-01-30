import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
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
 * Gets a list of Google Slides presentations from the user's Drive.
 * Returns only Drive metadata for fast initial load. Cached previews are
 * fetched incrementally by the client via GET /api/presentation/[fileId]/cached-preview;
 * missing previews are generated via POST /api/presentation/[fileId]/preview.
 */
async function presentationsRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    const {client: auth} = authResult;
    const drive = google.drive({version: 'v3', auth: auth as any});

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.presentation' and trashed=false",
      fields: 'files(id, name, thumbnailLink, modifiedTime, createdTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    const files = response.data.files || [];
    const presentations = files.map((file: any) => ({
      id: file.id || '',
      name: file.name || '',
      thumbnailLink: file.thumbnailLink || undefined,
      firstSlidePreview: undefined as string | undefined,
      modifiedTime: file.modifiedTime || undefined,
      createdTime: file.createdTime || undefined,
    }));

    return res.json({presentations});
  } catch (error: any) {
    console.error('Error fetching presentations:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({
      error: 'Failed to fetch presentations',
      message: error.message,
    });
  }
}
