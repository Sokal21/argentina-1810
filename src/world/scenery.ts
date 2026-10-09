import type Phaser from 'phaser';
import { plantTrees } from './trees';
import type { WorldMap } from './zones';

/** The drawings of a tree, by the name each is loaded under. */
const TREES = ['araucaria_a', 'araucaria_b', 'araucaria_c'];

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
 * Stands a map's trees on it, each in front of whatever is further up the
 * screen, with its shadow on the ground under everything.
 */
export function drawTrees(scene: Phaser.Scene, map: WorldMap): {
  trees: Phaser.GameObjects.Image[];
  shadows: Phaser.GameObjects.Image[];
} {
  const trees: Phaser.GameObjects.Image[] = [], shadows: Phaser.GameObjects.Image[] = [];
  for (const tree of plantTrees(map, TREES.length)) {
    const name = TREES[tree.kind], shadow = castShadow(scene, name, tree.flipped);
    shadows.push(scene.add.image(tree.x, tree.y, shadow.key)
      .setOrigin(shadow.footX, shadow.footY)
      .setScale(tree.size)
      .setAlpha(SHADE_ALPHA)
      .setDepth(-1e6 + 1));
    trees.push(scene.add.image(tree.x, tree.y, name)
      .setOrigin(0.5, 1)
      .setScale(tree.size)
      .setFlipX(tree.flipped)
      .setDepth(tree.y));
  }
  return { trees, shadows };
}
