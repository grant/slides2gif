import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';
import {Storage} from '@google-cloud/storage';
import {google} from 'googleapis';
import {OAuth2Client, Credentials} from 'google-auth-library';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

interface DashboardStats {
  gifsCreated: number;
  presentationsLoaded: number;
  totalSlidesProcessed: number;
  gifs: Array<{
    url: string;
    createdAt: number;
    presentationId?: string;
  }>;
}

async function dashboardHandler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardStats | {error: string}>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    const session = req.session;

    if (!session.googleTokens?.access_token && !session.googleOAuth) {
      return res.status(401).json({error: 'Unauthorized'});
    }

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

    const credentials: Credentials = {
      access_token: session.googleTokens?.access_token || undefined,
      refresh_token: session.googleTokens?.refresh_token || undefined,
      expiry_date: session.googleTokens?.expiry_date || undefined,
    };
    auth.setCredentials(credentials);

    // Refresh token if expired
    if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
      const {credentials: newCredentials} = await auth.refreshAccessToken();
      auth.setCredentials(newCredentials);
    }

    // Get Slides API client
    const slides = google.slides({version: 'v1', auth: auth as any});

    // Get list of presentations
    const drive = google.drive({version: 'v3', auth: auth as any});
    const presentationsResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.presentation'",
      fields: 'files(id, name)',
      pageSize: 1000,
    });
    const presentationsLoaded = presentationsResponse.data.files?.length || 0;

    // Count total slides processed (from cached thumbnails in GCS)
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const [files] = await bucket.getFiles({
      prefix: 'presentations/',
    });

    // Count unique presentations
    const presentationIds = new Set<string>();
    let totalSlidesProcessed = 0;

    files.forEach(file => {
      // Extract presentation ID from path: presentations/{id}/slides/{objectId}_{size}.jpg
      const match = file.name.match(/^presentations\/([^/]+)\/slides\//);
      if (match) {
        presentationIds.add(match[1]);
        totalSlidesProcessed++;
      }
    });

    // Get list of GIFs from GCS (files ending in .gif)
    const [gifFiles] = await bucket.getFiles({
      // GIFs are stored at root level with UUID names
    });

    const gifs = gifFiles
      .filter(file => file.name.endsWith('.gif'))
      .map(file => {
        // Extract timestamp from metadata or use file creation time
        const createdAt =
          file.metadata.timeCreated
            ? new Date(file.metadata.timeCreated).getTime()
            : Date.now();

        return {
          url: `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
          createdAt,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first

    const stats: DashboardStats = {
      gifsCreated: gifs.length,
      presentationsLoaded,
      totalSlidesProcessed,
      gifs: gifs.slice(0, 50), // Limit to 50 most recent
    };

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch dashboard stats',
    });
  }
}

export default withIronSessionApiRoute(dashboardHandler as any, sessionOptions);
