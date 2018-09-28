# slides2gif

Converts a Google Slide presentation to a gif.

## Requirements

```
brew install ffmpeg graphicsmagick
yarn add gify fluent-ffmpeg
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