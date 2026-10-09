import type Phaser from 'phaser';
import { paintGrass } from './grass';
import { PLOT_H, PLOT_W, WILD, type WorldMap } from './zones';

// A map is far too wide to paint whole. Each kind of ground is painted once,
// as a patch that repeats without a seam, and laid over the plots it covers.
const PATCH_W = 512, PATCH_H = 256;
/** The country between the zones, too thick to cross. */
const THICKET = ['#161b14', '#141912', '#181d16', '#131711', '#191f17'];

function paintPatch(scene: Phaser.Scene, key: string, colours: string[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, PATCH_W, PATCH_H)!;
  const picture = tex.getContext().createImageData(PATCH_W, PATCH_H);
  picture.data.set(paintGrass(PATCH_W, PATCH_H, colours));
  tex.getContext().putImageData(picture, 0, 0);
  tex.refresh();
}

/** Lays a map's ground under everything else, each plot in the colours of its zone. */
export function drawGround(scene: Phaser.Scene, map: WorldMap): void {
  const key = (letter: string) => `ground:${map.name}:${letter}`;
  paintPatch(scene, key(WILD), THICKET);
  for (const [letter, zone] of Object.entries(map.zones)) paintPatch(scene, key(letter), zone.ground);

  map.plots.forEach((line, row) => {
    // One strip for each run of plots of the same ground.
    for (let from = 0, to = 1; from < line.length; from = to++) {
      while (to < line.length && line[to] === line[from]) to++;
      const x = from * PLOT_W, y = row * PLOT_H;
      scene.add.tileSprite(x, y, (to - from) * PLOT_W, PLOT_H, key(line[from]))
        .setOrigin(0, 0)
        .setTilePosition(x % PATCH_W, y % PATCH_H) // the patches line up across strips
        .setDepth(-1e6);
    }
  });
}
