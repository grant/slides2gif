/* eslint-disable @typescript-eslint/ban-ts-ignore */
/**
 * API endpoints.
 */
// import {Request, Response} from 'express';

// import web from './src/http/web';
// import oauth2callback from './src/http/oauth2callback';
// import getGif from './src/http/getGif';
// import requestGIF from './src/http/requestGif';

// import * as express from 'express';
// const app = express();

// // Express session

// // TODO: Store with https://cloud.google.com/nodejs/getting-started/session-handling-with-firestore
// import {getFirestoreSession} from './src/db/firestore';
// const session = require('express-session');
// app.use(session(getFirestoreSession()));

// // Allow CORS
// app.use((req: Request, res: Response, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header(
//     'Access-Control-Allow-Headers',
//     'Origin, X-Requested-With, Content-Type, Accept'
//   );
//   next();
// });
// app.use('/web', web);
// // @ts-ignore
// app.use('/oauth2callback', oauth2callback);
// app.use('/getGIF', getGif);
// app.use('/requestGIF', requestGIF);

// app.get('/views', (req: any, res: Response) => {
//   if (!req.session.views) {
//     req.session.views = 0;
//   }
//   const views = req.session.views++;
//   res.send(`Views ${views}`);
// });
// app.use('/', (req, res) => res.send('hi there'));

// // Export Express app to Functions Framework.
// console.log('STARTING APP');
// exports.function = app;
