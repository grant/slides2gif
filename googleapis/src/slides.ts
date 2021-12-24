// import {google} from 'googleapis';
// import {slides_v1} from 'googleapis/build/src/apis/slides/v1';
// import {downloadImage} from '../gif/download';
// import {OAuth2Client} from 'google-auth-library';

// /**
//  * A Google Slides client.
//  */
// export class Slides {
//   #slides: slides_v1.Slides;

//   /**
//    * Creates a Slides client.
//    * @param {OAuth2Client} auth The auth client for this library.
//    */
//   constructor(auth: OAuth2Client) {
//     this.#slides = google.slides({
//       version: 'v1',
//       auth,
//     }) as slides_v1.Slides;
//   }

//   /**
//    * Downloads slide thumbnails given a presentation.
//    */
//   async downloadSlides(presentationId: string) {
//     console.log('START');
//     console.log(presentationId);
//     // Load creds
//     console.log('LOAD CREDS');

//     // Get Slides
//     const slide: slides_v1.Schema$Page[] = await this.getSlides(presentationId);
//     if (!slide) return console.error('bad slides');

//     // Get thumbnail data per slide
//     const thumbnailData: Array<slides_v1.Schema$Thumbnail> =
//       await this.getThumbnailData(presentationId, slide);
//     // Download each thumbnail locally
//     const downloadPromises = thumbnailData.map(async (thumbnail, i) => {
//       // image name matters as it orders the gif frames
//       const imageName = (i + '').padStart(3, '0');
//       return await downloadImage({
//         url: thumbnail.contentUrl || '',
//         folder: 'downloads',
//         filename: `${imageName}.png`,
//       });
//     });
//     const done = await Promise.all(downloadPromises);
//     return done;
//   }

//   /**
//    * Gets a list of slides given a presentation
//    */
//   private async getSlides(presentationId: string) {
//     const p = await this.#slides.presentations.get({
//       presentationId,
//     });
//     if (p.data.slides) {
//       console.log(`${p.data.slides.length} slides.`);
//     }
//     const presoSlides: slides_v1.Schema$Page[] | undefined = p.data.slides;
//     if (!presoSlides) return [];
//     return presoSlides;
//   }

//   /**
//    * Gets an array of thumbnails from an array of pages.
//    */
//   private async getThumbnailData(
//     presentationId: string,
//     pages: slides_v1.Schema$Page[]
//   ) {
//     const thumbnails: slides_v1.Schema$Thumbnail[] = [];
//     for (const page of pages) {
//       const thumbnail = await this.#slides.presentations.pages.getThumbnail({
//         presentationId: presentationId,
//         pageObjectId: page.objectId + '',
//         // https://developers.google.com/slides/reference/rest/v1/presentations.pages/getThumbnail#thumbnailsize
//         'thumbnailProperties.thumbnailSize': 'MEDIUM',
//       });
//       // Add data such as: contentUrl, height, width
//       thumbnails.push(thumbnail.data);
//     }
//     return thumbnails;
//   }
// }
