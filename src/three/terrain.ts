import { ISO_Y } from '../machi/data';
import { chance } from '../world/chance';
import { DEEP, SHALLOW, WET, waterLevels } from '../world/water';
import { extent, letterAt, middle, PLOT_H, PLOT_W, type WorldMap } from '../world/zones';

// The lie of the land, for the eye only: the game still walks a flat map (zones.ts), and nobody
// is slowed or stopped by a slope. Where people walk the ground hardly rolls; where nobody does it
// rises into low hills from the edge of what is walked; the stream runs in a bed sunk below the
// banks, the ford shallow enough to wade, and the ground is levelled under every building.
// Heights are in world units, up; Cabral stands 82.

/** How far apart the heights are reckoned, in the 3D ground's units, each way. */
export const CELL = 32;
/** The rise of the hills where nobody walks, and how far from what is walked they take to rise. */
const HILLS = { tall: 30, rise: 110, across: 260 };
/** How much the walked ground rolls: never below the ground, so it holds no puddles. */
const ROLL = { tall: 3, across: 340 };
/** Below the ground: the stream's bed, its banks' width, the ford and the marsh. */
const BED = { deep: 16, bank: 40, ford: 4, marsh: 0.8 };
/** Where the water stands: above the ford's bed (to his ankles) and below every bank. */
export const WATER_LEVEL = -2.5;
/** How many times the heights are smoothed, and how far round a building the ground is levelled. */
const SMOOTHING = 2, PAD = 12;

/** Smooth noise from 0 to 1, about `across` units from one swell to the next. */
function swell(x: number, z: number, across: number, seed: number): number {
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
  /** Whether a point is walked (it touches a plot that is), and whether only through the ford. */
  const walkedAt = (i: number, j: number) => {
    const plots = touching(i, j).filter(p => letterAt(map, p.col, p.row) !== undefined);
    return { walked: plots.length > 0, fording: plots.length > 0 && plots.every(p => water[p.row][p.col] >= SHALLOW) };
  };

  // What is walked, and how far every point that is not lies from what is (a chamfer distance).
  const walked = new Uint8Array(n), far = new Float32Array(n).fill(Infinity);
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    if (walkedAt(i, j).walked) { walked[index(i, j)] = 1; far[index(i, j)] = 0; }
  }
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

  const heights = new Float32Array(n);
  const s = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const k = index(i, j), x = i * CELL, z = j * CELL;
    const { col, row } = plotOf(i, j), level = water[row][col];
    if (walked[k]) {
      // Walked: it rolls a little, and the ford and the marsh lie a little below it.
      const below = walkedAt(i, j).fording ? BED.ford : level >= WET && level < SHALLOW ? BED.marsh : 0;
      heights[k] = ROLL.tall * swell(x, z, ROLL.across, 11) - below;
    } else if (level >= DEEP) {
      // The stream: down from the bank to its bed.
      heights[k] = -BED.deep * s(0, BED.bank, far[k]);
    } else {
      // Country nobody crosses: rising from the edge of what is walked into low hills.
      heights[k] = HILLS.tall * (0.35 + 0.65 * swell(x, z, HILLS.across, 23)) * s(0, HILLS.rise, far[k]);
    }
  }

  // Level under each building, to the height at its front, and a little round it.
  for (const b of map.buildings ?? []) {
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
    const { fording } = walkedAt(i, j);
    heights[k] = fording ? Math.min(-1, Math.max(-BED.ford - 1, heights[k])) : Math.min(ROLL.tall + 1, Math.max(0, heights[k]));
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
