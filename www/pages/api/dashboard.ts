import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';
import {Storage} from '@google-cloud/storage';
import {getAuthenticatedClient, getSessionUserId} from '../../lib/oauthClient';
import {userPrefix} from '../../lib/storage';

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

    const authResult = await getAuthenticatedClient(session, res);
    if (!authResult) {
      return;
    }

    // Per-user workspace: only list this user's slides and GIFs
    const userId = await getSessionUserId(session);
    if (!userId) {
      return res.status(401).json({
        error: 'Could not identify user. Please log out and log in again.',
      });
    }

    const prefix = userPrefix(userId);

    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    // List only this user's presentation slides (users/{userId}/presentations/...)
    const [files] = await bucket.getFiles({
      prefix: `${prefix}presentations/`,
    });

    const uniqueSlides = new Set<string>();
    const uniquePresentations = new Set<string>();

    files.forEach(file => {
      // Format: users/{userId}/presentations/{presentationId}/slides/{objectId}_{size}.png
      const match = file.name.match(
        /\/presentations\/([^/]+)\/slides\/([^_]+)_/
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

    // List only this user's GIFs (users/{userId}/*.gif) — strict per-user
    const [gifFiles] = await bucket.getFiles({prefix});

    const gifs = gifFiles
      .filter(
        file => file.name.endsWith('.gif') && file.name.startsWith(prefix)
      )
      .map(file => {
        const createdAt = file.metadata.timeCreated
          ? new Date(String(file.metadata.timeCreated)).getTime()
          : Date.now();
        const customMetadata = (file.metadata.metadata || {}) as Record<
          string,
          string
        >;
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

    console.log('[dashboard] GIFs created:', {
      userId,
      prefix,
      gifsCreated: gifs.length,
      gifNames: gifs.map(g =>
        g.url.replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, '')
      ),
    });

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
