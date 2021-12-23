import { createGif } from './gif';
import * as fs from 'fs';

(async () => {
  await createGif({});

  if (fs.existsSync('myanimated.gif')) {
    console.log('Created gif!');
  } else {
    console.log('gif doesn\'t exist');
  }
})();
