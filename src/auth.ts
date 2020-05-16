import * as open from 'open';
import * as url from 'url';
import * as http from 'http';
import {AddressInfo} from 'net';
import {google} from 'googleapis';
import {promises as fs} from 'fs';
import {join} from 'path';
import {prompt} from 'enquirer';
import {Credentials} from 'googleapis/node_modules/google-auth-library/build/src/auth/credentials';

// Google auth
const googleOAuthClient = new google.auth.OAuth2({
  clientId:
    '392236462496-qmtv90s0k7ha15li7ej07d146c32vhdj.apps.googleusercontent.com',
  clientSecret: 'PmtzackdT4U1XoucheLq_mZw',
  redirectUri: 'http://localhost:5432',
});

// Client auth
const TOKEN_PATH = 'token.json';
// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/presentations.readonly',
  'https://www.googleapis.com/auth/drive.activity.readonly',
];

/**
 * Loads credentials.
 * ~/.slides2gif.json
 */
export const getAuthClientWithCreds = async () => {
  // Load client secrets from a local file.
  const homedir = require('os').homedir();
  const credsPath = join(homedir, '.slides2gif.json');

  // Get credentials.
  try {
    const creds = await fs.readFile(credsPath);
    googleOAuthClient.setCredentials(creds as Credentials);
  } catch (e) {
    // No creds file, get new ones
    const token = await getNewCreds();
    googleOAuthClient.setCredentials(token);
  }
  return googleOAuthClient;
};

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

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
const getNewCreds = async () => {
  console.log('Authorize this app by visiting this url:');
  console.log();
  const token = await authorizeWithLocalhost();
  return token;
};

/**
 * Authorize the app
 */
async function authorizeWithLocalhost(): Promise<object> {
  const server = await new Promise<http.Server>((resolve, _) => {
    const s = http.createServer();
    s.listen(5432, () => resolve(s));
  });
  const {port} = server.address() as AddressInfo;
  const client = googleOAuthClient;
  // TODO Add spinner
  const authCode = await new Promise<string>((res, rej) => {
    server.on(
      'request',
      (req: http.IncomingMessage, resp: http.ServerResponse) => {
        const qs = new url.URL(req.url || '', 'http://localhost:3000');
        const code = qs.searchParams.get('code') || '';
        resp.end('Authentication successful! Please return to the console.');
        res(code);
      }
    );
    const authUrl = googleOAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log(authUrl);
    open(authUrl);
  });
  server.close();
  return (await client.getToken(authCode)).tokens;
}
