// GifButton.js — port of GifButton.java

let anyHovering = false;

export class GifButton {
  // Text-label button (no image)
  static text(x, y, w, h, font, normalColor, hoverColor, label) {
    const b = new GifButton();
    b.xpos = x; b.ypos = y; b.width = w; b.height = h;
    b.font = font; b.normalColor = normalColor; b.hoverColor = hoverColor;
    b.label = label; b.hasGif = false;
    return b;
  }

  // Image button (normal / hover / disabled OffscreenCanvas)
  static image(x, y, w, h, normal, hover, disabled) {
    const b = new GifButton();
    b.xpos = x; b.ypos = y; b.width = w; b.height = h;
    b.normalGif = normal; b.hoverGif = hover; b.disabledGif = disabled;
    b.hasGif = true;
    return b;
  }

  constructor() {
    this.xpos = 0; this.ypos = 0; this.width = 0; this.height = 0;
    this.enabled  = false;
    this.hovering = false;
    this.clicked  = false;
    this.hotKey   = '\0';
    this.hasGif   = false;
    this.label    = '';
    this.font     = '16px serif';
    this.normalColor   = '#0000ff';
    this.hoverColor    = '#ff0000';
    this.normalGif     = null;
    this.hoverGif      = null;
    this.disabledGif   = null;
  }

  enable()  { this.enabled = true;  }
  disable() { this.enabled = false; }
  setHotKey(k) { this.hotKey = k.toUpperCase(); }

  checkClick(x, y) {
    if (this.enabled && x >= this.xpos && x <= this.xpos + this.width
                     && y >= this.ypos && y <= this.ypos + this.height) {
      this.clicked = true;
      return true;
    }
    return false;
  }

  checkHover(x, y) {
    if (this.enabled && x > this.xpos && x < this.xpos + this.width
                     && y > this.ypos && y < this.ypos + this.height) {
      this.hovering = true;
      anyHovering = true;
    } else {
      this.hovering = false;
    }
  }

  checkKey(key) {
    if (key.toUpperCase() === this.hotKey && this.enabled) {
      this.clicked = true;
      return true;
    }
    return false;
  }

  paint(ctx) {
    if (this.hasGif) {
      const img = !this.enabled ? this.disabledGif
                : this.hovering  ? this.hoverGif
                :                  this.normalGif;
      if (img) ctx.drawImage(img, this.xpos, this.ypos);
    } else {
      ctx.fillStyle = !this.enabled ? '#808080'
                    : this.hovering  ? this.hoverColor
                    :                  this.normalColor;
      ctx.font = this.font;
      ctx.fillText(this.label, this.xpos, this.ypos + this.height);
    }
  }

  static getHovering()         { return anyHovering; }
  static setHovering(b)        { anyHovering = b; }
  static resetHovering()       { anyHovering = false; }
}
