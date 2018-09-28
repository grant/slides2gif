#!/usr/bin/env node
/**
 * slides2gif – Converts Google Slides to a gif.
 */

import { readFile, writeFile } from 'fs';

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { slides_v1 } from 'googleapis/build/src/apis/slides/v1';

const download = require('download-file');

const readline = require('readline');

const oauth2ClientSettings = {
  clientId: '1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com',
  clientSecret: 'v6V3fKV_zWU7iw1DrpO1rknX',
  redirectUri: 'http://localhost',
};
const globalOauth2Client = new OAuth2Client(oauth2ClientSettings);
const slides = google.slides({ version: 'v1', auth: globalOauth2Client }) as slides_v1.Slides;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/presentations.readonly'];
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Slides API.
  authorize(JSON.parse(content.toString()), listSlides);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials: any, callback: any) {
  // const {client_secret, client_id, redirect_uris} = credentials.installed;
  // globalOauth2Client = new google.auth.OAuth2(
  //     client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(globalOauth2Client, callback);
    globalOauth2Client.setCredentials(JSON.parse(token.toString()));
    callback(globalOauth2Client);
  });
}


/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client: any, callback: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code: string) => {
    rl.close();
    oAuth2Client.getToken(code, (err: any, token: any) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function listSlides() {
  let slidesId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
  let p = await slides.presentations.get({
    presentationId: slidesId,
  })
  if (p.data.slides) {
    console.log(`${p.data.slides.length} slides.`);
  }
  let presoSlides = p.data.slides;
  if (!presoSlides) return;

  var i = 0;
  for (let slide of presoSlides) {
    const thumbnail = await slides.presentations.pages.getThumbnail({
      presentationId: slidesId,
      pageObjectId: slide.objectId,
    });
    let {
      contentUrl, // png
      height,
      width,
    } = thumbnail.data;
    console.log(`${contentUrl} (${width}x${height})`);

    var options = {
      directory: "./images/",
      filename: `${i}.png`
    }
    
    // Test image:
    // var contentUrl = "http://i.imgur.com/G9bDaPH.jpg"
    download(contentUrl, options, (err: any) => {
      if (err) throw err
    });
    ++i;
  }
  console.log('good5');
}