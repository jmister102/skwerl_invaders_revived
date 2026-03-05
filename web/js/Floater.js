// Floater.js — port of Floater.java
// Floating score/damage text that drifts upward.

let textColor = '#ffffff';
let textFont  = '12px monospace';

export function initFloater(color, font) {
  textColor = color;
  textFont  = font;
}

export class Floater {
  constructor(x, y, text, xMin, xMax, ySpeed, frames) {
    this.xpos       = x;
    this.ypos       = y;
    this.textString = text;
    this.xMin       = xMin;
    this.xMax       = xMax;
    this.ySpeed     = ySpeed;
    this.xSpeed     = 1;
    this.direction  = 1;
    this.frames     = frames;
    this.done       = false;
  }

  paint(ctx) {
    ctx.fillStyle = textColor;
    ctx.font      = textFont;
    ctx.fillText(this.textString, this.xpos, this.ypos);
  }

  update() {
    this.ypos += this.ySpeed;
    this.xpos += this.xSpeed;
    if (this.frames % 3 === 0) {
      this.xSpeed += this.direction;
      if (this.xSpeed === this.xMax)       this.direction = -1;
      else if (this.xSpeed === this.xMin)  this.direction =  1;
    }
    this.frames--;
    if (this.frames < 0) this.done = true;
  }
}
