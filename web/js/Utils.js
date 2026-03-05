// Utils.js — port of Utils.java

export function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function centerString(ctx, color, text, font, width, y) {
  ctx.font = font;
  ctx.fillStyle = color;
  const w = ctx.measureText(text).width;
  ctx.fillText(text, (width - w) / 2, y);
}

export function clearCanvas(ctx, color, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

// "a" vs "an" helper (ported from Utils.AN)
export function an(str) {
  const up = str.toUpperCase();
  const c1 = up[0], c2 = up[1];
  const vowels = 'AEIOU';
  const anFirst = 'FHLMNRSXAEIOU';
  if (c2 >= 'A' && c2 <= 'Z') {
    return (vowels.includes(c1) ? 'an ' : 'a ') + str;
  }
  return (anFirst.includes(c1) ? 'an ' : 'a ') + str;
}

// Java Color to CSS color string
export function javaColorToCSS(r, g, b, a = 255) {
  return `rgba(${r},${g},${b},${a / 255})`;
}

// Named Java colors used in the game
export const Color = {
  black:      '#000000',
  white:      '#ffffff',
  red:        '#ff0000',
  green:      '#00ff00',
  blue:       '#0000ff',
  yellow:     '#ffff00',
  cyan:       '#00ffff',
  magenta:    '#ff00ff',
  orange:     '#ffa500',
  gray:       '#808080',
  darkGray:   '#404040',
  lightGray:  '#c0c0c0',
  rgb: (r, g, b) => `rgb(${r},${g},${b})`,
};

// Java-style font strings → CSS font strings
export function javaFont(name, style, size) {
  // style: 0=plain, 1=bold, 2=italic, 3=bold+italic
  const weight = (style & 1) ? 'bold' : 'normal';
  const slant  = (style & 2) ? 'italic' : 'normal';
  return `${slant} ${weight} ${size}px ${name}, monospace`;
}
