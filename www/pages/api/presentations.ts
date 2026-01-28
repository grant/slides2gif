import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {google} from 'googleapis';
import {getCachedSlideUrl} from 'lib/storage';
import {getAuthenticatedClient} from 'lib/oauthClient';

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

export default withIronSessionApiRoute(
  presentationsRoute as any,
  sessionOptions
);

/**
 * Gets a list of Google Slides presentations from the user's Drive.
 */
async function presentationsRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    // Get authenticated OAuth2 client (handles token refresh if needed)
    const authResult = await getAuthenticatedClient(req.session, res);
    if (!authResult) {
      return; // Error response already sent by getAuthenticatedClient
    }

    const {client: auth} = authResult;

    // Get Drive API client
    const drive = google.drive({version: 'v3', auth: auth as any});

    // List Google Slides presentations
    // MIME type for Google Slides: application/vnd.google-apps.presentation
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.presentation' and trashed=false",
      fields: 'files(id, name, thumbnailLink, modifiedTime, createdTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    const files = response.data.files || [];

    // Get Slides API client to fetch first slide info for each presentation
    const slides = google.slides({version: 'v1', auth: auth as any});

    // Get first slide preview from cache for each presentation
    const presentationsWithPreviews = await Promise.all(
      files.map(async (file: any) => {
        const presentationId = file.id || '';
        let firstSlidePreview: string | null = null;

        try {
          // Get presentation metadata to find first slide
          const presentation = await slides.presentations.get({
            presentationId,
            fields: 'slides(objectId)',
          });

          const firstSlide = presentation.data.slides?.[0];
          if (firstSlide?.objectId) {
            // Check if first slide is cached (SMALL size for preview)
            firstSlidePreview = await getCachedSlideUrl(
              presentationId,
              firstSlide.objectId,
              'SMALL'
            );
          }
        } catch (error) {
          // Silently fail - we'll just use Drive thumbnail or no preview
          console.warn(
            `Could not get first slide preview for ${presentationId}:`,
            error
          );
        }

        return {
          id: presentationId,
          name: file.name || '',
          thumbnailLink: file.thumbnailLink || undefined,
          firstSlidePreview: firstSlidePreview || undefined,
          modifiedTime: file.modifiedTime || undefined,
          createdTime: file.createdTime || undefined,
        };
      })
    );

    return res.json({presentations: presentationsWithPreviews});
  } catch (error: any) {
    console.error('Error fetching presentations:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({
      error: 'Failed to fetch presentations',
      message: error.message,
    });
  }
}
