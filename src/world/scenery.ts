import type Phaser from 'phaser';
import { plantTrees } from './trees';
import type { WorldMap } from './zones';

/** The drawings of a tree, by the name each is loaded under. */
const TREES = ['araucaria_a', 'araucaria_b', 'araucaria_c'];

/** Fetches the trees' drawings; to be called while a scene is loading. */
export function loadScenery(scene: Phaser.Scene): void {
  for (const name of TREES) scene.load.image(name, `bosque/${name}.png`);
}

/** Stands a map's trees on it, each in front of whatever is further up the screen. */
export function drawTrees(scene: Phaser.Scene, map: WorldMap): Phaser.GameObjects.Image[] {
  return plantTrees(map, TREES.length).map(tree =>
    scene.add.image(tree.x, tree.y, TREES[tree.kind])
      .setOrigin(0.5, 1)
      .setScale(tree.size)
      .setFlipX(tree.flipped)
      .setDepth(tree.y));
}
