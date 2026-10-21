import * as THREE from 'three';
import { ISO_Y } from '../machi/data';
import { chance } from '../world/chance';
import { DEEP, SHALLOW, WET, waterLevels } from '../world/water';
import { extent, letterAt, middle, PLOT_H, PLOT_W, type WorldMap } from '../world/zones';
import { placed } from './buildings';

// The lie of the land, for the eye only: the game still walks a flat map (zones.ts), and nobody
// is slowed or stopped by a slope. Where people walk the ground hardly rolls; where nobody does it
// rises into low hills from the edge of what is walked; the stream runs in a bed sunk below the
// banks, the ford shallow enough to wade, and the ground is levelled under every building.
// Heights are in world units, up; Cabral stands 82. The hills and the water are far from where he
// arrives (the stream runs 35 plots north of it); where he walks the ground rolls in long swells.

/** How far apart the heights are reckoned, in the 3D ground's units, each way. */
export const CELL = 32;
/** The rise of the hills where nobody walks, and how far from what is walked they take to rise. */
const HILLS = { tall: 60, rise: 120, across: 280 };
/**
 * How much the walked ground rolls: in swells, never below the ground, so it holds no puddles.
 * At 3, and at 14 over 520, nothing was seen (a slope of 2°); the user asked for relief to be seen.
 */
const ROLL = { tall: 28, across: 320, shore: 220 };
/** Below the ground: the stream's bed, its banks' width, the ford and the marsh. */
const BED = { deep: 16, bank: 40, ford: 4, marsh: 0.8 };
/** The marsh's standing pools: sunk this far below the water, about this wide, in this share of it. */
const POOLS = { deep: 2.5, across: 110, share: 0.38 };
/** Where the water stands: above the ford's bed (to his ankles) and below every bank. */
export const WATER_LEVEL = -2.5;
/** How many times the heights are smoothed, and how far round a building the ground is levelled. */
const SMOOTHING = 2, PAD = 12;

/** Smooth noise from 0 to 1, about `across` units from one swell to the next. */
/** Noise like clouds: swells within swells, each half the size and half the strength of the last, from 0 to 1. */
export function clouds(x: number, z: number, across: number, seed: number, octaves = 5): number {
  let sum = 0, weight = 0, strength = 1;
  for (let o = 0; o < octaves; o++) {
    sum += swell(x, z, across, seed + o * 101) * strength;
    weight += strength;
    across /= 2;
    strength /= 2;
  }
  return sum / weight;
}

export function swell(x: number, z: number, across: number, seed: number): number {
  const u = x / across, v = z / across, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = chance(i, j, seed), b = chance(i + 1, j, seed), c = chance(i, j + 1, seed), d = chance(i + 1, j + 1, seed);
  return a + (b - a) * s(fu) + (c - a) * s(fv) + (a - b - c + d) * s(fu) * s(fv);
}

export interface Terrain {
  /** How high the ground stands at a spot of the 2D ground. */
  at(x: number, y: number): number;
  /** The heights reckoned, row by row from the top of the map: `cols + 1` by `rows + 1`, `CELL` apart. */
  readonly heights: Float32Array;
  readonly cols: number;
  readonly rows: number;
}

export function shapeTerrain(map: WorldMap): Terrain {
  const { width, height } = extent(map);
  const depth = height / ISO_Y;
  const cols = Math.ceil(width / CELL), rows = Math.ceil(depth / CELL);
  const n = (cols + 1) * (rows + 1), index = (i: number, j: number) => j * (cols + 1) + i;
  const water = waterLevels(map);
  const plotOf = (i: number, j: number) => ({
    col: Math.min(map.plots[0].length - 1, Math.floor((i * CELL) / PLOT_W)),
    row: Math.min(map.plots.length - 1, Math.floor((j * CELL * ISO_Y) / PLOT_H)),
  });
  /** The plots a point touches: one, or those on either side of an edge it lies on. */
  const touching = (i: number, j: number) => {
    const x = i * CELL, y = j * CELL * ISO_Y, found: { col: number; row: number }[] = [];
    for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) {
      const col = Math.floor((x + dx) / PLOT_W), row = Math.floor((y + dy) / PLOT_H);
      if (col >= 0 && row >= 0 && col < map.plots[0].length && row < map.plots.length) found.push({ col, row });
    }
    return found;
  };
  /** Whether a point is walked (it touches a plot that is), and whether only through the ford, or only the marsh. */
  const walkedAt = (i: number, j: number) => {
    const plots = touching(i, j).filter(p => letterAt(map, p.col, p.row) !== undefined);
    const all = (at: (level: number) => boolean) => plots.length > 0 && plots.every(p => at(water[p.row][p.col]));
    return { walked: plots.length > 0, fording: all(l => l >= SHALLOW), marsh: all(l => l >= WET && l < SHALLOW) };
  };

  /** How far every point lies from the nearest point that is so (a chamfer distance). */
  const distance = (so: (k: number) => boolean) => {
    const far = new Float32Array(n);
    for (let k = 0; k < n; k++) far[k] = so(k) ? 0 : Infinity;
    const D = CELL, DD = CELL * Math.SQRT2;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const k = index(i, j);
      if (i > 0) far[k] = Math.min(far[k], far[k - 1] + D);
      if (j > 0) far[k] = Math.min(far[k], far[k - cols - 1] + D);
      if (i > 0 && j > 0) far[k] = Math.min(far[k], far[k - cols - 2] + DD);
      if (i < cols && j > 0) far[k] = Math.min(far[k], far[k - cols] + DD);
    }
    for (let j = rows; j >= 0; j--) for (let i = cols; i >= 0; i--) {
      const k = index(i, j);
      if (i < cols) far[k] = Math.min(far[k], far[k + 1] + D);
      if (j < rows) far[k] = Math.min(far[k], far[k + cols + 1] + D);
      if (i < cols && j < rows) far[k] = Math.min(far[k], far[k + cols + 2] + DD);
      if (i > 0 && j < rows) far[k] = Math.min(far[k], far[k + cols] + DD);
    }
    return far;
  };
  // What is walked, and how far every point that is not lies from what is; and how far every point
  // lies from water (the ford, the stream), near which the ground flattens to its level.
  const walked = new Uint8Array(n), wet = new Uint8Array(n);
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const k = index(i, j);
    if (walkedAt(i, j).walked) walked[k] = 1;
    if (touching(i, j).some(p => water[p.row][p.col] >= WET)) wet[k] = 1;
  }
  const far = distance(k => walked[k] === 1), shore = distance(k => wet[k] === 1);

  const heights = new Float32Array(n);
  const s = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const k = index(i, j), x = i * CELL, z = j * CELL;
    const { col, row } = plotOf(i, j), level = water[row][col];
    if (walked[k]) {
      // Walked: it rolls a little, and the ford and the marsh lie a little below it.
      // In the marsh, here and there a pool sunk below the water.
      const { fording, marsh } = walkedAt(i, j);
      const pool = marsh && swell(x, z, POOLS.across, 51) > 1 - POOLS.share ? -WATER_LEVEL + POOLS.deep : 0;
      const below = fording ? BED.ford : marsh ? BED.marsh + pool : level >= WET && level < SHALLOW ? BED.marsh : 0;
      heights[k] = (fording ? 0 : ROLL.tall * swell(x, z, ROLL.across, 11) * s(0, ROLL.shore, shore[k])) - below;
    } else if (level >= DEEP) {
      // The stream: down from the bank to its bed.
      heights[k] = -BED.deep * s(0, BED.bank, far[k]);
    } else {
      // Country nobody crosses: rising from the edge of what is walked into low hills.
      heights[k] = HILLS.tall * (0.35 + 0.65 * swell(x, z, HILLS.across, 23)) * s(0, HILLS.rise, far[k]);
    }
  }

  // Level under each building, to the height at its front, and a little round it: a modelled one
  // all round where it stands (it is larger than its block), any other under its block.
  for (const b of map.buildings ?? []) {
    const model = placed(b);
    if (model) {
      const cx = model.x, cz = model.y / ISO_Y, r = Math.hypot(model.long, model.deep) / 2 + PAD;
      const at = heights[index(Math.round(cx / CELL), Math.round(cz / CELL))] ?? 0;
      for (let j = Math.max(0, Math.floor((cz - r) / CELL)); j <= Math.min(rows, Math.ceil((cz + r) / CELL)); j++) {
        for (let i = Math.max(0, Math.floor((cx - r) / CELL)); i <= Math.min(cols, Math.ceil((cx + r) / CELL)); i++) {
          if (Math.hypot(i * CELL - cx, j * CELL - cz) <= r) heights[index(i, j)] = at;
        }
      }
      continue;
    }
    const { x, y } = middle(b.plot), front = y / ISO_Y;
    const i0 = Math.floor((x - b.wide / 2 - PAD) / CELL), i1 = Math.ceil((x + b.wide / 2 + PAD) / CELL);
    const j0 = Math.floor((front - b.deep - PAD) / CELL), j1 = Math.ceil((front + PAD) / CELL);
    const at = heights[index(Math.round(x / CELL), Math.round(front / CELL))] ?? 0;
    for (let j = Math.max(0, j0); j <= Math.min(rows, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(cols, i1); i++) heights[index(i, j)] = at;
  }

  // Smoothed, so no step shows where one plot meets the next.
  const was = new Float32Array(n);
  for (let pass = 0; pass < SMOOTHING; pass++) {
    was.set(heights);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      let sum = 0, count = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii > cols || jj > rows) continue;
        sum += was[index(ii, jj)];
        count++;
      }
      heights[index(i, j)] = sum / count;
    }
  }
  // Smoothing spills the banks and the hills onto what is walked: it is kept to its own heights, and
  // the slopes are left on the side nobody walks.
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const k = index(i, j);
    if (!walked[k]) continue;
    const { fording, marsh } = walkedAt(i, j);
    heights[k] = fording ? Math.min(-1, Math.max(-BED.ford - 1, heights[k]))
      : Math.min(ROLL.tall + 1, Math.max(marsh ? WATER_LEVEL - POOLS.deep : 0, heights[k]));
  }

  return {
    heights, cols, rows,
    at(x: number, y: number): number {
      const u = Math.max(0, Math.min(cols, x / CELL)), v = Math.max(0, Math.min(rows, y / ISO_Y / CELL));
      const i = Math.min(cols - 1, Math.floor(u)), j = Math.min(rows - 1, Math.floor(v)), fu = u - i, fv = v - j;
      const a = heights[index(i, j)], b = heights[index(i + 1, j)], c = heights[index(i, j + 1)], d = heights[index(i + 1, j + 1)];
      return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
    },
  };
}

/**
 * The relief's heights as a picture, for shaders to read smoothly (the water, the grass), and how
 * to read it: a spot of the 3D ground `at` is `(at / span * (texels - 1) + 0.5) / texels`.
 */
export function heightPicture(terrain: Terrain): { lie: THREE.DataTexture; span: THREE.Vector2; texels: THREE.Vector2 } {
  const { cols, rows, heights } = terrain;
  const lie = new THREE.DataTexture(new Uint16Array(Array.from(heights, h => THREE.DataUtils.toHalfFloat(h))),
    cols + 1, rows + 1, THREE.RedFormat, THREE.HalfFloatType);
  lie.magFilter = lie.minFilter = THREE.LinearFilter;
  lie.needsUpdate = true;
  return { lie, span: new THREE.Vector2(cols * CELL, rows * CELL), texels: new THREE.Vector2(cols + 1, rows + 1) };
}
