import { chance } from './chance';
import { letterAt, PLOT_H, PLOT_W, type WorldMap } from './zones';

// A trail left along the ground: from a plot to the nearest plot of some
// zone, by the shortest way that can be walked. Nobody lays it by hand: it
// goes wherever the map lets someone go.

/** A mark of the trail: where it lies, and how big it is, from 0 up to 1. */
export interface Mark { x: number; y: number; size: number }

/** How far apart the marks lie, in pixels, and how far each strays from the way. */
export const STRIDE = 54, STRAY = 20;

/** The plots walked from one to the nearest of a zone, both ends included; empty if there is no way. */
export function wayTo(map: WorldMap, from: [number, number], zone: string): [number, number][] {
  const key = (c: number, r: number) => `${c},${r}`;
  const came = new Map<string, [number, number] | null>([[key(...from), null]]);
  for (let edge: [number, number][] = [from]; edge.length;) {
    const next: [number, number][] = [];
    for (const [c, r] of edge) {
      if (letterAt(map, c, r) === zone) {
        const way: [number, number][] = [];
        for (let at: [number, number] | null = [c, r]; at; at = came.get(key(...at)) ?? null) way.unshift(at);
        return way;
      }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (came.has(key(nc, nr)) || letterAt(map, nc, nr) === undefined) continue;
        came.set(key(nc, nr), [c, r]);
        next.push([nc, nr]);
      }
    }
    edge = next;
  }
  return [];
}

/** How far the trail swings to either side of the way as it goes, and over how long a stretch, in pixels. */
export const SWING = 64, STRETCH = 380;

/** The marks of a trail from a plot to the nearest of a zone, the same each time for the same map. */
export function trail(map: WorldMap, from: [number, number], zone: string, seed = 1): Mark[] {
  let way = wayTo(map, from, zone).map(([c, r]) => ({ x: (c + 0.5) * PLOT_W, y: (r + 0.5) * PLOT_H }));
  if (way.length < 2) return [];
  // The way goes plot by plot, in straight stretches and square corners; whoever bled along it
  // did not. Its corners are cut, twice over, so it bends.
  for (let pass = 0; pass < 2; pass++) {
    const cut = [way[0]];
    for (let i = 0; i + 1 < way.length; i++) {
      const a = way[i], b = way[i + 1];
      cut.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    way = [...cut, way[way.length - 1]];
  }
  const walked = (x: number, y: number) => letterAt(map, Math.floor(x / PLOT_W), Math.floor(y / PLOT_H)) !== undefined;
  const total = way.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - way[i].x, p.y - way[i].y), 0);
  const marks: Mark[] = [];
  let gone = 0, owed = STRIDE / 2, n = 0;
  for (let i = 0; i + 1 < way.length; i++) {
    const a = way[i], b = way[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!len) continue;
    // To one side of the way and then the other, as someone staggering goes: two swings of
    // different lengths laid over one another, so it never quite repeats.
    const side = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    for (; owed <= len; n++) {
      const far = gone + owed;
      const swing = SWING * (0.65 * Math.sin(far / STRETCH * 6.2832) + 0.35 * Math.sin(far / STRETCH * 6.2832 * 2.7 + 1.3));
      const off = swing + (chance(n, 0, seed) - 0.5) * 2 * STRAY;
      const x = a.x + (b.x - a.x) * owed / len + side.x * off, y = a.y + (b.y - a.y) * owed / len + side.y * off * 0.5;
      // Thinner the further it goes: whoever left it was bound up along the way.
      const size = (1 - 0.5 * far / total) * (0.4 + 0.6 * chance(n, 0, seed + 2));
      // Kept only where it can be walked: a trail does not wander into the thicket.
      if (walked(x, y)) {
        marks.push({ x: Math.round(x), y: Math.round(y), size });
        // Now and then more than a drop fell: a few small ones beside it.
        if (chance(n, 0, seed + 3) < 0.22) {
          for (let k = 1; k <= 2; k++) {
            const sx = x + (chance(n, k, seed + 4) - 0.5) * 26, sy = y + (chance(n, k, seed + 5) - 0.5) * 12;
            if (walked(sx, sy)) marks.push({ x: Math.round(sx), y: Math.round(sy), size: size * 0.45 });
          }
        }
      }
      // Unevenly spaced: close together where they slowed, far apart where they ran.
      owed += STRIDE * (0.45 + 1.1 * chance(n, 0, seed + 6));
    }
    owed -= len;
    gone += len;
  }
  return marks;
}
