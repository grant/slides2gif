import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {Credentials} from 'google-auth-library';
import {cacheSlideThumbnail, makePresentationFilesPublic} from 'lib/storage';
import {checkRateLimit} from 'lib/rateLimit';
import {Auth} from 'lib/oauth';
import {getAuthenticatedClient} from 'lib/oauthClient';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../../.env'),
});

export default withIronSessionApiRoute(refetchRoute as any, sessionOptions);

/**
 * Gradually refetches slide thumbnails with delays to avoid rate limits.
 * This endpoint processes slides one at a time with delays between requests.
 */
async function refetchRoute(req: NextApiRequest, res: NextApiResponse) {
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

    // Get presentation metadata to get slide list
    const presentation = await slides.presentations.get({
      presentationId: fileId,
    });

    const slidePages = presentation.data.slides || [];
    const results: Array<{
      objectId: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process slides one at a time with delays
    const DELAY_MS = 2000; // 2 seconds between requests to avoid rate limits
    const BATCH_SIZE = 1; // Process one at a time

    for (let i = 0; i < slidePages.length; i += BATCH_SIZE) {
      const batch = slidePages.slice(i, i + BATCH_SIZE);

      for (const page of batch) {
        const objectId = page.objectId || '';

        // Check rate limit before each request
        const rateLimit = checkRateLimit(userId);
        if (!rateLimit.allowed) {
          results.push({
            objectId,
            success: false,
            error: 'Rate limit exceeded',
          });
          continue;
        }

        try {
          // Fetch thumbnail from API
          const thumbnail = await slides.presentations.pages.getThumbnail({
            presentationId: fileId,
            pageObjectId: objectId,
            'thumbnailProperties.thumbnailSize': 'SMALL',
            'thumbnailProperties.mimeType': 'PNG',
          });

          const thumbnailUrl = thumbnail.data.contentUrl;

          // Cache the thumbnail - SMALL size for previews
          if (thumbnailUrl) {
            await cacheSlideThumbnail(fileId, objectId, thumbnailUrl, 'SMALL');
            results.push({
              objectId,
              success: true,
            });
          } else {
            results.push({
              objectId,
              success: false,
              error: 'No thumbnail URL returned',
            });
          }
        } catch (error: any) {
          console.error(`Error refetching thumbnail for ${objectId}:`, error);
          results.push({
            objectId,
            success: false,
            error:
              error.code === 429
                ? 'API rate limit exceeded'
                : error.message || 'Unknown error',
          });

          // If we hit rate limit, wait longer before continuing
          if (error.code === 429) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          }
        }

        // Wait between requests (except for the last one)
        if (i + BATCH_SIZE < slidePages.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    // Make all files public after refetching
    const publicResult = await makePresentationFilesPublic(fileId);
    console.log(
      `Made ${publicResult.succeeded} files public, ${publicResult.failed} failed`
    );

    return res.json({
      success: true,
      total: slidePages.length,
      succeeded: successCount,
      failed: failureCount,
      results,
      publicFiles: {
        succeeded: publicResult.succeeded,
        failed: publicResult.failed,
      },
    });
  } catch (error: any) {
    console.error('Error refetching presentation:', error);
    return res.status(500).json({
      error: 'Failed to refetch presentation',
      message: error.message,
    });
  }
}
