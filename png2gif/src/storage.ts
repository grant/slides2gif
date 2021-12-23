const BUCKET_NAME = 'slides2gif-upload-test'

export async function uploadFile(filepath: string) {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();

  // Uploading gif
  await storage.bucket(BUCKET_NAME).upload(filepath, {
    destination: 'TEST123.gif',
  });
}