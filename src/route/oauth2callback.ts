import {Request, Response} from 'express';
const ejs = require('ejs');
const path = require('path');

/**
 * OAuth Callback
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
export default async (req: Request, res: Response) => {
  // http://localhost:8080/oauth2callback?
  //   code=4/0AHFg9gqDJRb1jTGs9ZjISYNrdwEANKegDECmFeg37YeiiSyPLEl0yd7LdW8UJV4tuXcctGk-S_9G33LcefbvDw
  //   scope=https://www.googleapis.com/auth/presentations.readonly%20https://www.googleapis.com/auth/drive.activity.readonly
  const htmlPath = path.join(__dirname + '/oauth2callback.ejs');
  const html = await ejs.renderFile(htmlPath);
  res.send(html);
};
