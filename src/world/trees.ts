import { chance } from './chance';
import { letterAt, PLOT_H, PLOT_W, type WorldMap } from './zones';

// Where a map's trees stand. Nobody places them one by one: the country too
// thick to cross is walled with great trees where it meets the ground people
// walk, thinning out behind, and smaller ones are scattered through the zones.

/** How many times its drawn size a tree is shown: in a zone, and in the wall at its edge. */
export const STANDING = 2, WALL = 3;
/** Plots of wall before the thick country is left bare: more than is ever seen from the ground. */
export const DEPTH = 5;
const WALLED = [1, 0.85, 0.7, 0.6, 0.5]; // chance of a tree in a plot of the wall, by how far in it is
const TWICE = 0.5;               // chance of a second tree in the plots right at the edge
const SCATTERED = 0.12;          // chance of a tree in a plot of a zone that is not safe

export interface Tree {
  /** The foot of its trunk, in world pixels. */
  x: number;
  y: number;
  /** Which drawing of a tree it is, counting from 0. */
  kind: number;
  size: number;
  /** Drawn the other way round. */
  flipped: boolean;
}

/** How many plots each plot of thick country is from ground people walk; 0 for that ground. */
function depths(map: WorldMap): number[][] {
  const rows = map.plots.length, cols = map.plots[0]?.length ?? 0;
  const far = map.plots.map(line => [...line].map(() => Infinity));
  let edge: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (letterAt(map, c, r) !== undefined) { far[r][c] = 0; edge.push([c, r]); }
    }
  }
  for (let d = 1; edge.length; d++) {
    const next: [number, number][] = [];
    for (const [c, r] of edge) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc, nr = r + dr;
          if (far[nr]?.[nc] !== Infinity) continue;
          far[nr][nc] = d;
          next.push([nc, nr]);
        }
      }
    }
    edge = next;
  }
  return far;
}

/** Every tree of a map, the same each time for the same map. `kinds` is how many drawings there are. */
export function plantTrees(map: WorldMap, kinds: number, seed = 1): Tree[] {
  const trees: Tree[] = [];
  const far = depths(map);
  const plant = (col: number, row: number, size: number, n: number) => {
    const s = seed + n * 10;
    trees.push({
      x: Math.floor((col + chance(col, row, s)) * PLOT_W),
      y: Math.floor((row + chance(col, row, s + 1)) * PLOT_H),
      kind: Math.floor(chance(col, row, s + 2) * kinds),
      size,
      flipped: chance(col, row, s + 3) < 0.5,
    });
  };
  map.plots.forEach((line, row) => [...line].forEach((letter, col) => {
    const d = far[row][col];
    if (d === 0) {
      if (!map.zones[letter].safe && chance(col, row, seed + 4) < SCATTERED) plant(col, row, STANDING, 0);
    } else if (d <= DEPTH) {
      if (chance(col, row, seed + 5) < WALLED[d - 1]) plant(col, row, WALL, 1);
      if (d === 1 && chance(col, row, seed + 6) < TWICE) plant(col, row, WALL, 2);
    }
  }));
  return trees;
}
