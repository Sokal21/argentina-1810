import type Phaser from 'phaser';
import type { Footprint } from './footprint';
import { plantTrees } from './trees';
import { zoneAt, type WorldMap } from './zones';

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

/** The shadow a drawing casts, and where in it the foot of the thing stands, as shares of its size. */
interface Shadow { key: string; footX: number; footY: number }

// Lays a drawing's shape over on the ground, once; every tree drawn from it shares the picture.
function castShadow(scene: Phaser.Scene, name: string, flipped: boolean): Shadow {
  const key = `shadow:${name}:${flipped ? 'flipped' : 'drawn'}`;
  const source = scene.textures.get(name).getSourceImage() as HTMLImageElement;
  const w = source.width, h = source.height;
  const reach = LIGHT.across * h, drop = LIGHT.down * h;
  const width = Math.ceil(w + Math.abs(reach)), height = Math.ceil(Math.abs(drop)) + 1;
  // The foot of the trunk, in the shadow's own picture.
  const footX = w / 2 - Math.min(0, reach), footY = -Math.min(0, drop);
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, width, height)!;
    const g = tex.getContext();
    g.imageSmoothingEnabled = false;
    // A pixel `up` above the foot and `out` from the trunk lands at foot + out + up * light.
    const side = flipped ? -1 : 1;
    g.setTransform(side, 0, -LIGHT.across, -LIGHT.down, footX - side * w / 2 + reach, footY + drop);
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
 * screen, with its shadow on the ground under everything.
 */
export class Forest {
  readonly trees: Phaser.GameObjects.Image[] = [];
  readonly shadows: Phaser.GameObjects.Image[] = [];
  /** The ground taken up by the trunk of each tree that stands where people walk. */
  readonly trunks: Footprint[] = [];

  constructor(scene: Phaser.Scene, map: WorldMap) {
    for (const tree of plantTrees(map, TREES.length)) {
      const name = TREES[tree.kind], shadow = castShadow(scene, name, tree.flipped);
      this.shadows.push(scene.add.image(tree.x, tree.y, shadow.key)
        .setOrigin(shadow.footX, shadow.footY)
        .setScale(tree.size)
        .setAlpha(SHADE_ALPHA)
        .setDepth(-1e6 + 1));
      this.trees.push(scene.add.image(tree.x, tree.y, name)
        .setOrigin(0.5, 1)
        .setScale(tree.size)
        .setFlipX(tree.flipped)
        .setDepth(tree.y));
      if (zoneAt(map, tree.x, tree.y)) {
        const hh = TRUNK.hh * tree.size;
        this.trunks.push({ x: tree.x, y: tree.y - hh, hw: TRUNK.hw * tree.size, hh });
      }
    }
  }

  /** Thins the trees whose crowns hide whoever stands at a spot, and fills the others in again. */
  reveal(at: { x: number; y: number }, dt: number): void {
    const step = THINNING * dt;
    for (const tree of this.trees) {
      const top = tree.y - tree.displayHeight;
      const hides = tree.y > at.y && Math.abs(at.x - tree.x) < tree.displayWidth / 2
        && at.y > top && at.y - FIGURE < top + tree.displayHeight * CROWN;
      const wanted = hides ? THINNED : 1;
      if (tree.alpha === wanted) continue;
      tree.setAlpha(wanted > tree.alpha ? Math.min(wanted, tree.alpha + step) : Math.max(wanted, tree.alpha - step));
    }
  }
}
