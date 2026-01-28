import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {getAuthenticatedClient} from 'lib/oauthClient';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../../.env'),
});

export default withIronSessionApiRoute(metadataRoute as any, sessionOptions);

/**
 * Gets only the presentation metadata (no slides).
 * This is faster and allows progressive loading.
 */
async function metadataRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const fileId = req.query.fileId as string;
  if (!fileId) {
    return res.status(400).json({error: 'Missing fileId parameter'});
  }

  try {
    // Get authenticated OAuth2 client (handles token refresh if needed)
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    const {client: auth} = authResult;

    // Get Slides API client
    const slides = google.slides({version: 'v1', auth: auth as any});

    // Get presentation metadata with slide objectIds
    const presentation = await slides.presentations.get({
      presentationId: fileId,
      fields: 'presentationId,title,locale,revisionId,slides(objectId)',
    });

    const presentationData = presentation.data;
    const slideCount = presentationData.slides?.length || 0;
    const slideObjectIds =
      presentationData.slides?.map(slide => slide.objectId || '') || [];

    return res.json({
      id: fileId,
      title: presentationData.title,
      locale: presentationData.locale,
      revisionId: presentationData.revisionId,
      slideCount,
      slideObjectIds,
    });
  } catch (error: any) {
    console.error('Error fetching presentation metadata:', error);
    return res.status(500).json({
      error: 'Failed to fetch presentation metadata',
      message: error.message,
    });
  }
}
