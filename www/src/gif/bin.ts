#!/usr/bin/env node
/**
 * slides2gif – Converts Google Slides to a gif.
 */
import {Auth} from '../googleapis/auth';
import {Slides} from '../googleapis/slides';
import {DriveActivity} from '../googleapis/driveactivity';
import {createGif} from './gif';

// (async () => {
//   // const presentationId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
//   const presentationId = '107QhovazwhLe3AfjF-kVymwRHRpAHXyMcsYZumi2Bmk';
//   toGif(presentationId);

//   // for some reason the process hangs.
//   throw new Error('');
// })();

// async function toGif(presentationId: string) {
//   const slides = new Slides();
//   await slides.downloadSlides(presentationId);
//   console.log('start');
//   await createGif({});
//   console.log('done');
// }

// async function recentPresentations() {
//   const presentations = await DriveActivity.getRecentPresentations();
//   console.log(presentations);

//   for (const id of presentations) {
//     console.log(`https://docs.google.com/presentation/d/${id}/edit`);
//   }
// }
