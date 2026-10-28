import { chance } from './chance';
import { letterAt, PLOT_H, PLOT_W, type WorldMap } from './zones';

// Where a map's trees stand. Nobody places them one by one: the country too
// thick to cross is walled with great trees where it meets the ground people
// walk, thinning out behind, and smaller ones are scattered through the zones.

/** How many times its drawn size a tree is shown, give or take: in a zone, and in the wall at its edge. */
export const STANDING = 2, WALL = 3;
/** No two trees are quite the same height: each is this share taller or shorter, at most. */
export const UNEVEN = 0.2;
/** Plots of wall before the thick country is left bare: more than is ever seen from the ground. */
export const DEPTH = 5;
const WALLED = [1, 0.85, 0.7, 0.6, 0.5]; // chance of a tree in a plot of the wall, by how far in it is
const TWICE = 0.5;               // chance of a second tree in the plots right at the edge
const SCATTERED = 0.12;          // chance of a tree in a plot of a zone that is not safe
const OPEN_SOUTH = 4;            // plots south of a clearing left bare, between it and the camera

export interface Tree {
  /** The foot of its trunk, in world pixels. */
  x: number;
  y: number;
  /** Which drawing of a tree it is, counting from 0. */
  kind: number;
  /** How many times its drawn size it is shown. */
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
    // Numbered well clear of the draws below that decide whether a tree is planted at all.
    const s = seed + 100 + n * 10;
    trees.push({
      x: Math.floor((col + chance(col, row, s)) * PLOT_W),
      y: Math.floor((row + chance(col, row, s + 1)) * PLOT_H),
      kind: Math.floor(chance(col, row, s + 2) * kinds),
      size: size * (1 + (chance(col, row, s + 4) * 2 - 1) * UNEVEN),
      flipped: chance(col, row, s + 3) < 0.5,
    });
  };
  // Round a clearing the monte stands back a plot, so its crowns do not close over it; and south of it,
  // between it and the camera, it is left bare a few plots deep, or its trees stand before the clearing
  // and hide it (the user found it full of trees, 28/10/2026).
  const open = (col: number, row: number) => {
    const letter = letterAt(map, col, row);
    return letter !== undefined && !!map.zones[letter].open;
  };
  const byOpen = (col: number, row: number) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (open(col + dc, row + dr)) return true;
    for (let up = 1; up <= OPEN_SOUTH; up++) for (let dc = -1; dc <= 1; dc++) if (open(col + dc, row - up)) return true;
    return false;
  };
  map.plots.forEach((line, row) => [...line].forEach((letter, col) => {
    const d = far[row][col];
    if (d > 0 && byOpen(col, row)) return;
    if (d === 0) {
      if (!map.zones[letter].safe && !map.zones[letter].open && chance(col, row, seed + 4) < SCATTERED) plant(col, row, STANDING, 0);
    } else if (d <= DEPTH) {
      if (chance(col, row, seed + 5) < WALLED[d - 1]) plant(col, row, WALL, 1);
      if (d === 1 && chance(col, row, seed + 6) < TWICE) plant(col, row, WALL, 2);
    }
  }));
  return trees;
}
