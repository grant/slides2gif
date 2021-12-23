import { http } from '@google-cloud/functions-framework';
import { createGif, CreateGIFRequestOptions } from './gif';
import {uploadFile} from './storage';
import * as fs from 'fs';

http('createGif', async (req, res) => {
  const filename = 'goo.gif'
  let gifReq: CreateGIFRequestOptions = {
    outputGifFilename: filename,
    gifOptions: {},
  }
  // Add options if defined.
  // TODO refactor
  if (req.query.delay !== undefined) {
    gifReq.gifOptions = gifReq.gifOptions || {};
    gifReq.gifOptions.delay = +req.query.delay;
  }
  if (req.query.quality !== undefined) {
    gifReq.gifOptions = gifReq.gifOptions || {};
    gifReq.gifOptions.quality = +req.query.quality;
  }
  if (req.query.repeat !== undefined) {
    gifReq.gifOptions = gifReq.gifOptions || {};
    gifReq.gifOptions.repeat = +req.query.repeat;
  }
  await createGif(gifReq);

  if (fs.existsSync(filename)) {
    console.log('Created gif! File: ' + filename);

    uploadFile(filename);
  } else {
    console.log('gif doesn\'t exist');
  }
  res.send('created gif...' + filename);
});
