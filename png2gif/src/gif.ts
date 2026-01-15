const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
const sizeOf = require('image-size');
// eslint-disable-next-line node/no-extraneous-require
const gs = require('glob-stream');
const toArray = require('stream-to-array');
const mergeDeep = require('merge-deep');
import * as fs from 'fs';

/**
 * Request options when creating a GIF.
 */
export interface CreateGIFRequestOptions {
  inputFrameGlobString?: string;
  gifOptions: {
    repeat?: number;
    delay?: number;
    quality?: number;
  };
  outputGifFilename?: string;
  thumbnailSize?: "SMALL" | "MEDIUM" | "LARGE"; // For filtering files by size
}

export interface CreateGIFResponse {
  success: boolean;
  outputGifFilename?: string;
  error?: Error;
}

/**
 * Creates a gif file on the local filesystem given a list of frames.
 * @param {string} inputFrameGlobString Glob string. Must be png? Starts at 000.png
 * @param {number} gifOptions.repeat 0 if we're not repeating the string.
 *
 * Note: To change between jpg to png:
 * `sips -s format png file.jpg --out file.png`
 */
export const createGif = async (
  options: CreateGIFRequestOptions
): Promise<CreateGIFResponse> => {
  const createGifOptions: CreateGIFRequestOptions = mergeDeep(
    {
      inputFrameGlobString: 'downloads/**?.png',
      gifOptions: {
        repeat: 0,
        delay: 1000, // time in ms.
        quality: 1, // default 10. Lower is better quality but slower. Values 1-20.
      },
      outputGifFilename: 'myanimated.gif',
    },
    options
  );

  console.log('CREATING GIF');
  console.log(createGifOptions);
  // Order of operations:
  // - Verify all images are the same size
  // - Create a GIF with images.

  /**
   * Verify the sizes of all images are the same.
   */
  // Get size of all images.
  interface GS {
    cwd: string;
    base: string;
    path: string;
  }
  let arr: Array<GS> = await toArray(
    gs(createGifOptions.inputFrameGlobString)
  );
  
  // Filter files by thumbnail size to ensure we only use the correct size
  // All sizes now use a suffix, so we can filter consistently
  if (createGifOptions.thumbnailSize) {
    const requestedSize = createGifOptions.thumbnailSize;
    const beforeCount = arr.length;
    const expectedSuffix = `_${requestedSize.toLowerCase()}.`;
    
    arr = arr.filter((file) => {
      const fileName = file.path.split("/").pop() || "";
      // Only include files with the specific size suffix
      return fileName.includes(expectedSuffix);
    });
    
    console.log(`Filtered from ${beforeCount} to ${arr.length} ${requestedSize} images`);
  }
  
  // Check if any images were found
  if (arr.length === 0) {
    console.error(`No images found matching: ${createGifOptions.inputFrameGlobString}`);
    return {
      success: false,
      error: new Error(`No images found matching pattern: ${createGifOptions.inputFrameGlobString}`),
    };
  }
  
  console.log(`Found ${arr.length} images to process`);
  
  // TODO: More error handling
  type ImgSize = {height: number; width: number; type: string};
  const imgSizes: ImgSize[] = arr.map(img => {
    return sizeOf(img.path);
  });

  // Throw error if sizes aren't the same.
  const size0 = imgSizes[0];
  if (!size0) {
    return {
      success: false,
      error: new Error('Could not read image dimensions'),
    };
  }
  
  // Log image dimensions for debugging
  console.log('Image dimensions:', {
    count: imgSizes.length,
    width: size0.width,
    height: size0.height,
    allSizes: imgSizes.map(s => `${s.width}x${s.height}`),
  });
  const sameImgSizes = imgSizes.map((size: ImgSize) => {
    return size.width === size0.width && size.height === size0.height;
  });
  for (const isSameSize of sameImgSizes) {
    if (!isSameSize) {
      return {
        success: false,
        error: new Error('Images are not the same size'),
      };
    }
  }

  /**
   * Create a GIF via a PNG stream images.
   */
  const gifSize = size0;
  console.log('Creating GIF with dimensions:', {
    width: gifSize.width,
    height: gifSize.height,
    options: createGifOptions.gifOptions,
  });
  const encoder = new GIFEncoder(gifSize.width, gifSize.height);
  const stream = pngFileStream(createGifOptions.inputFrameGlobString)
    .pipe(encoder.createWriteStream(createGifOptions.gifOptions))
    .pipe(fs.createWriteStream(createGifOptions.outputGifFilename as string));
  try {
    // Wait for stream. (Doesn't return anything useful)
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    return {
      success: true,
      outputGifFilename: createGifOptions.outputGifFilename,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      error: <undefined>e,
    };
  }
};
