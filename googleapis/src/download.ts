const download = require('download');

/**
 * Downloads an image from the internet.
 */
export const downloadImage = async ({
  url = 'http://i.imgur.com/G9bDaPH.jpg',
  folder = 'downloads',
  filename = 'myfile.png',
}: {
  url?: string;
  folder?: string;
  filename?: string;
}): Promise<Buffer> => {
  return await download(url, folder, {
    filename,
  });
};
