#!/usr/bin/env node
/**
 * slides2gif – Converts Google Slides to a gif.
 */
import {downloadSlides} from './googleslides';
import {createGif} from './gif';

(async () => {
  const presentationId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
  await downloadSlides(presentationId);
  // console.log('start');
  // await createGif({});
  // console.log('done');
})();
