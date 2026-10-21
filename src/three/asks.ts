import * as THREE from 'three';

// The sign over someone in the 3D game who can be talked to: a small speech bubble of parchment
// with a dark question mark, drawn here pixel by pixel (16 by 18), ringed dark to read over
// anything, and seen through walls and roofs, since it says someone is in there to be talked to.

const W = 16, H = 18;
const PAPER = '#efe0b8', SHADE = '#c9b27e', INK = '#3a2614', EDGE = '#1c120a';
/** The question mark, row by row, within the bubble (1 is ink). */
const MARK = [
  '..1111..',
  '.11..11.',
  '.....11.',
  '....11..',
  '...11...',
  '...11...',
  '........',
  '...11...',
];

let drawn: THREE.CanvasTexture | null = null;

function picture(): THREE.CanvasTexture {
  if (drawn) return drawn;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const dot = (x: number, y: number, colour: string) => { g.fillStyle = colour; g.fillRect(x, y, 1, 1); };
  // The bubble: rounded, 14 by 13, its lower rows a shade darker; its tail below, to the left.
  for (let y = 1; y <= 13; y++) {
    for (let x = 1; x <= 14; x++) {
      const corner = (y === 1 || y === 13) && (x === 1 || x === 14);
      if (!corner) dot(x, y, y > 10 ? SHADE : PAPER);
    }
  }
  for (const [x, y] of [[4, 14], [5, 14], [4, 15]]) dot(x, y, SHADE);
  MARK.forEach((row, j) => [...row].forEach((c, i) => { if (c === '1') dot(4 + i, 3 + j, INK); }));
  // A dark pixel round all of it.
  const shape = g.getImageData(0, 0, W, H).data, filled = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && shape[(y * W + x) * 4 + 3] > 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!filled(x, y) && (filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1))) dot(x, y, EDGE);
    }
  }
  drawn = new THREE.CanvasTexture(canvas);
  drawn.magFilter = drawn.minFilter = THREE.NearestFilter;
  drawn.colorSpace = THREE.SRGBColorSpace;
  return drawn;
}

/** A sign that someone can be talked to, `size` units tall, to stand over their head. */
export function asks(size = 34): THREE.Sprite {
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: picture(), depthTest: false, depthWrite: false, transparent: true }));
  sign.scale.set(size * W / H, size, 1);
  sign.renderOrder = 20;
  return sign;
}
