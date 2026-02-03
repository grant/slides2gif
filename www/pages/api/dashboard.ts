import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';
import {Storage} from '@google-cloud/storage';
import {getAuthenticatedClient} from '../../lib/oauthClient';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

interface DashboardStats {
  gifsCreated: number;
  presentationsLoaded: number;
  totalSlidesProcessed: number;
  gifs: Array<{
    url: string;
    createdAt: number;
    presentationId?: string;
    presentationTitle?: string;
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

    // Get authenticated OAuth2 client (handles token refresh if needed)
    const authResult = await getAuthenticatedClient(session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    // Count presentations and slides from GCS cache (we use drive.file + Picker, so we don't list Drive)
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    const [files] = await bucket.getFiles({
      prefix: 'presentations/',
    });

    // Count unique slides (presentationId + objectId pairs)
    // Path format: presentations/{presentationId}/slides/{objectId}_{size}.png
    // We need to count unique (presentationId, objectId) pairs, not total files
    // since each slide can have multiple sizes cached
    const uniqueSlides = new Set<string>();
    const uniquePresentations = new Set<string>();

    files.forEach(file => {
      // Format: presentations/{presentationId}/slides/{objectId}_{size}.png
      const match = file.name.match(
        /^presentations\/([^/]+)\/slides\/([^_]+)_/
      );
      if (match) {
        const presentationId = match[1];
        const objectId = match[2];
        uniqueSlides.add(`${presentationId}:${objectId}`);
        uniquePresentations.add(presentationId);
      }
    });

    const totalSlidesProcessed = uniqueSlides.size;
    const presentationsLoaded = uniquePresentations.size;

    // Get list of GIFs from GCS (files ending in .gif)
    const [gifFiles] = await bucket.getFiles({
      // GIFs are stored at root level with UUID names
    });

    const gifs = gifFiles
      .filter(file => file.name.endsWith('.gif'))
      .map(file => {
        // Extract timestamp from metadata or use file creation time
        const createdAt = file.metadata.timeCreated
          ? new Date(file.metadata.timeCreated).getTime()
          : Date.now();

        // Extract custom metadata
        const customMetadata = file.metadata.metadata || {};
        const presentationId =
          typeof customMetadata.presentationId === 'string'
            ? customMetadata.presentationId
            : undefined;
        const presentationTitle =
          typeof customMetadata.presentationTitle === 'string'
            ? customMetadata.presentationTitle
            : undefined;

        return {
          url: `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
          createdAt,
          presentationId,
          presentationTitle,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first

    const stats: DashboardStats = {
      gifsCreated: gifs.length,
      presentationsLoaded,
      totalSlidesProcessed,
      gifs: gifs.slice(0, 50), // Limit to 50 most recent
    };

    // Set cache headers to prevent unnecessary refetches
    // Cache for 5 minutes on the client side
    res.setHeader(
      'Cache-Control',
      'private, max-age=300, stale-while-revalidate=600'
    );

    return res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch dashboard stats',
    });
  }
}

export default withIronSessionApiRoute(dashboardHandler as any, sessionOptions);
