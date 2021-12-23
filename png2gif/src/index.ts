import {http} from '@google-cloud/functions-framework';
import { createGif } from './gif';
import * as fs from 'fs';

http('createGif', async (req, res) => {
  await createGif({});

  if (fs.existsSync('myanimated.gif')) {
    console.log('Created gif!');
  } else {
    console.log('gif doesn\'t exist');
  }
  res.send('hi');
});
