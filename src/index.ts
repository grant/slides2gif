#!/usr/bin/env node
/**
 * slides2gif – Converts Google Slides to a gif.
 */
import {downloadSlides} from './googleslides';
import {createGif} from './gif';
const process = require('process');

(async () => {
  // const presentationId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
  const presentationId = '107QhovazwhLe3AfjF-kVymwRHRpAHXyMcsYZumi2Bmk';
  await downloadSlides(presentationId);
  console.log('start');
  await createGif({});
  console.log('done');

  return process.exit(); // for some reason the process hangs.
})();
