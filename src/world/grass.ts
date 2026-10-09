import { chance } from './chance';

// The ground of a zone, painted by rule rather than drawn: broad quiet drifts
// of a few close colours, and here and there a tuft. It is the same at each
// edge as at the one across, so a patch of it repeats without a seam.

const DRIFT_W = 64, DRIFT_H = 32; // the broad drifts; twice as wide as tall, like the ground
const MOTTLE_W = 16, MOTTLE_H = 8; // the finer mottling over them, and one tuft at most in each
const TUFTS = 0.3;                 // share of those that hold a tuft
const DARK = 0.35;                 // share of tufts that are a shadow rather than a blade
const LIGHTER = 1.3, DARKER = 0.84; // a blade and a shadow, against the ground's own colours

type Rgb = [number, number, number];

const rgb = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const weight = ([r, g, b]: Rgb) => r * 0.3 + g * 0.59 + b * 0.11;
const scaled = (colour: Rgb, by: number) => colour.map(v => Math.min(255, Math.round(v * by))) as Rgb;

// A value that drifts smoothly from cell to cell, and comes round again after `cols` by `rows` of them.
function drift(x: number, y: number, cw: number, ch: number, cols: number, rows: number, seed: number): number {
  const fx = x / cw, fy = y / ch, x0 = Math.floor(fx), y0 = Math.floor(fy);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const tx = ease(fx - x0), ty = ease(fy - y0);
  const at = (i: number, j: number) => chance(i % cols, j % rows, seed);
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
  return top + (bottom - top) * ty;
}

/**
 * A patch of ground in the given colours, as the bytes of a picture: red,
 * green, blue and opacity for each pixel, row by row. Its width and height
 * must be whole numbers of drifts.
 */
export function paintGrass(width: number, height: number, colours: string[], seed = 1): Uint8ClampedArray {
  const shades = colours.map(rgb).sort((a, b) => weight(a) - weight(b));
  const blade = scaled(shades[shades.length - 1], LIGHTER), shadow = scaled(shades[0], DARKER);
  const data = new Uint8ClampedArray(width * height * 4);
  const put = (x: number, y: number, colour: Rgb) => {
    const i = (((y + height) % height) * width + ((x + width) % width)) * 4;
    data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2]; data[i + 3] = 255;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const broad = drift(x, y, DRIFT_W, DRIFT_H, width / DRIFT_W, height / DRIFT_H, seed);
      const fine = drift(x, y, MOTTLE_W, MOTTLE_H, width / MOTTLE_W, height / MOTTLE_H, seed + 1);
      // The two together crowd round the middle, so they are spread to reach every shade.
      const level = ((broad * 0.65 + fine * 0.35) - 0.5) * 2.2 + 0.5;
      put(x, y, shades[Math.max(0, Math.min(shades.length - 1, Math.floor(level * shades.length)))]);
    }
  }

  for (let row = 0; row < height / MOTTLE_H; row++) {
    for (let col = 0; col < width / MOTTLE_W; col++) {
      if (chance(col, row, seed + 2) >= TUFTS) continue;
      const x = col * MOTTLE_W + Math.floor(chance(col, row, seed + 3) * MOTTLE_W);
      const y = row * MOTTLE_H + Math.floor(chance(col, row, seed + 4) * MOTTLE_H);
      if (chance(col, row, seed + 5) < DARK) {
        put(x, y, shadow); put(x + 1, y, shadow); put(x + 2, y, shadow);
        continue;
      }
      // Three blades, the middle one tallest.
      put(x, y, blade);
      put(x + 2, y, blade); put(x + 2, y - 1, blade);
      put(x + 4, y, blade);
    }
  }
  return data;
}
