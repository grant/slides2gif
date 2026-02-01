import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {getAuthenticatedClient} from 'lib/oauthClient';
import {getCachedPresentationPreviewUrl} from 'lib/storage';

require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../../.env'),
});

export default withIronSessionApiRoute(
  cachedPreviewRoute as any,
  sessionOptions
);

/**
 * GET: Returns cached preview URL for a presentation (GCS only, no Slides API).
 * Used by the client to fill in previews incrementally after the list loads.
 * Returns 404 if not in cache.
 */
async function cachedPreviewRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const fileId = req.query.fileId as string;
  if (!fileId) {
    return res.status(400).json({error: 'Missing fileId parameter'});
  }

  const authResult = await getAuthenticatedClient(req.session, res);
  if (!authResult) {
    return;
  }

  const previewUrl = await getCachedPresentationPreviewUrl(fileId);
  if (!previewUrl) {
    return res.status(404).json({error: 'Preview not in cache'});
  }

  return res.json({previewUrl});
}
