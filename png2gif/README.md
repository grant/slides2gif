# slides2gif png2gif

Creates a GIF given a list of URLs to images.

## createGif

Expects the request to have all components needed to create a GIF.

```ts
export interface CreateGIFRequestOptions {
  inputFrameGlobString?: string;
  gifOptions: {
    repeat?: number;
    delay?: number;
    quality?: number;
  };
  outputGifFilename?: string;
}
```

## Local Development Requirements

To start this service, you need to install some dependencies.

```
brew install ffmpeg graphicsmagick
npm i gify fluent-ffmpeg
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