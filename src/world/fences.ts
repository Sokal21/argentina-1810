import { chance } from './chance';
import { letterAt, PLOT_H, PLOT_W, type WorldMap, type Zone } from './zones';

// Where the fences run. A zone that people have fenced is closed along
// every side of a plot of it that looks onto ground nobody can cross; where
// it meets another zone it is left open, and that is its gate. Nothing is
// placed by hand: the fence follows the zone when its shape changes.

/** A stretch of fence along one side of a plot, from one end to the other, in world pixels. */
export interface Run {
  kind: NonNullable<Zone['fence']>;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** How far out from the edge of the zone a fence stands, in pixels. */
export const SET_BACK = 6;

/** Every stretch of fence on a map. */
export function fenceRuns(map: WorldMap): Run[] {
  const runs: Run[] = [];
  map.plots.forEach((line, row) => [...line].forEach((letter, col) => {
    const kind = map.zones[letter]?.fence;
    if (!kind) return;
    const left = col * PLOT_W, top = row * PLOT_H, right = left + PLOT_W, bottom = top + PLOT_H;
    const wild = (c: number, r: number) => letterAt(map, c, r) === undefined;
    // Stood a little way out, and each stretch reaching past its ends, so the corners close.
    const s = SET_BACK;
    if (wild(col, row - 1)) runs.push({ kind, x0: left - s, y0: top - s, x1: right + s, y1: top - s });
    if (wild(col, row + 1)) runs.push({ kind, x0: left - s, y0: bottom + s, x1: right + s, y1: bottom + s });
    if (wild(col - 1, row)) runs.push({ kind, x0: left - s, y0: top - s, x1: left - s, y1: bottom + s });
    if (wild(col + 1, row)) runs.push({ kind, x0: right + s, y0: top - s, x1: right + s, y1: bottom + s });
  }));
  return runs;
}

/** A stake of a fence: where its foot is, how tall it stands, and which of the drawings it is. */
export interface Stake { x: number; y: number; tall: number; which: number }

/** How far apart stakes stand along the ground, across the screen and up it. */
export const APART = { across: 5, up: 3 };

/** The stakes of every stretch of stake fence, the same each time for the same map. */
export function stakes(runs: Run[], seed = 1): Stake[] {
  const found = new Map<string, Stake>();
  for (const run of runs.filter(r => r.kind === 'stakes')) {
    const level = run.y0 === run.y1;
    const step = level ? APART.across : APART.up;
    const from = level ? run.x0 : run.y0, to = level ? run.x1 : run.y1;
    // On a grid of their own spacing, so stretches that meet share their stakes.
    for (let at = Math.ceil(from / step) * step; at <= to; at += step) {
      const x = level ? at : run.x0, y = level ? run.y0 : at;
      found.set(`${x},${y}`, {
        x, y,
        tall: 15 + Math.floor(chance(x, y, seed) * 8),
        which: chance(x, y, seed + 1),
      });
    }
  }
  return [...found.values()];
}
