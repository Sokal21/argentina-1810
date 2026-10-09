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

/** A post of a fence: where its foot is, and which of the drawings it is, as a share from 0 up to 1. */
export interface Stake { x: number; y: number; which: number }

/** How far apart the posts of a fence going away up the screen stand, in pixels of screen. */
export const APART = 4;

/**
 * The posts of every stretch of stake fence that runs away up the screen.
 * A stretch seen from the front is one drawing repeated; one going away is
 * its posts stood one behind another. The same each time for the same map.
 */
export function stakes(runs: Run[], seed = 1): Stake[] {
  const found = new Map<string, Stake>();
  for (const run of runs.filter(r => r.kind === 'stakes' && r.x0 === r.x1)) {
    // On a grid of their own spacing, so stretches that meet share their posts.
    for (let y = Math.ceil(run.y0 / APART) * APART; y <= run.y1; y += APART) {
      found.set(`${run.x0},${y}`, { x: run.x0, y, which: chance(run.x0, y, seed) });
    }
  }
  return [...found.values()];
}
