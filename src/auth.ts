import { readFile, writeFile } from 'fs';
import { join } from 'path';

const TOKEN_PATH = 'token.json';

/**
 * Loads credentials.
 */
export const loadCredentials = (cb: Function) => {
  cb();
};



// // Load client secrets from a local file.
// const homedir = require('os').homedir();
// const credsPath = join(homedir, '.slides2gif.json');
// readFile(credsPath, (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Slides API.
//   console.log(JSON.parse(content.toString()));
//   authorize(JSON.parse(content.toString()), listSlides);
// });

// /**
//  * Create an OAuth2 client with the given credentials, and then execute the
//  * given callback function.
//  * @param {Object} credentials The authorization client credentials.
//  * @param {function} callback The callback to call with the authorized client.
//  */
// function authorize(credentials: any, callback: any) {
//   const { client_secret, client_id, redirect_uris } = credentials.installed;
//   globalOauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

//   // Check if we have previously stored a token.
//   readFile(TOKEN_PATH, (err, token) => {
//     if (err) return getNewToken(globalOauth2Client, callback);
//     globalOauth2Client.setCredentials(JSON.parse(token.toString()));
//     callback(globalOauth2Client);
//   });
// }

// /**
//  * Get and store new token after prompting for user authorization, and then
//  * execute the given callback with the authorized OAuth2 client.
//  * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
//  * @param {getEventsCallback} callback The callback for the authorized client.
//  */
// function getNewToken(oAuth2Client: any, callback: any) {
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
//   });
//   console.log('Authorize this app by visiting this url:', authUrl);
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//   rl.question('Enter the code from that page here: ', (code: string) => {
//     rl.close();
//     oAuth2Client.getToken(code, (err: any, token: any) => {
//       if (err) return console.error('Error retrieving access token', err);
//       oAuth2Client.setCredentials(token);
//       // Store the token to disk for later program executions
//       writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
//         if (err) console.error(err);
//         console.log('Token stored to', TOKEN_PATH);
//       });
//       callback(oAuth2Client);
//     });
//   });
// }

