# slides2gif

Converts a Google Slide presentation to a gif.

## Services

- `auth`: A service that can request a auth token
- `png2gif`: A service that can download PNGs from Cloud Storage, generate a GIF, and upload the GIF to Cloud Storage

## User flow

- User goes to website
- Click "Get Slides"
- OAuth flow
  - Store refresh token on client
- View all Slides from user
- User clicks slide
  - Get frames from slide
  - Create GIF
  - Show GIF

## Requirements

To start this project, you need to install some dependencies.

```
brew install ffmpeg graphicsmagick
npm i gify fluent-ffmpeg
```

See: https://www.npmjs.com/package/canvas

## Run Setup Script

```sh
gcloud config set project "my-project"
PROJECT=$(gcloud config get-value core/project 2> /dev/null)

# Enable APIs
gcloud services enable slides.googleapis.com
gcloud services enable run.googleapis.com
# gcloud services enable firebase.googleapis.com
gcloud services enable firestore.googleapis.com

# Create a service account for using the Firebase Database.
# See: https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating_service_account_keys
## Create service account
gcloud iam service-accounts create my-service-account
## Create creds for service account
gcloud iam service-accounts keys create creds.json \
--iam-account my-service-account@${PROJECT}.iam.gserviceaccount.com
export GOOGLE_APPLICATION_CREDENTIALS="creds.json"

# Create a Pub/Sub topic
gcloud pubsub topics create topic_new_presentation

# Create a bucket
gsutil mb gs://slides2gif-upload-test

# Login with ADC
gcloud auth application-default login
```

### Create OAuth 2.0 Client ID

A OAuth credential authorizes usage of Google Slides

https://console.cloud.google.com/apis/credentials

### Create a Cloud Firestore database

Enable **Cloud Firestore** in _native mode_, not Datastore Mode:
- https://firebase.google.com/docs/firestore/quickstart#node.js
- https://console.firebase.google.com/project/serverless-com-demo/database/firestore/data~2Fcredentials

https://firebase.google.com/docs/firestore/quickstart#create

## Test

Convert png to mp4 using [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg):

```js
var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg()
  .addInput('frame1.png')
  .addInput('frame2.png')
  ...
  .fps(29.7)
  .videoSize('640x480')
  .on('error', function(err) {
    console.log('An error occurred: ' + err.message);
  })
  .on('end', function() {
    console.log('Processing finished !');
  })
  .save('output.mp4');

```

Then convert the mp4 to gif:

```js
var gify = require('gify');

gify('video.mp4', 'out.gif', function(err){
	  if (err) throw err;
});
```

## Notice

Using the Google Slides API to create thumbnails is expensive and has limits.

See [limits](https://developers.google.com/slides/limits).
- 500 per project per 100 seconds
- 100 per user per 100 seconds

## Build

```
npm run build
npm i -g .
```

## Auth

Requires OAuth creds

See: https://console.cloud.google.com/apis/credentials/consent
- OAuth consent screen: User Type: External
- App name: slides2gif

Create a Client ID for Web App:
- Authorized redirect URIs:
  - https://slides2gif-*.run.app/oauth2callback
  - https://localhost:8080/oauth2callback

## Notes

Global CLI setup via https://ourcodeworld.com/articles/read/393/how-to-create-a-global-module-for-node-js-properly


https://stackoverflow.com/questions/57650692/where-to-store-the-refresh-token-on-the-client
https://stackoverflow.com/questions/44324080/how-to-store-access-token-oauth-2-auth-code-flow
https://www.baeldung.com/spring-security-oauth2-remember-me

https://auth0.com/docs/login/spa/authenticate-with-cookies#dealing-with-invalid-or-missing-cookies