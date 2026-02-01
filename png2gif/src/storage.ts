import {Storage, File} from '@google-cloud/storage';
// eslint-disable-next-line node/no-extraneous-import
import {Metadata} from '@google-cloud/common';
import mkdirp from 'mkdirp';
import * as fs from 'fs';
import {pipeline} from 'stream/promises';

// Use the same bucket as the www service for cached slides
const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

/**
 * Options for downloading slides from GCS.
 */
export interface DownloadImagesRequestOptions {
  presentationId: string; // The presentation ID.
  slideList: string; // The slides query. i.e. "1,2,3" or "3,5,9"
  downloadLocation: string; // ?The local relative folder name for the downloads.
  thumbnailSize?: 'SMALL' | 'MEDIUM' | 'LARGE'; // Thumbnail size to download
}

/**
 * Uploads a file to Cloud Storage
 * @param localFilepath The path to the local file
 * @param gcsFilename The name of the file in Cloud Storage, i.e. `myfile.gif`
 * @param metadata Optional metadata to attach to the file
 */
export async function uploadFile(
  localFilepath: string,
  gcsFilename: string,
  metadata?: {[key: string]: string}
) {
  try {
    const storage = new Storage();
    const [file]: [File, Metadata] = await storage
      .bucket(BUCKET_NAME)
      .upload(localFilepath, {
        destination: gcsFilename,
        metadata: metadata
          ? {
              metadata,
            }
          : undefined,
      });
    return file;
  } catch (error) {
    console.error(
      `[png2gif] Error uploading file ${localFilepath} to ${gcsFilename}:`,
      error
    );
    throw error;
  }
}

/**
 * Gets the Cloud Storage full URL from a file name.
 * @param gcsFilename The file
 * @returns The gs:// filename
 */
export function getGCSPath(gcsFilename: string) {
  return `gs://${BUCKET_NAME}/${gcsFilename}`;
}

/**
 * Downloads images from GCS.
 * @param downloadImagesReq The image download request.
 */
export async function downloadFiles({
  downloadLocation,
  presentationId,
  slideList,
  thumbnailSize = 'MEDIUM',
}: DownloadImagesRequestOptions): Promise<{files: string[]} | {error: string}> {
  console.log('DOWNLOADING FILES', {
    presentationId,
    slideList,
    thumbnailSize,
  });

  // Validate arguments
  if (!slideList) {
    return {error: 'Missing argument: slideList'};
  }

  if (slideList === '') {
    return {error: 'slideList cannot be empty'};
  }
  const storage = new Storage();

  // Files are stored at: presentations/{presentationId}/slides/{objectId}_{size}.png
  // All sizes use suffixes: _small, _medium, _large
  const sizeSuffix = `_${thumbnailSize.toLowerCase()}`;
  const prefix = `presentations/${presentationId}/slides/`;
  console.log(
    `[png2gif] Looking for files in bucket: ${BUCKET_NAME}, prefix: ${prefix}`
  );
  let fileList: File[];
  try {
    [fileList] = await storage.bucket(BUCKET_NAME).getFiles({
      prefix: prefix,
    });
    console.log(
      `[png2gif] FOUND ${fileList.length} FILES with prefix ${prefix} in bucket ${BUCKET_NAME}.`
    );

    // Debug: List all files found with their objectIds
    console.log('\n=== FILES FOUND IN GCS ===');
    fileList.forEach((file, index) => {
      const fileName = file.name.split('/').pop() || '';
      const objectId = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   objectId: ${objectId}`);
    });
    console.log('========================\n');

    // Generate GCS Console URL for debugging
    const gcsConsoleUrl =
      'https://console.cloud.google.com/storage/browser/' +
      BUCKET_NAME +
      '/' +
      encodeURIComponent(prefix);
    console.log('\nGCS Console URL to view files:');
    console.log(gcsConsoleUrl);
    console.log('');

    if (fileList.length === 0) {
      console.warn(
        `[png2gif] No files found! Check that bucket ${BUCKET_NAME} exists and contains files with prefix ${prefix}`
      );
    }
  } catch (error) {
    console.error(
      `[png2gif] Error listing files in bucket ${BUCKET_NAME}:`,
      error
    );
    throw error;
  }

  // Parse slideList (comma-separated list of objectIds) — preserve order and duplicates
  const slideIds =
    slideList === '*'
      ? null // Download all slides
      : slideList.split(',').map(id => id.trim());

  const expectedSizeSuffix = `_${thumbnailSize.toLowerCase()}`;

  console.log('\n=== FILTERING ===');
  console.log('slideList received:', slideList);
  console.log('Parsed slideIds (order preserved):', slideIds?.length, slideIds);
  console.log('Total files in GCS:', fileList.length);

  // Build map: objectId -> File (for requested size only)
  const fileByObjectId = new Map<string, File>();
  for (const file of fileList) {
    const fileName = file.name.split('/').pop() || '';
    const hasCorrectSize = fileName
      .toLowerCase()
      .endsWith(`${expectedSizeSuffix}.png`);
    if (!hasCorrectSize) continue;
    const objectId = fileName
      .replace(/_(small|medium|large)\.(jpg|jpeg|png)$/i, '')
      .replace(/\.(jpg|jpeg|png)$/i, '');
    fileByObjectId.set(objectId, file);
  }

  // When slideList is '*', download all files (legacy behavior)
  if (!slideIds) {
    const filesToDownload = fileList.filter(f => {
      const fileName = f.name.split('/').pop() || '';
      return fileName.toLowerCase().endsWith(`${expectedSizeSuffix}.png`);
    });
    console.log('Files to download (all):', filesToDownload.length);
    console.log('==================\n');
    const res: {files: string[]} = {files: []};
    await mkdirp(`${downloadLocation}/presentations/${presentationId}/slides`);
    for (const f of filesToDownload) {
      const destination = `${downloadLocation}/${f.name}`;
      await mkdirp(destination.substring(0, destination.lastIndexOf('/')));
      const readStream = f.createReadStream();
      const writeStream = fs.createWriteStream(destination);
      await pipeline(readStream, writeStream);
      res.files.push(destination);
    }
    return res;
  }

  // Preserve slideList order and duplicates: one frame per entry
  const orderedFrames: {file: File; frameIndex: number}[] = [];
  for (let i = 0; i < slideIds.length; i++) {
    const objectId = slideIds[i];
    const file = fileByObjectId.get(objectId);
    if (!file) {
      console.warn(`  [SKIP] No file for objectId: ${objectId} (frame ${i})`);
      continue;
    }
    orderedFrames.push({file, frameIndex: i});
  }

  console.log(
    `Downloading ${orderedFrames.length} frames (order preserved, duplicates as separate frames)`
  );
  console.log('==================\n');

  const res: {files: string[]} = {files: []};
  const slidesDir = `${downloadLocation}/presentations/${presentationId}/slides`;
  await mkdirp(slidesDir);

  for (const {file, frameIndex} of orderedFrames) {
    const frameName = `frame_${String(frameIndex).padStart(
      3,
      '0'
    )}${expectedSizeSuffix}.png`;
    const destination = `${slidesDir}/${frameName}`;
    try {
      const readStream = file.createReadStream();
      const writeStream = fs.createWriteStream(destination);
      await pipeline(readStream, writeStream);
      res.files.push(destination);
      console.log(`  ✓ Frame ${frameIndex}: ${frameName}`);
    } catch (error: any) {
      console.error(`  ✗ Error downloading frame ${frameIndex}:`, error);
      throw new Error(
        `Failed to download frame ${frameIndex}: ${error.message}`
      );
    }
  }
  return res;
}
