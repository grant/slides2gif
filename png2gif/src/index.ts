import {http, Request, Response} from '@google-cloud/functions-framework';
import {createGif, CreateGIFRequestOptions} from './gif';
import {uploadFile, downloadFiles, getGCSPath, DownloadImagesRequestOptions} from './storage';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const GIF_DOWNLOAD_LOCATION = 'downloads';

/**
 * Creates a gif given a folder of images in GCS.
 * URL parameters:
 * - presentationId: The Google Slide presentation
 * - slideList?: A comma delimited list of slides. i.e. "001,002"
 * - delay?: The GIF delay
 * - quality?: The GIF quality
 * - repeat?: The GIF repeat
 */
http('createGif', async (req: Request, res: Response) => {
  const localFilename = `${uuidv4()}.gif`;
  const tempGCSFilename = localFilename;
  const presentationId = req.query.presentationId;
  if (presentationId === '') {
    res.send({
      result: 'FAILURE. Query param "presentationId" is required.',
    });
  }

  // Download images
  const downloadImagesReq: DownloadImagesRequestOptions = {
    presentationId: req.query.presentationId + '',
    slideList: req.query.slideList + '' || '*',
    downloadLocation: GIF_DOWNLOAD_LOCATION,
  };
  await downloadFiles(downloadImagesReq);

  // Configuration options if defined.
  const gifReq: CreateGIFRequestOptions = {
    inputFrameGlobString: `${GIF_DOWNLOAD_LOCATION}/${presentationId}/**?.png`,
    outputGifFilename: localFilename,
    gifOptions: {},
  };
  if (req.query.delay !== undefined) gifReq.gifOptions.delay = +req.query.delay;
  if (req.query.quality !== undefined) gifReq.gifOptions.quality = +req.query.quality;
  if (req.query.repeat !== undefined) gifReq.gifOptions.repeat = +req.query.repeat;
  await createGif(gifReq);

  // Upload GIF to GCS.
  const gcsPath = getGCSPath(localFilename);
  if (fs.existsSync(localFilename)) {
    console.log('Created gif locally!');

    // Upload then delete file
    await uploadFile(localFilename, tempGCSFilename);
    fs.rmSync(localFilename);

    console.log(`Uploaded: ${gcsPath}`);
    res.send({
      result: 'SUCCESS',
      file: gcsPath,
    });
  } else {
    console.log('error: gif does not exist');
    res.send({
      result: 'FAILURE',
      file: gcsPath,
    });
  }
});
