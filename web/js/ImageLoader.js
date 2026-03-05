// ImageLoader.js — replaces ImageExtractor + MediaTracker
// Uses OffscreenCanvas to slice sprite sheets, with black→transparent keying.

export class ImageExtractor {
  constructor(htmlImage, width, height) {
    // Draw full sprite sheet to an offscreen canvas for pixel access
    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(htmlImage, 0, 0);
    this.width = width;
    this.height = height;
  }

  // Returns an OffscreenCanvas containing the extracted sub-sprite.
  // Black pixels (0,0,0) become fully transparent — matching Java behavior.
  extractImage(x, y, w, h) {
    const src = this.canvas.getContext('2d').getImageData(x, y, w, h);
    const d = src.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0) d[i + 3] = 0;
    }
    const out = new OffscreenCanvas(w, h);
    out.getContext('2d').putImageData(src, 0, 0);
    return out;
  }
}

// Load a list of image URLs, resolve when all are ready.
export function loadImages(urls) {
  const promises = Object.entries(urls).map(([key, url]) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve([key, img]);
      img.onerror = () => { console.warn(`Failed to load ${url}`); resolve([key, null]); };
      img.src = url;
    })
  );
  return Promise.all(promises).then(pairs =>
    Object.fromEntries(pairs)
  );
}
