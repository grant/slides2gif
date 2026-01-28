import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {OAuth2Client, Credentials} from 'google-auth-library';
import {
  getCachedSlideUrl,
  cacheSlideThumbnail,
  ensureBucketExists,
} from 'lib/storage';
import {getRateLimitInfo} from 'lib/rateLimit';
import {Auth} from 'lib/oauth';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../../.env'),
});

export default withIronSessionApiRoute(slidesRoute as any, sessionOptions);

/**
 * Gets slide thumbnails for a presentation.
 * This is called after metadata is loaded for progressive loading.
 */
async function slidesRoute(req: NextApiRequest, res: NextApiResponse) {
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

  // Ensure bucket exists
  await ensureBucketExists().catch(error => {
    console.warn('Could not ensure bucket exists:', error);
  });

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

    // Get presentation to get slide list
    const presentation = await slides.presentations.get({
      presentationId: fileId,
    });

    const slidePages = presentation.data.slides || [];

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
      slides: slideThumbnails,
      rateLimit: {
        remaining: getRateLimitInfo(userId).remaining,
        resetTime: getRateLimitInfo(userId).resetTime,
      },
    });
  } catch (error: any) {
    console.error('Error fetching slides:', error);
    return res.status(500).json({
      error: 'Failed to fetch slides',
      message: error.message,
    });
  }
}
