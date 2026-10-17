import Phaser from 'phaser';

// Someone's shadow as their own shape laid on the ground, as the plants' are, instead of a dark
// oval: each frame they are drawn in is laid over on the ground once, the way the light falls,
// and whatever frame they are in, its shadow is shown under them.

const LIGHT = { across: 0.6, down: -0.12 };   // as on the plants of open country
const SHADE = '#06080a';
const ALPHA = 0.3;

interface Laid { key: string; footX: number; footY: number }
const laid = new Map<string, Laid>();

// One frame laid over on the ground, the way it faces; made once.
function lay(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): Laid {
  const frame = sprite.frame, flip = sprite.flipX;
  const id = `sombra:${frame.texture.key}:${frame.name}:${flip ? 1 : 0}`;
  const had = laid.get(id);
  if (had) return had;
  const w = frame.cutWidth, h = frame.cutHeight;
  // Where the feet are in the frame, as the sprite is drawn (mirrored, if it is).
  const ox = flip ? w - sprite.displayOriginX : sprite.displayOriginX, oy = sprite.displayOriginY;
  // A pixel `up` above the feet and `out` from them lands at feet + out + up * light: its place,
  // with the feet at the origin, for each corner of the frame, gives the size of what is laid.
  const place = (x: number, y: number) => [x - ox + (oy - y) * LIGHT.across, (oy - y) * LIGHT.down] as const;
  const corners = [place(0, 0), place(w, 0), place(0, h), place(w, h)];
  const minX = Math.min(...corners.map(c => c[0])), maxX = Math.max(...corners.map(c => c[0]));
  const minY = Math.min(...corners.map(c => c[1])), maxY = Math.max(...corners.map(c => c[1]));
  const footX = 1 - minX, footY = 1 - minY;
  const width = Math.ceil(maxX - minX) + 2, height = Math.ceil(maxY - minY) + 2;
  const tex = scene.textures.createCanvas(id, width, height)!;
  const g = tex.getContext();
  g.imageSmoothingEnabled = false;
  // The source pixel (sx, sy), x mirrored if it is: x' = footX + x - ox + (oy - y)·across, y' = footY + (oy - y)·down.
  const e = footX - ox + oy * LIGHT.across, f = footY + oy * LIGHT.down;
  g.setTransform(flip ? -1 : 1, 0, -LIGHT.across, -LIGHT.down, flip ? e + w : e, f);
  g.drawImage(frame.source.image as HTMLImageElement, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = SHADE;
  g.fillRect(0, 0, width, height);
  tex.refresh();
  const made = { key: id, footX: footX / width, footY: footY / height };
  laid.set(id, made);
  return made;
}

// How far either side a column of the drawing looks for where the ground is under it: a roof that
// overhangs its wheel is laid from where the wheel stands, not from its own lower edge in the air.
const REACH = 22;

// One frame laid over on the ground for something that stands on it at many points at once (a cart:
// hooves, wheels, a drover's feet), each at its own height in the picture. Each column of it is laid
// from where the ground is under that column, so every part's shadow starts where that part stands,
// and nothing hangs in the air. Made once.
function layStanding(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): Laid {
  const frame = sprite.frame, flip = sprite.flipX;
  const id = `sombra-pie:${frame.texture.key}:${frame.name}:${flip ? 1 : 0}`;
  const had = laid.get(id);
  if (had) return had;
  const w = frame.cutWidth, h = frame.cutHeight;
  const ox = flip ? w - sprite.displayOriginX : sprite.displayOriginX, oy = sprite.displayOriginY;
  // The frame as it is shown, to read its pixels.
  const read = document.createElement('canvas');
  read.width = w; read.height = h;
  const rg = read.getContext('2d')!;
  if (flip) rg.setTransform(-1, 0, 0, 1, w, 0);
  rg.drawImage(frame.source.image as HTMLImageElement, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
  const src = rg.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => src[(y * w + x) * 4 + 3] > 128;
  // The lowest pixel of each column, and from it the ground under each: the lowest near it.
  const bottom = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (solid(x, y)) { bottom[x] = y; break; }
  const ground = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    if (bottom[x] < 0) continue;
    let g = -1;
    for (let k = Math.max(0, x - REACH); k <= Math.min(w - 1, x + REACH); k++) g = Math.max(g, bottom[k]);
    ground[x] = g;
  }
  // Where each pixel lands, with the feet at the origin; and so how large the shadow is.
  const spots: number[] = [];
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  for (let x = 0; x < w; x++) {
    if (ground[x] < 0) continue;
    for (let y = 0; y <= ground[x]; y++) {
      if (!solid(x, y)) continue;
      const up = ground[x] - y;
      const px = Math.round(x - ox + up * LIGHT.across), py = Math.round(ground[x] - oy + up * LIGHT.down);
      spots.push(px, py);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  }
  const width = maxX - minX + 3, height = maxY - minY + 3;
  const tex = scene.textures.createCanvas(id, width, height)!;
  const g = tex.getContext();
  const out = g.createImageData(width, height);
  const [r, gr, b] = [6, 8, 10];
  for (let i = 0; i < spots.length; i += 2) {
    const at = ((spots[i + 1] - minY + 1) * width + (spots[i] - minX + 1)) * 4;
    out.data[at] = r; out.data[at + 1] = gr; out.data[at + 2] = b; out.data[at + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  tex.refresh();
  const made = { key: id, footX: (1 - minX) / width, footY: (1 - minY) / height };
  laid.set(id, made);
  return made;
}

export class Silhouettes {
  private shadows = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Image>();
  constructor(private scene: Phaser.Scene) {}

  /** Lays the shadow of someone drawn as `sprite`, standing at `feet`; or puts it away. Something that
   *  stands on the ground at many points (`standing`) is laid column by column from where each stands. */
  cast(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, feet: { x: number; y: number } | null, standing = false): void {
    let shadow = this.shadows.get(sprite);
    if (!feet || !sprite.visible || sprite.alpha < 0.05) { shadow?.setVisible(false); return; }
    const l = standing ? layStanding(this.scene, sprite) : lay(this.scene, sprite);
    if (!shadow) {
      shadow = this.scene.add.image(0, 0, l.key).setAlpha(ALPHA).setDepth(-1e6 + 2.5);
      this.shadows.set(sprite, shadow);
    }
    if (shadow.texture.key !== l.key) shadow.setTexture(l.key);
    shadow.setOrigin(l.footX, l.footY).setScale(sprite.scaleX, sprite.scaleY).setPosition(Math.round(feet.x), Math.round(feet.y)).setVisible(true);
  }
}
