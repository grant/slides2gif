const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
const sizeOf = require('image-size');
// eslint-disable-next-line node/no-extraneous-require
const gs = require('glob-stream');
const toArray = require('stream-to-array');
const mergeDeep = require('merge-deep');
import * as fs from 'fs';
import {createCanvas, loadImage} from 'canvas';
import * as path from 'path';
import * as os from 'os';
import {v4 as uuidv4} from 'uuid';

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
  thumbnailSize?: 'SMALL' | 'MEDIUM' | 'LARGE'; // For filtering files by size
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
  let arr: Array<GS> = await toArray(gs(createGifOptions.inputFrameGlobString));

  // Filter files by thumbnail size to ensure we only use the correct size
  // All sizes now use a suffix, so we can filter consistently
  if (createGifOptions.thumbnailSize) {
    const requestedSize = createGifOptions.thumbnailSize;
    const beforeCount = arr.length;
    const expectedSuffix = `_${requestedSize.toLowerCase()}.`;

    arr = arr.filter(file => {
      const fileName = file.path.split('/').pop() || '';
      // Only include files with the specific size suffix
      return fileName.includes(expectedSuffix);
    });

    console.log(
      `Filtered from ${beforeCount} to ${arr.length} ${requestedSize} images`
    );
  }

  // Check if any images were found
  if (arr.length === 0) {
    console.error(
      `No images found matching: ${createGifOptions.inputFrameGlobString}`
    );
    return {
      success: false,
      error: new Error(
        `No images found matching pattern: ${createGifOptions.inputFrameGlobString}`
      ),
    };
  }

  console.log(`Found ${arr.length} images to process`);

  // Log file details for debugging
  console.log('Files to process:');
  arr.forEach((file, index) => {
    const ext = path.extname(file.path).toLowerCase();
    const stats = fs.statSync(file.path);
    console.log(
      `  ${index + 1}. ${file.path} (ext: ${ext}, size: ${stats.size} bytes)`
    );
  });

  // Google Slides API returns PNG format - all files should be PNG
  // Check actual file format by reading first few bytes (magic numbers)
  const fileFormats: string[] = [];
  for (const file of arr) {
    const fullBuffer = fs.readFileSync(file.path);
    const buffer = fullBuffer.slice(0, 8);
    let format = 'unknown';
    // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      format = 'PNG';
    }
    // JPEG magic number: FF D8 FF
    else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      format = 'JPEG';
    }
    fileFormats.push(format);
    console.log(
      `  File format detected: ${path.basename(file.path)} -> ${format}`
    );
  }

  // If any files are actually JPEG (not PNG), we need to convert them
  // Also, if files have .jpg extension but are PNG format, rename them to .png
  const needsConversion = fileFormats.some(f => f === 'JPEG');
  const convertedFiles: string[] = [];
  const finalPaths: string[] = [];

  if (needsConversion) {
    console.log('Converting JPEG files to PNG...');
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const filePath = file.path;
      const format = fileFormats[i];
      const ext = path.extname(filePath).toLowerCase();

      if (format === 'JPEG') {
        // Convert JPEG to PNG
        const pngPath = filePath.replace(/\.(jpg|jpeg)$/i, '.png');
        console.log(
          `  Converting ${path.basename(filePath)} (JPEG) to ${path.basename(
            pngPath
          )}`
        );

        try {
          // loadImage accepts file path string
          const image = await loadImage(filePath as string);
          const canvas = createCanvas(image.width, image.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0);

          const pngBuffer = canvas.toBuffer('image/png');
          fs.writeFileSync(pngPath, pngBuffer as any);

          convertedFiles.push(pngPath);
          finalPaths.push(pngPath);
        } catch (error: any) {
          console.error(`  Error converting ${filePath} to PNG:`, error);
          throw new Error(
            `Failed to convert ${filePath} to PNG: ${error.message}`
          );
        }
      } else if (format === 'PNG' && (ext === '.jpg' || ext === '.jpeg')) {
        // File is PNG but has .jpg extension - rename it
        const pngPath = filePath.replace(/\.(jpg|jpeg)$/i, '.png');
        console.log(
          `  Renaming ${path.basename(
            filePath
          )} (PNG with .jpg ext) to ${path.basename(pngPath)}`
        );
        fs.renameSync(filePath, pngPath);
        convertedFiles.push(pngPath); // Track for cleanup
        finalPaths.push(pngPath);
      } else {
        // Already PNG with correct extension (or unknown, but assume PNG from API)
        finalPaths.push(filePath);
      }
    }

    // Update arr to use final paths
    arr = finalPaths.map(finalPath => ({
      cwd: path.dirname(finalPath),
      base: path.basename(finalPath),
      path: finalPath,
    }));
    console.log(
      `Conversion complete. ${convertedFiles.length} files converted/renamed.`
    );
  } else {
    console.log('All files are already PNG format, no conversion needed');
    // Still check if any have wrong extension and rename them
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const filePath = file.path;
      const ext = path.extname(filePath).toLowerCase();
      if (fileFormats[i] === 'PNG' && (ext === '.jpg' || ext === '.jpeg')) {
        const pngPath = filePath.replace(/\.(jpg|jpeg)$/i, '.png');
        console.log(
          `  Renaming ${path.basename(
            filePath
          )} (PNG with .jpg ext) to ${path.basename(pngPath)}`
        );
        fs.renameSync(filePath, pngPath);
        convertedFiles.push(pngPath);
        arr[i] = {
          cwd: path.dirname(pngPath),
          base: path.basename(pngPath),
          path: pngPath,
        };
      }
    }
  }

  // Validate and filter out any corrupted files before processing
  type ImgSize = {height: number; width: number; type: string};
  const validFiles: Array<GS> = [];
  const imgSizes: ImgSize[] = [];

  for (const file of arr) {
    try {
      // Verify file exists and is readable
      if (!fs.existsSync(file.path)) {
        console.warn(`  Skipping missing file: ${file.path}`);
        continue;
      }

      // Try to read image dimensions - this will fail if file is corrupted
      const imgSize = sizeOf(file.path);
      if (!imgSize || !imgSize.width || !imgSize.height) {
        console.warn(`  Skipping invalid image: ${file.path}`);
        continue;
      }

      // Double-check file format by reading magic numbers
      const buffer = fs.readFileSync(file.path).slice(0, 8);
      const isPNG =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      if (!isPNG) {
        console.warn(`  Skipping non-PNG file: ${file.path}`);
        continue;
      }

      validFiles.push(file);
      imgSizes.push(imgSize);
    } catch (error: any) {
      console.warn(`  Skipping corrupted file ${file.path}:`, error.message);
      continue;
    }
  }

  if (validFiles.length === 0) {
    return {
      success: false,
      error: new Error('No valid PNG files found after validation'),
    };
  }

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

  // Sort files by name to ensure consistent ordering
  validFiles.sort((a, b) => {
    const nameA = path.basename(a.path).toLowerCase();
    const nameB = path.basename(b.path).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Create a temporary directory with only our validated files
  // This ensures png-file-stream only processes exactly the files we want
  const tempDir = path.join(os.tmpdir(), `gif-${uuidv4()}`);
  fs.mkdirSync(tempDir, {recursive: true});
  const tempFilePaths: string[] = [];

  console.log(`\n=== GIF CREATION ===`);
  console.log(`Temporary directory: ${tempDir}`);
  console.log(
    `Total valid files: ${validFiles.length} (filtered from ${arr.length})`
  );
  console.log(`Copying validated files to temporary directory:`);

  // Copy validated files to temp directory with sequential names (000.png, 001.png, etc.)
  for (let i = 0; i < validFiles.length; i++) {
    const sourceFile = validFiles[i].path;
    const tempFileName = `${String(i).padStart(3, '0')}.png`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
      fs.copyFileSync(sourceFile, tempFilePath);
      tempFilePaths.push(tempFilePath);
      console.log(
        `  ${i + 1}. ${path.basename(sourceFile)} -> ${tempFileName}`
      );
    } catch (error: any) {
      console.error(`  Error copying ${sourceFile} to ${tempFilePath}:`, error);
      // Clean up temp directory and fail
      try {
        fs.rmSync(tempDir, {recursive: true, force: true});
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      return {
        success: false,
        error: new Error(`Failed to copy file ${sourceFile}: ${error.message}`),
      };
    }
  }

  // Use glob pattern for the temp directory - this will only match our sequential files
  const pngGlobPattern = path.join(tempDir, '*.png');

  const encoder = new GIFEncoder(gifSize.width, gifSize.height);

  // Add error handling to identify which file is causing issues
  let currentFile: string | null = null;
  const stream = pngFileStream(pngGlobPattern)
    .on('data', (chunk: any) => {
      // Track which file is being processed if possible
      if (chunk && chunk.path) {
        currentFile = chunk.path;
      }
    })
    .on('error', (error: Error) => {
      console.error(
        `Error processing PNG file${currentFile ? `: ${currentFile}` : ''}:`,
        error
      );
    })
    .pipe(encoder.createWriteStream(createGifOptions.gifOptions))
    .pipe(fs.createWriteStream(createGifOptions.outputGifFilename as string));

  try {
    // Wait for stream. (Doesn't return anything useful)
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', (error: Error) => {
        console.error(
          `Stream error${currentFile ? ` processing ${currentFile}` : ''}:`,
          error
        );
        reject(error);
      });
    });

    // Clean up converted PNG files
    for (const pngFile of convertedFiles) {
      try {
        if (fs.existsSync(pngFile)) {
          fs.unlinkSync(pngFile);
          console.log(`Cleaned up converted PNG: ${pngFile}`);
        }
      } catch (cleanupError) {
        console.error(`Error cleaning up ${pngFile}:`, cleanupError);
      }
    }

    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, {recursive: true, force: true});
      console.log(`Cleaned up temporary directory: ${tempDir}`);
    } catch (cleanupError) {
      console.error(
        `Error cleaning up temp directory ${tempDir}:`,
        cleanupError
      );
    }

    return {
      success: true,
      outputGifFilename: createGifOptions.outputGifFilename,
    };
  } catch (e) {
    // Clean up converted PNG files even on error
    for (const pngFile of convertedFiles) {
      try {
        if (fs.existsSync(pngFile)) {
          fs.unlinkSync(pngFile);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Clean up temporary directory even on error
    try {
      fs.rmSync(tempDir, {recursive: true, force: true});
    } catch (cleanupError) {
      console.error(
        `Error cleaning up temp directory ${tempDir}:`,
        cleanupError
      );
    }
    console.error(e);
    return {
      success: false,
      error: <undefined>e,
    };
  }
};
