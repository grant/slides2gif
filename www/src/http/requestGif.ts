import {Request, Response} from 'express';
// import DB from '../db/firestore';
// import createGifMessage from '../pubsub/pubsubCreateGifMessage';

// // Extend Express to include session
// import * as Express from 'express';
// interface Request extends Express.Request {
//   session: any;
// }

/**
 * Requests a GIF is made with a presentation.
 * @requires res.session.userid The user must be logged in.
 * @param {string} req.body.presentationurl The presentation ID.
 */
export default async (req: Request, res: Response) => {
  // Get presentation ID from URL
  const presentationid = req.body.presentationurl
    .split('/')
    .filter((s: string) => s.length === 44)[0];
  if (!presentationid) {
    return res.status(400).send('Bad presentation ID/URL');
  }
  console.log(`Requesting GIF: ${presentationid}`);

  const userid = req.session.userid;
  console.log(req.session);
  if (!userid) return res.status(401).send('You need to log in first');

  // Create Pub/Sub message
  //   const messageId = await createGifMessage({
  //     userid,
  //     presentationid,
  //   });

  // Return result
  console.log('CREATE GIF REQUEST');
  //   console.log(`PRESENTATION: ${presentationid} MESSAGE: ${messageId}`);
  //   return res.send({
  //     success: true,
  //     presentationid,
  //     messageid: messageId,
  //   });
  return;
};
