const {PubSub} = require('@google-cloud/pubsub');

// TODO Make project dynamic
const PROJECT_ID = 'serverless-com-demo';
const TOPIC_NEW_PRESENTATION = 'topic_new_presentation';

const pubSubClient = new PubSub({
  projectId: PROJECT_ID,
});

export default async ({
  userid,
  presentationid,
}: {
  userid: string;
  presentationid: string;
}) => {
  const pubsubData = {
    userid,
    presentationid,
  };
  const dataBuffer = Buffer.from(JSON.stringify(pubsubData));
  let messageId;
  try {
    messageId = await pubSubClient
      .topic(TOPIC_NEW_PRESENTATION)
      .publish(dataBuffer);
    return messageId;
  } catch (e) {
    console.error(`Could not send message: ${e}`);
    throw new Error(e);
  }
};
