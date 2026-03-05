// StatedSprite.js — port of StatedSprite.java
// Extends Sprite with multi-state sprite animation.

import { Sprite } from './Sprite.js';
import { ImgObj } from './ImgObj.js';

export class StatedSprite extends Sprite {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.stateSprites   = null;   // ImgObj[]
    this.currentState   = 0;
    this.nextState      = 0;
    this.defaultState   = 0;
    this.numStates      = 0;
    this.currentFrame   = 0;
    this.action         = 0;
    this.frameCount     = 0;
  }

  initMain(numStates, defaultState) {
    this.numStates    = numStates;
    this.currentState = defaultState;
    this.defaultState = defaultState;
    this.nextState    = defaultState;
    this.stateSprites = new Array(numStates).fill(null);
  }

  initState(stateIdx, frames, frameDelay) {
    if (frames > 0) {
      this.stateSprites[stateIdx] = new ImgObj(frames, frameDelay);
    }
  }

  loadImage(img, frameIdx, stateIdx) {
    this.stateSprites[stateIdx].spriteImage[frameIdx] = img;
  }

  loadImages(extractor, stateIdx, y) {
    const s = this.stateSprites[stateIdx];
    for (let i = 0; i < s.frames; i++) {
      s.spriteImage[i] = extractor.extractImage(i * this.width, y, this.width, this.height);
    }
  }

  setNewState(state) {
    this.currentFrame = 0;
    this.frameCount   = 0;
    this.currentState = state;
  }

  paint(ctx) {
    if (!this.visible) return;
    const s = this.stateSprites[this.currentState];
    if (!s) return;
    const img = s.spriteImage[this.currentFrame];
    if (img) ctx.drawImage(img, this.xpos, this.ypos);
  }

  update() {
    const s = this.stateSprites[this.currentState];
    if (!s || s.frameDelay === -1) return;
    this.frameCount++;
    if (this.frameCount >= s.frameDelay) {
      this.frameCount = 0;
      this.currentFrame++;
      if (this.currentFrame === s.frames) {
        this.currentFrame = 0;
        this.action       = this.currentState;
        this.currentState = this.nextState;
        if (this.defaultState !== -1) this.nextState = this.defaultState;
      }
    }
  }
}
