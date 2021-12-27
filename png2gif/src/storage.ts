import {Storage, File} from '@google-cloud/storage';
// eslint-disable-next-line node/no-extraneous-import
import {Metadata} from '@google-cloud/common';
import * as mkdirp from 'mkdirp';

const BUCKET_NAME = 'slides2gif-upload-test';

/**
 * Options for downloading slides from GCS.
 */
export interface DownloadImagesRequestOptions {
  presentationId: string;
  slideList: string;
  downloadLocation: string;
}

/**
 * Uploads a file to Cloud Storage
 * @param localFilepath The path to the local file
 * @param gcsFilename The name of the file in Cloud Storage, i.e. `myfile.gif`
 */
export async function uploadFile(localFilepath: string, gcsFilename: string) {
  const storage = new Storage();
  const [file]: [File, Metadata] = await storage
    .bucket(BUCKET_NAME)
    .upload(localFilepath, {
      destination: gcsFilename,
    });
  return file;
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
export async function downloadFiles(downloadImagesReq: DownloadImagesRequestOptions) {
  console.log('DOWNLOADING FILES');

  // Validate arguments
  if (!downloadImagesReq.slideList) {
    return { error: 'Missing argument: slideList' };
  }
  const storage = new Storage();
  const [fileList] = await storage.bucket(BUCKET_NAME).getFiles({
    prefix: downloadImagesReq.presentationId,
  });

  // Download all files in bucket
  const res: {
    files: string[];
  } = {files: []};
  mkdirp(`downloads/${downloadImagesReq.presentationId}`);
  for (let i = 0; i < fileList.length; ++i) {
    const f = fileList[i];
    f.download({
      destination: `downloads/${f.name}`,
    });
    res.files.push(`downloads/${f.name}`);
  }
  return res;
}