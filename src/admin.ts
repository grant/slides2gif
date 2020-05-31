import DB from './db/firestore';
import {createGif} from './gif/gif';
import {downloadImage} from './gif/download';

/**
 * Admin commands that aren't available via an API
 */
class Admin {
  static getSummary() {
    console.log('Summary:');
    DB.printSummary();
  }

  static deleteDB() {
    console.log('delete');
  }

  static async requestGIF() {
    const gif = await createGif({});
    console.log(gif);
  }

  static async downloadImage() {
    // 400x400
    const images = [
      'https://i.imgur.com/HbTjgjz.png',
      'https://i.imgur.com/rp2wcUj.png',
      'https://i.imgur.com/GmXKUys.png',
    ];
    // Download each image
    images.forEach(async (v, i) => {
      await downloadImage({
        url: v,
        filename: `${i + 1}.jpg`,
      });
    });
    console.log('done');
  }

  static async createGIF() {
    await createGif({});
  }

  static async listUsers() {
    const users = await DB.getCredentialsList();
    console.log(users);
  }

  static async getCredentials() {
    // const creds = await DB.getUserInfo();
  }
}

/**
 * Manually test DB.
 * @note Module not required. Directly executed.
 */
if (require.main === module) {
  console.log('SLIDES2GIF ADMIN TEST:');
  // Admin.getSummary();
  // Admin.requestGIF();
  // Admin.downloadImage();
  Admin.createGIF();
  // Admin.listUsers();
}
