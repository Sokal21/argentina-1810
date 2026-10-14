import type Phaser from 'phaser';
import { blow } from '../fx/wind';
import type { Footprint } from './footprint';
import type { Sight } from './sight';
import { plantTrees } from './trees';
import { extent, zoneAt, type WorldMap } from './zones';

/** The drawings of a tree, by the name each is loaded under. */
const TREES = ['araucaria_a', 'araucaria_b', 'araucaria_c'];
// The ground a trunk takes up, for a tree shown at its drawn size.
const TRUNK = { hw: 2.5, hh: 1.25 };
// A tree's crown is the upper part of its drawing; this share of it, from the top.
const CROWN = 0.55;
const FIGURE = 80;     // how tall someone standing behind a tree is, in sprite pixels
const THINNED = 0.35;  // how much is left of a tree that hides someone
const THINNING = 8;    // how fast it thins and fills in again, per second

// Where the light falls from. A thing's shadow is its own shape laid on the
// ground: each pixel of it lands this far across and down the screen for
// every pixel it stands above the foot.
const LIGHT = { across: 0.55, down: 0.22 };
const SHADE = '#06080a';
const SHADE_ALPHA = 0.4;

/** Fetches the trees' drawings; to be called while a scene is loading. */
export function loadScenery(scene: Phaser.Scene): void {
  for (const name of TREES) scene.load.image(name, `bosque/${name}.png`);
}

/**
 * Lays several drawings in one picture, each a frame of it under the name it had, so that
 * whatever is drawn from any of them can be drawn in one go: the graphics card is told of one
 * picture instead of being handed a new one at every change from one drawing to the next, which
 * on a phone was most of the cost of a frame. Drawings of one size are laid in a grid (the wind
 * counts on it); of different sizes, in a row. Others of any size (`loose`) can be laid in a row
 * under the grid. Says how many across and down the grid is, and how much of the picture's
 * height it takes.
 */
export function packed(scene: Phaser.Scene, key: string, names: string[], loose: string[] = []): { cols: number; rows: number; share: number } {
  const source = (name: string) => scene.textures.get(name).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const sources = names.map(source), extra = loose.map(source);
  const even = sources.every(s => s.width === sources[0].width && s.height === sources[0].height);
  const cols = even ? Math.ceil(Math.sqrt(names.length)) : names.length, rows = even ? Math.ceil(names.length / cols) : 1;
  const gridW = even ? sources[0].width * cols : sources.reduce((sum, s) => sum + s.width, 0);
  const gridH = even ? sources[0].height * rows : Math.max(...sources.map(s => s.height));
  const h = gridH + (extra.length ? Math.max(...extra.map(s => s.height)) : 0);
  if (!scene.textures.exists(key)) {
    const w = Math.max(gridW, extra.reduce((sum, s) => sum + s.width, 0));
    const tex = scene.textures.createCanvas(key, w, h)!;
    const g = tex.getContext();
    const lay = (name: string, s: HTMLImageElement | HTMLCanvasElement, x: number, y: number) => {
      g.drawImage(s, x, y);
      tex.add(name, 0, x, y, s.width, s.height);
    };
    let x = 0;
    names.forEach((name, i) => {
      const s = sources[i];
      if (even) lay(name, s, (i % cols) * s.width, Math.floor(i / cols) * s.height);
      else { lay(name, s, x, 0); x += s.width; }
    });
    x = 0;
    loose.forEach((name, i) => { lay(name, extra[i], x, gridH); x += extra[i].width; });
    tex.refresh();
  }
  return { cols, rows, share: gridH / h };
}

/** The shadow a drawing casts, and where in it the foot of the thing stands, as shares of its size. */
export interface Shadow { key: string; footX: number; footY: number }

// A drawing the other way round, made once. The wind slides a drawing's rows
// one way, so a tree is turned by drawing it turned, not by showing it turned.
export function mirrored(scene: Phaser.Scene, name: string): string {
  const key = `${name}:mirrored`;
  if (!scene.textures.exists(key)) {
    const source = scene.textures.get(name).getSourceImage() as HTMLImageElement;
    const tex = scene.textures.createCanvas(key, source.width, source.height)!;
    const g = tex.getContext();
    g.setTransform(-1, 0, 0, 1, source.width, 0);
    g.drawImage(source, 0, 0);
    tex.refresh();
  }
  return key;
}

// Lays a drawing's shape over on the ground, once; every tree drawn from it shares the picture.
export function castShadow(scene: Phaser.Scene, name: string, light = LIGHT): Shadow {
  const key = `shadow:${name}:${light.across}:${light.down}`;
  const source = scene.textures.get(name).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = source.width, h = source.height;
  const reach = light.across * h, drop = light.down * h;
  const width = Math.ceil(w + Math.abs(reach)), height = Math.ceil(Math.abs(drop)) + 1;
  // The foot of the trunk, in the shadow's own picture.
  const footX = w / 2 - Math.min(0, reach), footY = -Math.min(0, drop);
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, width, height)!;
    const g = tex.getContext();
    g.imageSmoothingEnabled = false;
    // A pixel `up` above the foot and `out` from the trunk lands at foot + out + up * light.
    g.setTransform(1, 0, -light.across, -light.down, footX - w / 2 + reach, footY + drop);
    g.drawImage(source, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = SHADE;
    g.fillRect(0, 0, width, height);
    tex.refresh();
  }
  return { key, footX: footX / width, footY: footY / height };
}

/**
 * A map's trees, stood on it: each in front of whatever is further up the
 * screen, with its shadow on the ground under everything, and the wind in it.
 */
export class Forest {
  readonly trees: Phaser.GameObjects.Image[] = [];
  readonly shadows: Phaser.GameObjects.Image[] = [];
  /** The ground taken up by the trunk of each tree that stands where people walk. */
  readonly trunks: Footprint[] = [];

  /** @param sight what keeps the trees far from the camera out of the drawing; without it all are drawn */
  constructor(scene: Phaser.Scene, map: WorldMap, sight?: Sight) {
    for (const tree of plantTrees(map, TREES.length)) {
      const name = tree.flipped ? mirrored(scene, TREES[tree.kind]) : TREES[tree.kind];
      const shadow = castShadow(scene, name);
      this.shadows.push(scene.add.image(tree.x, tree.y, shadow.key)
        .setOrigin(shadow.footX, shadow.footY)
        .setScale(tree.size)
        .setAlpha(SHADE_ALPHA)
        .setDepth(-1e6 + 1));
      this.trees.push(scene.add.image(tree.x, tree.y, name)
        .setOrigin(0.5, 1)
        .setScale(tree.size)
        .setDepth(tree.y));
      if (zoneAt(map, tree.x, tree.y)) {
        const hh = TRUNK.hh * tree.size;
        this.trunks.push({ x: tree.x, y: tree.y - hh, hw: TRUNK.hw * tree.size, hh });
      }
    }
    blow(scene, this.trees, extent(map).width);
    sight?.add([...this.shadows, ...this.trees]);
  }

  /** Thins the trees whose crowns hide whoever stands at a spot, and fills the others in again. */
  reveal(at: { x: number; y: number }, dt: number): void {
    const step = THINNING * dt;
    for (const tree of this.trees) {
      // One out of sight keeps what it had, and goes on from there when it is seen again.
      if (!tree.visible) continue;
      const top = tree.y - tree.displayHeight;
      const hides = tree.y > at.y && Math.abs(at.x - tree.x) < tree.displayWidth / 2
        && at.y > top && at.y - FIGURE < top + tree.displayHeight * CROWN;
      const wanted = hides ? THINNED : 1;
      if (tree.alpha === wanted) continue;
      tree.setAlpha(wanted > tree.alpha ? Math.min(wanted, tree.alpha + step) : Math.max(wanted, tree.alpha - step));
    }
  }
}
