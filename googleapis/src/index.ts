import {http, Request, Response} from '@google-cloud/functions-framework';
import {Slides} from './slides';
import {uploadFile} from './storage';

interface DownloadSlideImagesReq {
  // The authorized OAuth access token
  accessToken: string;
  // The authorized OAuth refresh token
  refreshToken: string;
  // The Google Slide presentation ID
  presentationId: string;
  // The slides query. i.e. "1,2,3" or "3,5,9"
  slideQuery: string;
}

const LOCAL_DOWNLOAD_FOLDER = 'downloads';

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
 * Then uploads the images into a Cloud Storage bucket for further use.
 *
 * URL parameters:
 * - accessToken: The access token
 * - refreshToken?: The refresh token – will refresh the access token if expired
 * - presentationId: The Google Slide presentation ID
 * - slideQuery?: The slides to get. i.e. "1,2,3" or "3,5,9"
 */
http('downloadSlideImages', async (req: Request, res: Response) => {
  console.log('downloadSlideImages');
  // Create request
  const imageReq: DownloadSlideImagesReq = {
    accessToken: req.query.accessToken as string,
    refreshToken: req.query.refreshToken as string,
    presentationId: req.query.presentationId as string,
    slideQuery: req.query.slideQuery as string,
  };
  if (!imageReq.accessToken) return res.status(400).send('Missing query: `accessToken`');
  if (!imageReq.refreshToken) return res.status(400).send('Missing query: `refreshToken`');
  if (!imageReq.presentationId) {
    return res.status(400).send('Missing query: `presentationId`');
  }

  // Download Google Slide images in downloads
  // i.e. downloads/${presentationId}/000.png
  const slides = new Slides({
    access_token: imageReq.accessToken,
    refresh_token: imageReq.refreshToken,
  });
  const downloadLocation = `${LOCAL_DOWNLOAD_FOLDER}/${imageReq.presentationId}/`;
  const downloadRes = await slides.downloadSlides({
    presentationId: imageReq.presentationId,
    downloadLocation,
    slideQuery: imageReq.slideQuery,
  });
  if (!downloadRes.done) {
    return res.status(400).send('Error downloading slides');
  } else {
    console.log(`Download ${downloadRes.images.length} images.`);
  }

  // Upload slide images to GCS
  console.log('Uploading slides to GCS...');
  console.log('Slides:', imageReq.presentationId, downloadRes.images);

  for (let imagePath of downloadRes.images) {
    // TODO Await all promises
    await uploadFile({
      gcsFilename: imagePath,
      localFilepath: `${LOCAL_DOWNLOAD_FOLDER}/${imageReq.presentationId}/${imagePath}`,
    });
  }
  console.log('Done!');

  const imageRes: DownloadSlideImagesRes = {
    images: downloadRes.images
  };
  return res.send(imageRes);
});
