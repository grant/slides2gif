import {http, Request, Response} from '@google-cloud/functions-framework';
import {createGif, CreateGIFRequestOptions} from './gif';
import {uploadFile, getGCSPath} from './storage';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a gif.
 * URL parameters:
 * - delay?: The GIF delay
 * - quality?: The GIF quality
 * - repeat?: The GIF repeat
 */
http('createGif', async (req: Request, res: Response) => {
  const localFilename = `${uuidv4()}.gif`;
  const gcsFilename = localFilename;
  const gifReq: CreateGIFRequestOptions = {
    outputGifFilename: localFilename,
    gifOptions: {},
  };
  // Create GIF. Add options if defined.
  if (req.query.delay !== undefined) gifReq.gifOptions.delay = +req.query.delay;
  if (req.query.quality !== undefined)
    gifReq.gifOptions.quality = +req.query.quality;
  if (req.query.repeat !== undefined)
    gifReq.gifOptions.repeat = +req.query.repeat;
  await createGif(gifReq);

  // Upload GIF to GCS.
  const gcsPath = getGCSPath(localFilename);
  if (fs.existsSync(localFilename)) {
    console.log('Created gif locally!');

    // Upload then delete file
    await uploadFile(localFilename, gcsFilename);
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
