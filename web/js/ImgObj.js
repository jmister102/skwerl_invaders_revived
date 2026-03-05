// ImgObj.js — port of ImgObj.java
// Holds an array of OffscreenCanvas frames for one animation state.

export class ImgObj {
  constructor(frames, frameDelay) {
    this.frames      = frames;       // number of animation frames
    this.frameDelay  = frameDelay;   // ticks between frames (-1 = static)
    this.spriteImage = new Array(frames).fill(null);  // OffscreenCanvas[]
  }

  createImage(img, index) {
    this.spriteImage[index] = img;
  }

  // Load sequential frames from a sprite sheet row.
  // extractor: ImageExtractor, y: row offset, frameW/frameH: frame size
  loadImages(extractor, y, frameW, frameH) {
    for (let i = 0; i < this.frames; i++) {
      this.spriteImage[i] = extractor.extractImage(i * frameW, y, frameW, frameH);
    }
  }
}
