import {Storage} from '@google-cloud/storage';

const BUCKET_NAME = 'slides2gif-upload-test'

export async function uploadFile(filepath: string) {
  const storage = new Storage();

  // Uploading gif
  await storage.bucket(BUCKET_NAME).upload(filepath, {
    destination: 'TEST1234.gif',
  });
}