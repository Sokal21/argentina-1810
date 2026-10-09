import type Phaser from 'phaser';
import { extent, zoneAt, type WorldMap } from './zones';

const TILE_W = 32, TILE_H = 16; // ground diamond, in sprite pixels
// A map is far wider than one picture may be, so its ground is painted in slabs.
const SLAB = 1024;
/** The country between the zones, too thick to cross. */
const THICKET = ['#161b14', '#141912', '#181d16', '#131711', '#191f17'];

/**
 * Paints a map's ground under everything else: a patchwork of diamonds, each
 * in the colours of the zone its middle lies in.
 */
export function drawGround(scene: Phaser.Scene, map: WorldMap): void {
  const { width, height } = extent(map);
  for (let top = 0; top < height; top += SLAB) {
    for (let left = 0; left < width; left += SLAB) {
      const w = Math.min(SLAB, width - left), h = Math.min(SLAB, height - top);
      const key = `ground:${map.name}:${left},${top}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, w, h)!;
      const g = tex.getContext();
      // Diamonds are counted from the map's corner, so they run on unbroken across slabs.
      const c0 = Math.floor(left / (TILE_W / 2)) - 1, c1 = Math.ceil((left + w) / (TILE_W / 2)) + 1;
      const r0 = Math.floor(top / (TILE_H / 2)) - 1, r1 = Math.ceil((top + h) / (TILE_H / 2)) + 1;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if ((r + c) % 2 === 0) continue;
          const wx = c * TILE_W / 2, wy = r * TILE_H / 2;
          const colours = zoneAt(map, wx, wy)?.ground ?? THICKET;
          const x = wx - left, y = wy - top;
          g.fillStyle = colours[Math.abs((c * 73856093) ^ (r * 19349663)) % colours.length];
          g.beginPath();
          g.moveTo(x, y - TILE_H / 2); g.lineTo(x + TILE_W / 2, y);
          g.lineTo(x, y + TILE_H / 2); g.lineTo(x - TILE_W / 2, y);
          g.fill();
        }
      }
      tex.refresh();
      scene.add.image(left, top, key).setOrigin(0, 0).setDepth(-1e6);
    }
  }
}
