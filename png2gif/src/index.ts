import { http } from '@google-cloud/functions-framework';
import { createGif } from './gif';
import {uploadFile} from './storage';
import * as fs from 'fs';

http('createGif', async (req, res) => {
  const filename = 'goo.gif'
  const file = await createGif({ outputGifFilename: filename });

  if (fs.existsSync(filename)) {
    console.log('Created gif! File: ' + filename);

    uploadFile(filename);
  } else {
    console.log('gif doesn\'t exist');
  }
  res.send('hi');
});
