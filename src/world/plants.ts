import { chance } from './chance';
import { DEEP, waterLevels } from './water';
import { letterAt, PLOT_H, PLOT_W, type WorldMap } from './zones';

// Where the plants of open country stand. As in the forest, nobody places
// them: each zone names what closes it in, and that is planted thick along
// its edge, on the ground nobody can cross, thinning out behind; and a few
// stand here and there on the zone's own ground.

/** Plots of thicket before the country is left bare: more than is seen from the road. */
export const DEPTH = 4;
/** Plants in a plot of the thicket, by how far in it is. */
export const THICK = [5, 4, 3, 2];
/** Behind a fence the fence closes the zone, not the thicket: a plot there holds one plant, this often. */
export const BEHIND_FENCE = 0.3;
/** No two are quite the same height: each is this share taller or shorter, at most. */
export const UNEVEN = 0.18;
/** How many plots round someone who can be talked to are kept clear of whatever is scattered about. */
export const CLEAR = 2;
/** What grows in deep water, whatever the zone beside it is closed with. */
export const REEDS = 'junco';

export interface Plant {
  /** Its foot, in world pixels. */
  x: number;
  y: number;
  /** What it is, by name, and which drawing of it, as a share from 0 up to 1. */
  kind: string;
  which: number;
  /** How many times its drawn size it is shown. */
  size: number;
  /** Drawn the other way round. */
  flipped: boolean;
  /** It stands on ground people walk, and has to be gone round. */
  inTheWay: boolean;
}

/** For each plot nobody can cross: how many plots it is from ground people walk, and the zone that ground is in. */
function nearest(map: WorldMap): { far: number; letter: string }[][] {
  const rows = map.plots.length, cols = map.plots[0]?.length ?? 0;
  const found = map.plots.map(line => [...line].map(() => ({ far: Infinity, letter: '' })));
  let edge: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const letter = letterAt(map, c, r);
      if (letter !== undefined) { found[r][c] = { far: 0, letter }; edge.push([c, r]); }
    }
  }
  for (let d = 1; edge.length; d++) {
    const next: [number, number][] = [];
    for (const [c, r] of edge) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc, nr = r + dr;
          if (found[nr]?.[nc]?.far !== Infinity) continue;
          found[nr][nc] = { far: d, letter: found[r][c].letter };
          next.push([nc, nr]);
        }
      }
    }
    edge = next;
  }
  return found;
}

/** Every plant of a map of open country, the same each time for the same map. */
export function plantCountry(map: WorldMap, seed = 1): Plant[] {
  const plants: Plant[] = [];
  const plant = (col: number, row: number, kind: string, n: number, inTheWay: boolean) => {
    // Each draw has a number of its own, well clear of those that decide whether to plant at all.
    const s = seed + 1000 + n * 10;
    plants.push({
      x: Math.floor((col + chance(col, row, s)) * PLOT_W),
      y: Math.floor((row + chance(col, row, s + 1)) * PLOT_H),
      kind,
      which: chance(col, row, s + 2),
      size: 1 + (chance(col, row, s + 3) * 2 - 1) * UNEVEN,
      flipped: chance(col, row, s + 4) < 0.5,
      inTheWay,
    });
  };
  // What makes a place stands in the middle of its plot, as drawn: it is the one of its kind.
  for (const { plot: [col, row], stands } of map.objectives) {
    if (!stands) continue;
    plants.push({ x: Math.floor((col + 0.5) * PLOT_W), y: Math.floor((row + 0.5) * PLOT_H), kind: stands, which: 0, size: 1, flipped: false, inTheWay: true });
  }
  const water = waterLevels(map);
  nearest(map).forEach((line, row) => line.forEach(({ far, letter }, col) => {
    const zone = map.zones[letter];
    if (!zone) return;
    if (far === 0) {
      // Nothing grows over anyone who stands to be talked to: they are to be seen.
      if (map.people?.some(({ plot }) => Math.abs(plot[0] - col) <= CLEAR && Math.abs(plot[1] - row) <= CLEAR)) return;
      Object.entries(zone.scatter ?? {}).forEach(([kind, odds], k) => {
        if (chance(col, row, seed + 20 + k) < odds) plant(col, row, kind, 90 + k, true);
      });
      return;
    }
    const kinds = zone.edge ?? [];
    if (far > DEPTH || !kinds.length) return;
    // Where people have put up a fence the ground beside it is kept clear, so it can be seen.
    if (zone.fence && far === 1) return;
    // In deep water only reeds grow, and fewer of them.
    const deep = water[row][col] === DEEP;
    if (zone.fence) {
      if (chance(col, row, seed + 60) < BEHIND_FENCE) plant(col, row, deep ? REEDS : kinds[Math.floor(chance(col, row, seed + 40) * kinds.length)], 0, false);
      return;
    }
    for (let n = 0; n < (deep ? Math.ceil(THICK[far - 1] / 2) : THICK[far - 1]); n++) {
      plant(col, row, deep ? REEDS : kinds[Math.floor(chance(col, row, seed + 40 + n) * kinds.length)], n, false);
    }
  }));
  return plants;
}
