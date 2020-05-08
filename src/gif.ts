const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
import * as fs from 'fs';

interface GIFOptions {
  repeat: number;
  delay: number;
  quality: number;
}

/**
 * Creates a gif given a list of frames,
 */
export const createGif = async ({
  inputFrameGlobString = 'downloads/**?.png',
  // inputFrameGlobString = 'test/frame**?.png',
  gifOptions = {repeat: 0, delay: 500, quality: 10},
  outputGifFilename = 'myanimated.gif',
}: {
  inputFrameGlobString?: string;
  gifOptions?: GIFOptions;
  outputGifFilename?: string;
}) => {
  // TODO SIZE
  // const encoder = new GIFEncoder(854, 480);
  const encoder = new GIFEncoder(800, 450);

  const stream = pngFileStream(inputFrameGlobString)
    .pipe(encoder.createWriteStream(gifOptions))
    .pipe(fs.createWriteStream(outputGifFilename));
  const v = await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return v;
};
