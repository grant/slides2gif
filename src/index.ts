#!/usr/bin/env node
/**
 * slides2gif – Converts Google Slides to a gif.
 */
import {downloadSlides} from './googleslides';
import {getRecentPresentations} from './googledriveactivity';
import {createGif} from './gif';
const process = require('process');

(async () => {
  // const presentationId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
  const presentationId = '107QhovazwhLe3AfjF-kVymwRHRpAHXyMcsYZumi2Bmk';

  const presentations = await getRecentPresentations();
  console.log(presentations);

  for (const id of presentations) {
    console.log(`https://docs.google.com/presentation/d/${id}/edit`);
  }

  // await downloadSlides(presentationId);
  // console.log('start');
  // await createGif({});
  // console.log('done');

  return process.exit(); // for some reason the process hangs.
})();
