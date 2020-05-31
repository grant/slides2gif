import {google} from 'googleapis';
import {slides_v1} from 'googleapis/build/src/apis/slides/v1';
// import {getAuthClientWithCreds} from './auth';
import {downloadImage} from '../gif/download';

let slidesClient: slides_v1.Slides | null = null;

const getSlidesClient = async () => {
  if (slidesClient) return slidesClient;

  // Create and memoize client
  const slides = google.slides({
    version: 'v1',
    // auth: await getAuthClientWithCreds(),
  }) as slides_v1.Slides;
  slidesClient = slides;

  return slides;
};

/**
 * Downloads slide thumbnails given a presentation.
 */
export const downloadSlides = async (presentationId: string) => {
  console.log('START');
  console.log(presentationId);
  // Load creds
  console.log('LOAD CREDS');

  // Get Slides
  const slide: slides_v1.Schema$Page[] = await getSlides(presentationId);
  if (!slide) return console.error('bad slides');

  // Get thumbnail data per slide
  const thumbnailData: Array<slides_v1.Schema$Thumbnail> = await getThumbnailData(
    presentationId,
    slide
  );
  // Download each thumbnail locally
  const downloadPromises = thumbnailData.map(async (thumbnail, i) => {
    // image name matters as it orders the gif frames
    const imageName = (i + '').padStart(3, '0');
    return await downloadImage({
      url: thumbnail.contentUrl || '',
      folder: 'downloads',
      filename: `${imageName}.png`,
    });
  });
  const done = await Promise.all(downloadPromises);
  return done;
};

/**
 * Gets a list of slides given a presentation
 */
const getSlides = async (presentationId: string) => {
  // Create client
  const slides = await getSlidesClient();

  // Request
  const p = await slides.presentations.get({
    presentationId,
  });
  if (p.data.slides) {
    console.log(`${p.data.slides.length} slides.`);
  }
  const presoSlides: slides_v1.Schema$Page[] | undefined = p.data.slides;
  if (!presoSlides) return [];
  return presoSlides;
};

/**
 * Gets an array of thumbnails from an array of pages.
 */
const getThumbnailData = async (
  presentationId: string,
  pages: slides_v1.Schema$Page[]
) => {
  const thumbnails: slides_v1.Schema$Thumbnail[] = [];

  const slides = await getSlidesClient();
  for (const page of pages) {
    const thumbnail = await slides.presentations.pages.getThumbnail({
      presentationId: presentationId,
      pageObjectId: page.objectId + '',
      // https://developers.google.com/slides/reference/rest/v1/presentations.pages/getThumbnail#thumbnailsize
      'thumbnailProperties.thumbnailSize': 'MEDIUM',
    });
    // Add data such as: contentUrl, height, width
    thumbnails.push(thumbnail.data);
  }
  return thumbnails;
};
