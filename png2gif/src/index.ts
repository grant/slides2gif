import {http} from '@google-cloud/functions-framework';
import {createGif, CreateGIFRequestOptions} from './gif';
import {uploadFile} from './storage';
import * as fs from 'fs';

/**
 * Creates a gif.
 * URL parameters:
 * - delay?: The GIF delay
 * - quality?: The GIF quality
 * - repeat?: The GIF repeat
 */
http('createGif', async (req, res) => {
  const filename = 'goo.gif'; // TODO
  const gifReq: CreateGIFRequestOptions = {
    outputGifFilename: filename,
    gifOptions: {},
  };
  // Add options if defined.
  if (req.query.delay !== undefined) gifReq.gifOptions.delay = +req.query.delay;
  if (req.query.quality !== undefined)
    gifReq.gifOptions.quality = +req.query.quality;
  if (req.query.repeat !== undefined)
    gifReq.gifOptions.repeat = +req.query.repeat;
  await createGif(gifReq);

  if (fs.existsSync(filename)) {
    console.log('Created gif! File: ' + filename);

    // Upload then delete file
    await uploadFile(filename, 'online-file.gif');
    fs.rmSync(filename);

    console.log('Uploaded and deleted local file');
  } else {
    console.log('error: gif does not exist');
  }
  res.send('created gif...' + filename);
});
