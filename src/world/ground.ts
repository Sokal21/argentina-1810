import type Phaser from 'phaser';
import { PLOT_H, PLOT_W, WILD, type WorldMap } from './zones';

const TILE_W = 32, TILE_H = 16; // ground diamond, in sprite pixels
// A map is far too wide to paint whole. Each kind of ground is painted once,
// as a patch that repeats without a seam, and laid over the plots it covers.
const PATCH_W = 512, PATCH_H = 256;
const ACROSS = PATCH_W / (TILE_W / 2), DOWN = PATCH_H / (TILE_H / 2); // diamonds before it repeats
/** The country between the zones, too thick to cross. */
const THICKET = ['#161b14', '#141912', '#181d16', '#131711', '#191f17'];

// A patchwork of diamonds in the given colours, the same at each edge as at the one across.
function paintPatch(scene: Phaser.Scene, key: string, colours: string[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, PATCH_W, PATCH_H)!;
  const g = tex.getContext();
  for (let r = -1; r <= DOWN + 1; r++) {
    for (let c = -1; c <= ACROSS + 1; c++) {
      if ((r + c) % 2 === 0) continue;
      const x = c * TILE_W / 2, y = r * TILE_H / 2;
      const wc = (c + ACROSS) % ACROSS, wr = (r + DOWN) % DOWN;
      g.fillStyle = colours[Math.abs((wc * 73856093) ^ (wr * 19349663)) % colours.length];
      g.beginPath();
      g.moveTo(x, y - TILE_H / 2); g.lineTo(x + TILE_W / 2, y);
      g.lineTo(x, y + TILE_H / 2); g.lineTo(x - TILE_W / 2, y);
      g.fill();
    }
  }
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
