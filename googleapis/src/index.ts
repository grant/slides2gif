import {http, Request, Response} from '@google-cloud/functions-framework';
import {Slides} from './slides';

interface DownloadSlideImagesReq {
  // The authorized OAuth token
  token: string;
  // The Google Slide presentation ID
  presentationId: string;
  // The slides query. i.e. "1,2,3" or "3,5,9"
  slideQuery: string;
}

// TODO
interface DownloadSlideImagesRes {}

// Load env vars (.env)
require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('Client ID / Secret missing!!!');
}

/**
 * Downloads Google Slide images from a presentation.
 * Puts the slides in a Cloud Storage bucket for further use.
 *
 * URL parameters:
 * - token: The access token
 * - presentationId: The Google Slide presentation ID
 * - slideQuery?: The slides to get. i.e. "1,2,3" or "3,5,9"
 */
http('downloadSlideImages', async (req: Request, res: Response) => {
  console.log('downloadSlideImages');
  // Create request
  const imageReq: DownloadSlideImagesReq = {
    token: req.query.token as string,
    presentationId: req.query.presentationId as string,
    slideQuery: req.query.slideQuery as string,
  };
  if (!imageReq.token) return res.status(400).send('Missing query: `token`');
  if (!imageReq.presentationId)
    return res.status(400).send('Missing query: `presentationId`');

  // Execute request
  // Download images in downloads
  const slides = new Slides({access_token: imageReq.token});
  const downloadLocation = `downloads/${imageReq.presentationId}/`;
  const downloadRes = await slides.downloadSlides({
    presentationId: imageReq.presentationId,
    downloadLocation,
    slideQuery: imageReq.slideQuery,
  });

  // Upload slides to GCS
  // For all slides in downloads, upload to GCS
  if (!downloadRes.done)
    return res.status(400).send('Error downloading slides');

  const imageRes: DownloadSlideImagesRes = {
    foo: 'bar',
  };
  return res.send(imageRes);
});
