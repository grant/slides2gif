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
    console.log('created gif');
  }

  static async listUsers() {
    const users = await DB.getCredentialsList();
    console.log(users);
  }

  static async getUserCredentials() {
    const userinfo = await DB.getUserInfo('107961566580437023389');
    console.log(userinfo);
  }
}

/**
 * Manually test DB.
 * @note Module not required. Directly executed.
 */
if (require.main === module) {
  console.log('SLIDES2GIF ADMIN TEST:');
  Admin.getSummary();
  // Admin.requestGIF();
  // Admin.downloadImage();
  // Admin.createGIF();
  // Admin.listUsers();
}
