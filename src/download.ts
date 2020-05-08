const fs = require('fs');
const download = require('download');

/**
 * Downloads an image from the internet.
 */
export const downloadImage = async ({
  url = 'http://i.imgur.com/G9bDaPH.jpg',
  folder = 'dest',
  filename = 'myfile.png',
}: {
  url: string;
  folder: string;
  filename: string;
}) => {
  return await download(url, folder, {
    filename,
  });
};
