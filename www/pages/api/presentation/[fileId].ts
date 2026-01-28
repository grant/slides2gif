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
import {checkRateLimit, getRateLimitInfo} from 'lib/rateLimit';
import {Auth} from 'lib/oauth';
import {getAuthenticatedClient} from 'lib/oauthClient';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../.env'),
});

export default withIronSessionApiRoute(
  presentationRoute as any,
  sessionOptions
);

/**
 * Gets presentation metadata and slide thumbnails for a specific presentation.
 */
async function presentationRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  const fileId = req.query.fileId as string;
  if (!fileId) {
    return res.status(400).json({error: 'Missing fileId parameter'});
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

    const fetchedUserId = await Auth.getUserIDFromCredentials({
      access_token: req.session.googleTokens?.access_token || '',
    } as Credentials);
    if (fetchedUserId) {
      userId = fetchedUserId;
    }
  } catch (error) {
    console.warn('Could not get user ID for rate limiting:', error);
    // Fallback to session-based ID if we can't get user ID
    userId =
      req.session.googleOAuth?.code ||
      req.session.googleTokens?.access_token?.substring(0, 20) ||
      'anonymous';
  }

  // Check rate limit
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    const info = getRateLimitInfo(userId);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again after ${new Date(
        info.resetTime
      ).toISOString()}`,
      resetTime: info.resetTime,
    });
  }

  // Ensure bucket exists
  await ensureBucketExists().catch(error => {
    console.warn('Could not ensure bucket exists:', error);
    // Continue anyway, might not have permissions to create bucket
  });

  try {
    // Get authenticated OAuth2 client (handles token refresh if needed)
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    const {client: auth} = authResult;

    // Get Slides API client
    const slides = google.slides({version: 'v1', auth: auth as any});

    // Get presentation metadata
    const presentation = await slides.presentations.get({
      presentationId: fileId,
    });

    const presentationData = presentation.data;
    const slidePages = presentationData.slides || [];

    // Get thumbnails for each slide (with caching)
    const slideThumbnails = await Promise.all(
      slidePages.map(async page => {
        const objectId = page.objectId || '';

        // Check cache first (SMALL size for previews)
        const cachedUrl = await getCachedSlideUrl(fileId, objectId, 'SMALL');
        if (cachedUrl) {
          console.log(`Using cached thumbnail for ${fileId}/${objectId}`);
          return {
            objectId,
            thumbnailUrl: cachedUrl,
            width: 200, // SMALL thumbnail size
            height: 112,
            cached: true,
          };
        }

        // Not in cache, fetch from API (but only if rate limit allows)
        const currentRateLimit = getRateLimitInfo(userId);
        if (currentRateLimit.remaining <= 0) {
          console.warn(
            `Rate limit reached, skipping thumbnail fetch for ${objectId}`
          );
          return {
            objectId,
            thumbnailUrl: null,
            width: null,
            height: null,
            error: 'Rate limited',
          };
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
                console.error(
                  `Failed to cache thumbnail for ${objectId}:`,
                  error
                );
              }
            );
          }

          return {
            objectId,
            thumbnailUrl,
            width: thumbnail.data.width,
            height: thumbnail.data.height,
            cached: false,
          };
        } catch (error: any) {
          console.error(`Error getting thumbnail for page ${objectId}:`, error);

          // If it's a rate limit error, return that info
          if (error.code === 429 || error.response?.status === 429) {
            return {
              objectId,
              thumbnailUrl: null,
              width: null,
              height: null,
              error: 'API rate limit exceeded',
            };
          }

          return {
            objectId,
            thumbnailUrl: null,
            width: null,
            height: null,
            error: error.message,
          };
        }
      })
    );

    return res.json({
      id: fileId,
      title: presentationData.title,
      slides: slideThumbnails,
      locale: presentationData.locale,
      revisionId: presentationData.revisionId,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
    });
  } catch (error: any) {
    console.error('Error fetching presentation:', error);
    return res.status(500).json({
      error: 'Failed to fetch presentation',
      message: error.message,
    });
  }
}
