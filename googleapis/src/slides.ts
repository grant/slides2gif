import {google} from 'googleapis';
import {slides_v1} from 'googleapis/build/src/apis/slides/v1';
import {downloadImage} from './download';
import {OAuth2Client, Credentials} from 'google-auth-library';

/**
 * The Result of downloading slides.
 */
export type DownloadSlidesResult = Promise<{
  // True if the result is done (successfully)
  done: boolean;
  // A list of local file paths to the images.
  images: string[];
}>;

// https://developers.google.com/slides/reference/rest/v1/presentations.pages/getThumbnail#thumbnailsize
// The client library currently doesn't provide enums for this.
enum ThumbnailSize{
  SMALL = 'SMALL', // 200×112
  MEDIUM = 'MEDIUM', // 800x450
  LARGE = 'LARGE', // 1600×900
}

/**
 * A Google Slides client.
 */
export class Slides {
  #slides: slides_v1.Slides;

  /**
   * Creates a Slides client.
   */
  constructor(creds: Credentials) {
    const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
    const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

    // Set credentials
    const auth = new OAuth2Client({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });
    auth.setCredentials(creds);

    this.#slides = google.slides({
      version: 'v1',
      auth,
    }) as slides_v1.Slides;
  }

  /**
   * Downloads all slide thumbnails given a presentation.
   * @param {string} presentationId The Google Slide presentation ID, i.e. "1RiBBZiBLH8XOxmc7oK8FJttZwMnk-dyRh0K67FVfvYo"
   * @param {string} downloadLocation The local download location for these files. Relative to the `package.json` file.
   * @param {string} slideList A comma delimited list of slides. i.e. "001,002"
   */
  async downloadSlides({
    presentationId,
    downloadLocation = 'downloads',
    slideList = '', // TODO
  }: {
    presentationId: string;
    downloadLocation?: string;
    slideList?: string;
  }): DownloadSlidesResult {
    console.log('- START downloadSlides: ' + presentationId);

    // Get Slides
    const slide: slides_v1.Schema$Page[] = await this.getSlides(presentationId);
    if (!slide) return Promise.reject('bad slides');

    // Get thumbnail data per slide
    const thumbnailData: Array<slides_v1.Schema$Thumbnail> =
      await this.getThumbnailData(presentationId, slide);
    // Download each thumbnail locally
    const downloadPromises = thumbnailData.map(async (thumbnail, i) => {
      // image name matters as it orders the gif frames
      // i.e. `000.png`, `001.png`
      const imageName = `${(i + '').padStart(3, '0')}.png`;
      await downloadImage({
        url: thumbnail.contentUrl || '',
        folder: downloadLocation,
        filename: imageName,
      });
      return imageName;
    });
    const imageNames = await Promise.all(downloadPromises);
    return {
      done: true,
      images: imageNames,
    };
  }

  /**
   * Gets a list of slides given a presentation
   */
  private async getSlides(presentationId: string) {
    const p = await this.#slides.presentations.get({
      presentationId,
    });
    if (p.data.slides) {
      console.log(`- Presentation: ${presentationId} has ${p.data.slides.length} slides.`);
    }
    const presoSlides: slides_v1.Schema$Page[] | undefined = p.data.slides;
    if (!presoSlides) return [];
    return presoSlides;
  }

  /**
   * Gets an array of thumbnails from an array of pages.
   */
  private async getThumbnailData(
    presentationId: string,
    pages: slides_v1.Schema$Page[]
  ) {
    const thumbnails: slides_v1.Schema$Thumbnail[] = [];
    for (const page of pages) {
      const thumbnail = await this.#slides.presentations.pages.getThumbnail({
        presentationId: presentationId,
        pageObjectId: page.objectId + '',
        'thumbnailProperties.thumbnailSize': ThumbnailSize.MEDIUM,
      });
      // Add data such as: contentUrl, height, width
      thumbnails.push(thumbnail.data);
    }
    return thumbnails;
  }
}
