import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {OAuth2Client, Credentials} from 'google-auth-library';

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

  // Check if user is logged in
  if (!req.session.googleTokens?.access_token) {
    return res.status(401).json({error: 'Not authenticated'});
  }

  try {
    // Setup OAuth2 client
    const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
    const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({error: 'OAuth credentials not configured'});
    }

    const auth = new OAuth2Client({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    // Set credentials from session
    const credentials: Credentials = {
      access_token: req.session.googleTokens.access_token || undefined,
      refresh_token: req.session.googleTokens.refresh_token || undefined,
      expiry_date: req.session.googleTokens.expiry_date || undefined,
    };
    auth.setCredentials(credentials);

    // Refresh token if expired
    if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
      const {credentials: newCredentials} = await auth.refreshAccessToken();
      auth.setCredentials(newCredentials);

      // Update session with new tokens
      req.session.googleTokens = {
        access_token: newCredentials.access_token || undefined,
        refresh_token:
          newCredentials.refresh_token ||
          credentials.refresh_token ||
          undefined,
        expiry_date: newCredentials.expiry_date || undefined,
      };
      await req.session.save();
    }

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
