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
/**
 * A clearing's edge, marked so it is seen where the ground can be walked and where not (the user,
 * 28/10/2026: the monte stood back, its edge was a wall nobody could see): young trees along it, so
 * many to a plot's side, as big as `side`; and along its south edge, before the camera, `south`, low,
 * so as to mark it and hide nothing. How far into the thick country they stand, in world pixels.
 */
const EDGE = { many: 2, side: 1.3, south: 0.6, into: 6 };

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
  // A plot of thick country next to a clearing: young trees along each side of it that meets the
  // clearing, right at the edge (the youngest drawing, if there are several).
  const young = kinds > 1 ? 1 : 0;
  const edge = (col: number, row: number) => {
    let n = 0;
    const tree = (x: number, y: number, size: number) => {
      const s = seed + 200 + n++ * 10;
      trees.push({ x: Math.floor(x), y: Math.floor(y), kind: young, size: size * (1 + (chance(col, row, s) * 2 - 1) * UNEVEN), flipped: chance(col, row, s + 1) < 0.5 });
    };
    const along = (i: number) => (i + 0.5 + (chance(col, row, seed + 300 + i) - 0.5) * 0.5) / EDGE.many;
    for (let i = 0; i < EDGE.many; i++) {
      if (open(col, row - 1)) tree((col + along(i)) * PLOT_W, row * PLOT_H + EDGE.into, EDGE.south);
      if (open(col, row + 1)) tree((col + along(i)) * PLOT_W, (row + 1) * PLOT_H - EDGE.into, EDGE.side);
      if (open(col - 1, row)) tree(col * PLOT_W + EDGE.into, (row + along(i)) * PLOT_H, EDGE.side);
      if (open(col + 1, row)) tree((col + 1) * PLOT_W - EDGE.into, (row + along(i)) * PLOT_H, EDGE.side);
    }
    // Only a corner meeting it: one at the corner.
    if (!open(col, row - 1) && !open(col, row + 1) && !open(col - 1, row) && !open(col + 1, row)) {
      for (const [dc, dr] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!open(col + dc, row + dr)) continue;
        const x = (col + (dc > 0 ? 1 : 0)) * PLOT_W - dc * EDGE.into, y = (row + (dr > 0 ? 1 : 0)) * PLOT_H - dr * EDGE.into;
        tree(x, y, dr < 0 ? EDGE.south : EDGE.side);
      }
    }
  };
  const touches = (col: number, row: number) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (open(col + dc, row + dr)) return true;
    return false;
  };
  map.plots.forEach((line, row) => [...line].forEach((letter, col) => {
    const d = far[row][col];
    if (d === 1 && touches(col, row)) { edge(col, row); return; }
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
