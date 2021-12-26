import {Storage, File} from '@google-cloud/storage';
// eslint-disable-next-line node/no-extraneous-import
import {Metadata} from '@google-cloud/common';

/**
 * Uploads a file to Cloud Storage.
 * In Cloud Storage, there are no folders, but files can have a folder prefix.
 * @param localFilepath The path to the local file
 * @param gcsFilename The name of the file in Cloud Storage, i.e. `myfolder/myfile.gif`
 * @param gcsBucket The name of the bucket in Cloud Storage, i.e. `mybucket`
 */
export async function uploadFile({
  localFilepath,
  gcsFilename,
  gcsBucket,
}: {
  localFilepath: string;
  gcsFilename: string;
  gcsBucket: string;
}) {
  const storage = new Storage();
  const [file]: [File, Metadata] = await storage
    .bucket(gcsBucket)
    .upload(localFilepath, {
      destination: gcsFilename,
    });
  return file;
}
