import {Request, Response} from 'express';
const {PubSub} = require('@google-cloud/pubsub');

const PROJECT_ID = 'slides2gif';
const TOPIC_NEW_PRESENTATION = 'topic_new_presentation';

/**
 * Creates and stores a GIF.
 */
export default async (req: Request, res: Response) => {
  const pubSubClient = new PubSub({projectId: PROJECT_ID});
  const presentationId = req.body.presentationId;
  const pubsubData = {presentationId};

  const dataBuffer = Buffer.from(JSON.stringify(pubsubData));
  const messageId = await pubSubClient
    .topic(TOPIC_NEW_PRESENTATION)
    .publish(dataBuffer);
  res.send(`Published message: ${messageId}`);
};
