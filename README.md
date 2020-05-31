# slides2gif

Converts a Google Slide presentation to a gif.

## Requirements

To start this project, you need to install some dependencies.

```
brew install ffmpeg graphicsmagick
npm i gify fluent-ffmpeg
```

Then **Create Credentials > Create an OAuth Client**. Download. Name `credentials.json`.
- https://console.cloud.google.com/apis/credentials

Move these credentials to `~/.slides2gif.json`.

Enable the **Slides API**:
- https://console.cloud.google.com/apis/api/slides.googleapis.com/overview

Enable **Cloud Firestore** in _native mode_:
- https://firebase.google.com/docs/firestore/quickstart#node.js
- https://console.firebase.google.com/project/serverless-com-demo/database/firestore/data~2Fcredentials

Create **Cloud Pub/Sub** topic:
- `slides2gif`

Create a service account in the root of the dir. [Follow these instructions](https://cloud.google.com/docs/authentication/getting-started#creating_a_service_account).
- `creds.json`

```sh
export GOOGLE_APPLICATION_CREDENTIALS="creds.json"
```

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

## Notes

Global CLI setup via https://ourcodeworld.com/articles/read/393/how-to-create-a-global-module-for-node-js-properly


https://stackoverflow.com/questions/57650692/where-to-store-the-refresh-token-on-the-client
https://stackoverflow.com/questions/44324080/how-to-store-access-token-oauth-2-auth-code-flow
https://www.baeldung.com/spring-security-oauth2-remember-me

https://auth0.com/docs/login/spa/authenticate-with-cookies#dealing-with-invalid-or-missing-cookies