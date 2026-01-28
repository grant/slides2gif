import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {Credentials} from 'google-auth-library';
import {
  getCachedSlideUrl,
  cacheSlideThumbnail,
  ensureBucketExists,
} from 'lib/storage';
import {getRateLimitInfo} from 'lib/rateLimit';
import {Auth} from 'lib/oauth';
import {getAuthenticatedClient} from 'lib/oauthClient';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../../../../.env'),
});

export default withIronSessionApiRoute(
  incrementalSlidesRoute as any,
  sessionOptions
);

/**
 * Gets a single slide thumbnail incrementally.
 * This endpoint is called multiple times to load slides one by one.
 */
async function incrementalSlidesRoute(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const fileId = req.query.fileId as string;
  const objectId = req.query.objectId as string;
  const index = parseInt(req.query.index as string, 10);

  if (!fileId || !objectId || isNaN(index)) {
    return res.status(400).json({error: 'Missing required parameters'});
  }

  // Get user ID for rate limiting
  let userId = 'anonymous';
  try {
    const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
    const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({error: 'OAuth credentials not configured'});
    }

    const baseURL = req.headers.host?.includes('localhost')
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    Auth.setup(baseURL);

    const accessToken = req.session.googleTokens?.access_token;
    if (!accessToken) {
      return res.status(401).json({error: 'Not authenticated'});
    }
    const fetchedUserId = await Auth.getUserIDFromCredentials({
      access_token: accessToken,
    } as Credentials);
    if (fetchedUserId) {
      userId = fetchedUserId;
    } else {
      userId =
        req.session.googleOAuth?.code ||
        req.session.googleTokens?.access_token?.substring(0, 20) ||
        'anonymous';
    }
  } catch (error) {
    console.warn('Could not get user ID for rate limiting:', error);
    userId =
      req.session.googleOAuth?.code ||
      req.session.googleTokens?.access_token?.substring(0, 20) ||
      'anonymous';
  }

  // Bucket should already exist and be public - no need to check every time

  try {
    // Get authenticated OAuth2 client (handles token refresh if needed)
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    const {client: auth} = authResult;

    // Get Slides API client
    const slides = google.slides({version: 'v1', auth: auth as any});

    // Check cache first (SMALL size for previews)
    const cachedUrl = await getCachedSlideUrl(fileId, objectId, 'SMALL');
    if (cachedUrl) {
      console.log(`Using cached thumbnail for ${fileId}/${objectId}`);
      return res.json({
        objectId,
        thumbnailUrl: cachedUrl,
        width: 200, // SMALL thumbnail size
        height: 112,
        cached: true,
        index,
      });
    }

    // Not in cache, fetch from API (but only if rate limit allows)
    const currentRateLimit = getRateLimitInfo(userId);
    if (currentRateLimit.remaining <= 0) {
      console.warn(
        `Rate limit reached, skipping thumbnail fetch for ${objectId}`
      );
      return res.json({
        objectId,
        thumbnailUrl: null,
        width: null,
        height: null,
        error: 'Rate limited',
        index,
      });
    }

    try {
      const thumbnail = await slides.presentations.pages.getThumbnail({
        presentationId: fileId,
        pageObjectId: objectId,
        'thumbnailProperties.thumbnailSize': 'SMALL', // 200×112
        'thumbnailProperties.mimeType': 'PNG',
      });

      const thumbnailUrl = thumbnail.data.contentUrl;

      // Cache the thumbnail asynchronously (don't wait for it) - SMALL size for previews
      if (thumbnailUrl) {
        cacheSlideThumbnail(fileId, objectId, thumbnailUrl, 'SMALL').catch(
          error => {
            console.error(`Failed to cache thumbnail for ${objectId}:`, error);
          }
        );
      }

      return res.json({
        objectId,
        thumbnailUrl,
        width: thumbnail.data.width,
        height: thumbnail.data.height,
        cached: false,
        index,
      });
    } catch (error: any) {
      console.error(`Error getting thumbnail for page ${objectId}:`, error);

      // If it's a rate limit error, return that info
      if (error.code === 429 || error.response?.status === 429) {
        return res.json({
          objectId,
          thumbnailUrl: null,
          width: null,
          height: null,
          error: 'API rate limit exceeded',
          index,
        });
      }

      return res.json({
        objectId,
        thumbnailUrl: null,
        width: null,
        height: null,
        error: error.message,
        index,
      });
    }
  } catch (error: any) {
    console.error('Error fetching slide:', error);
    return res.status(500).json({
      error: 'Failed to fetch slide',
      message: error.message,
      index,
    });
  }
}
