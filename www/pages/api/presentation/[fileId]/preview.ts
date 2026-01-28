import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {
  cacheSlideThumbnail,
  makePresentationFilesPublic,
  getCachedSlideUrl,
} from 'lib/storage';
import {checkRateLimit} from 'lib/rateLimit';
import {Auth} from 'lib/oauth';
import {getAuthenticatedClient} from 'lib/oauthClient';
import {Credentials} from 'google-auth-library';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../../../.env'),
});

export default withIronSessionApiRoute(previewRoute as any, sessionOptions);

/**
 * Generates a preview for the first slide of a presentation.
 * This endpoint is designed to be called for presentations that don't have previews yet.
 */
async function previewRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  try {
    // Get authenticated OAuth2 client (handles token refresh if needed)
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    const {client: auth} = authResult;

    // Get Slides API client
    const slides = google.slides({version: 'v1', auth: auth as any});

    // Get presentation metadata to find first slide
    const presentation = await slides.presentations.get({
      presentationId: fileId,
      fields: 'slides(objectId)',
    });

    const firstSlide = presentation.data.slides?.[0];
    if (!firstSlide?.objectId) {
      return res.status(404).json({
        error: 'Presentation has no slides',
      });
    }

    // Check rate limit before request
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimit.resetTime - Date.now(),
      });
    }

    try {
      // Fetch thumbnail from API for first slide only
      const thumbnail = await slides.presentations.pages.getThumbnail({
        presentationId: fileId,
        pageObjectId: firstSlide.objectId,
        'thumbnailProperties.thumbnailSize': 'SMALL',
        'thumbnailProperties.mimeType': 'PNG',
      });

      const thumbnailUrl = thumbnail.data.contentUrl;

      // Cache the thumbnail - SMALL size for previews
      if (thumbnailUrl) {
        await cacheSlideThumbnail(
          fileId,
          firstSlide.objectId,
          thumbnailUrl,
          'SMALL'
        );

        // Make the file public
        await makePresentationFilesPublic(fileId);

        // Return the cached URL
        const cachedUrl = await getCachedSlideUrl(
          fileId,
          firstSlide.objectId,
          'SMALL'
        );

        return res.json({
          success: true,
          previewUrl: cachedUrl,
          presentationId: fileId,
          slideObjectId: firstSlide.objectId,
        });
      } else {
        return res.status(500).json({
          error: 'No thumbnail URL returned from API',
        });
      }
    } catch (error: any) {
      console.error(`Error generating preview for ${fileId}:`, error);
      return res.status(500).json({
        error: 'Failed to generate preview',
        message:
          error.code === 429
            ? 'API rate limit exceeded'
            : error.message || 'Unknown error',
      });
    }
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return res.status(500).json({
      error: 'Failed to generate preview',
      message: error.message,
    });
  }
}
