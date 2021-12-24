import {Storage, File} from '@google-cloud/storage';
// eslint-disable-next-line node/no-extraneous-import
import {Metadata} from '@google-cloud/common';

const BUCKET_NAME = 'slides2gif-upload-test';

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
  console.log(`File uploaded: ${file.id}`);
}
