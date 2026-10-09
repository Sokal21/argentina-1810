import { letterAt, type WorldMap } from './zones';

// Where a map's water lies, plot by plot. Nobody draws it: it follows from
// the map. A stream runs along the rows the map names, and is deep wherever
// nobody can cross; the ford is shallow; a marsh is wet ground with pools,
// and the ground nobody can cross beside a marsh or a ford is deep water.

/** How much water a plot holds: none, the pools of a marsh, the shallows of a ford, or deep. */
export const DRY = 0, WET = 0.35, SHALLOW = 0.6, DEEP = 1;

/** How many plots out from a marsh or a ford the deep water reaches. */
export const REACH = 3;

/** The water in every plot of a map: a number for each, row by row. */
export function waterLevels(map: WorldMap): number[][] {
  const rows = map.plots.length, cols = map.plots[0]?.length ?? 0;
  const levels = map.plots.map(line => [...line].map(() => DRY));
  const kind = (c: number, r: number) => {
    const letter = letterAt(map, c, r);
    return letter === undefined ? undefined : map.zones[letter]?.water;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const walked = letterAt(map, c, r) !== undefined, water = kind(c, r);
      if (water === 'ford') levels[r][c] = SHALLOW;
      else if (water === 'marsh') levels[r][c] = WET;
      else if (walked) continue;
      else if (map.stream && r >= map.stream[0] && r <= map.stream[1]) levels[r][c] = DEEP;
      else {
        // Deep beside a marsh, a ford or a shore, as far out as it reaches.
        search: for (let dr = -REACH; dr <= REACH; dr++) {
          for (let dc = -REACH; dc <= REACH; dc++) {
            if (kind(c + dc, r + dr)) { levels[r][c] = DEEP; break search; }
          }
        }
      }
    }
  }
  return levels;
}
