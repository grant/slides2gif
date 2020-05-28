/**
 * API endpoints.
 */
import {Request, Response} from 'express';

import web from './src/route/web';
import oauth2callback from './src/route/oauth2callback';
import getGif from './src/route/getGif';
import createGifRequest from './src/route/createGifRequest';

/**
 * Entry point into the Functions Framework.
 * @see https://github.com/GoogleCloudPlatform/functions-framework-nodejs
 */
exports.function = (req: Request, res: Response) => {
  const paths = {
    '/web': web,
    '/oauth2callback': oauth2callback,
    '/getGIF': getGif,
    '/createGIF': createGifRequest,
    // Default route (at the end)
    '/': () => res.send(Object.keys(paths)),
  };
  // Find the first route that matches
  for (const [path, route] of Object.entries(paths)) {
    if (req.path.startsWith(path)) {
      return route(req, res);
    }
  }

  // Allow CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.send('No path found');
};
