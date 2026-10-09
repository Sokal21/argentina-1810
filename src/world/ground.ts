import type Phaser from 'phaser';
import { paintGrass } from './grass';
import { extent, type WorldMap } from './zones';

// A map is far too wide to paint whole: its ground is painted once, as a
// patch that repeats without a seam, and laid over all of it.
const PATCH_W = 512, PATCH_H = 256;

/** Lays a map's ground under everything else. */
export function drawGround(scene: Phaser.Scene, map: WorldMap): void {
  const key = `ground:${map.name}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, PATCH_W, PATCH_H)!;
  const picture = tex.getContext().createImageData(PATCH_W, PATCH_H);
  picture.data.set(paintGrass(PATCH_W, PATCH_H, map.ground));
  tex.getContext().putImageData(picture, 0, 0);
  tex.refresh();

  const { width, height } = extent(map);
  scene.add.tileSprite(0, 0, width, height, key).setOrigin(0, 0).setDepth(-1e6);
}
