// Sprite.js — port of Sprite.java (abstract base)

export class Sprite {
  constructor(x, y, w, h) {
    this.xpos    = x;
    this.ypos    = y;
    this.width   = w;
    this.height  = h;
    this.visible = false;
    this.active  = false;
  }

  enable()  { this.visible = true;  this.active = true;  }
  disable() { this.visible = false; this.active = false; }

  isActive()  { return this.active;  }
  isVisible() { return this.visible; }

  getX() { return this.xpos;   }
  getY() { return this.ypos;   }
  getW() { return this.width;  }
  getH() { return this.height; }

  setActive(b)  { this.active  = b; }
  setVisible(b) { this.visible = b; }

  setPosition(x, y) {
    if (this.xpos !== -1) this.xpos = x;
    if (this.ypos !== -1) this.ypos = y;
  }

  translate(dx, dy) {
    this.xpos += dx;
    this.ypos += dy;
  }

  // Subclasses must implement:
  paint(ctx) {}
}
