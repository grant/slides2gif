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