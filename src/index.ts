#!/usr/bin/env node
/**
 * slides2gif – Converts Google Slides to a gif.
 */
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { slides_v1 } from 'googleapis/build/src/apis/slides/v1';
import { loadCredentials} from './auth';

const download = require('download-file');
const readline = require('readline');

// const oauth2ClientSettings = {
//   clientId: '833834422750-hr0a48ds7l0ofvvvdhnk6k4n3o2a51kp.apps.googleusercontent.com',
//   clientSecret: 'gA_p1p_0y_qywHX0IYnz0X2b',
//   redirectUri: 'http://localhost',
// };
// let globalOauth2Client = new OAuth2Client(oauth2ClientSettings);
// const slides = google.slides({ version: 'v1', auth: globalOauth2Client }) as slides_v1.Slides;

// // If modifying these scopes, delete token.json.
// const SCOPES = ['https://www.googleapis.com/auth/presentations.readonly'];

console.log('hi');

// loadCredentials(async () => {
//   let slidesId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
//   let p = await slides.presentations.get({
//     presentationId: slidesId,
//   })
//   if (p.data.slides) {
//     console.log(`${p.data.slides.length} slides.`);
//   }
//   let presoSlides = p.data.slides;
//   if (!presoSlides) return;

//   var i = 0;
//   for (let slide of presoSlides) {
//     const thumbnail = await slides.presentations.pages.getThumbnail({
//       presentationId: slidesId,
//       pageObjectId: slide.objectId,
//     });
//     let {
//       contentUrl, // png
//       height,
//       width,
//     } = thumbnail.data;
//     console.log(`${contentUrl} (${width}x${height})`);

//     var options = {
//       directory: "./images/",
//       filename: `${i}.png`
//     }

//     // Test image:
//     // var contentUrl = "http://i.imgur.com/G9bDaPH.jpg"
//     download(contentUrl, options, (err: any) => {
//       if (err) throw err
//     });
//     ++i;
//   }
//   console.log('good5');
// });
