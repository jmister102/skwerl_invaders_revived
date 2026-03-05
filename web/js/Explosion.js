// Explosion.js — port of Explosion.java
// Static pool of explosion animations.

import { playClip, EXPLOSION } from './SoundManager.js';

const EXPLOSION_Y       = 128;
const EXPLOSION_WIDTH   = 16;
const EXPLOSION_HEIGHT  = 16;
const EXPLOSION_FRAMES  = 6;
const EXPLOSION_DELAY   = 1;
const EXPLOSION_W2      = 8;
const EXPLOSION_H2      = 8;

let xpos         = null;
let ypos         = null;
let currentFrame = null;
let frameNum     = null;
let maxExplosions = 0;
let expFrames    = null;  // OffscreenCanvas[] — 6 frames of the explosion sprite

export function initExplosion(extractor, max) {
  maxExplosions = max;
  xpos         = new Int32Array(max);
  ypos         = new Int32Array(max);
  currentFrame = new Int32Array(max);
  frameNum     = new Int32Array(max);
  // Load 6 frames from the sprite sheet row y=128, each 16×16
  expFrames = [];
  for (let i = 0; i < EXPLOSION_FRAMES; i++) {
    expFrames.push(extractor.extractImage(i * EXPLOSION_WIDTH, EXPLOSION_Y, EXPLOSION_WIDTH, EXPLOSION_HEIGHT));
  }
}

export function addExplosion(px, py) {
  const ax = px - EXPLOSION_W2;
  const ay = py - EXPLOSION_H2;
  playClip(EXPLOSION);
  // Shift pool: oldest out, newest in at the end
  for (let i = 0; i < maxExplosions - 1; i++) {
    xpos[i] = xpos[i + 1];
    ypos[i] = ypos[i + 1];
    currentFrame[i] = currentFrame[i + 1];
    frameNum[i]     = frameNum[i + 1];
  }
  const t = maxExplosions - 1;
  xpos[t] = ax;
  ypos[t] = ay;
  currentFrame[t] = 0;
  frameNum[t]     = 0;
}

export function paintExplosions(ctx) {
  for (let i = 0; i < maxExplosions; i++) {
    if (xpos[i] !== 0) {
      const frame = expFrames[currentFrame[i]];
      if (frame) ctx.drawImage(frame, xpos[i], ypos[i]);
    }
  }
}

export function updateExplosions() {
  for (let i = 0; i < maxExplosions; i++) {
    if (xpos[i] !== 0) {
      frameNum[i]++;
      if (frameNum[i] >= EXPLOSION_DELAY) {
        frameNum[i] = 0;
        currentFrame[i]++;
        if (currentFrame[i] === EXPLOSION_FRAMES) {
          // Remove: shift earlier entries up (matches Java logic)
          let t = i;
          while (t > 0) {
            xpos[t] = xpos[t - 1];
            ypos[t] = ypos[t - 1];
            currentFrame[t] = currentFrame[t - 1];
            frameNum[t]     = frameNum[t - 1];
            t--;
          }
          xpos[0] = 0;
        }
      }
    }
  }
}
