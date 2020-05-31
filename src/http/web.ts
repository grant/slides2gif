import {Request, Response} from 'express';
import {getAuthURL} from '../googleapis/auth';
const ejs = require('ejs');
const path = require('path');

/**
 * Web API endpoint.
 */
export default async (req: Request, res: Response) => {
  const authURL = getAuthURL();
  const data = {
    authURL,
  };
  const htmlPath = path.join(__dirname + '/web.ejs');
  const html = await ejs.renderFile(htmlPath, data);
  res.send(html);
};
