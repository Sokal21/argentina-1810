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

/** The marks of a trail from a plot to the nearest of a zone, the same each time for the same map. */
export function trail(map: WorldMap, from: [number, number], zone: string, seed = 1): Mark[] {
  const way = wayTo(map, from, zone).map(([c, r]) => ({ x: (c + 0.5) * PLOT_W, y: (r + 0.5) * PLOT_H }));
  const marks: Mark[] = [];
  let owed = STRIDE / 2;
  for (let i = 0; i + 1 < way.length; i++) {
    const a = way[i], b = way[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    for (; owed <= len; owed += STRIDE) {
      const t = owed / len, n = marks.length;
      const x = a.x + (b.x - a.x) * t + (chance(n, i, seed) - 0.5) * 2 * STRAY;
      const y = a.y + (b.y - a.y) * t + (chance(n, i, seed + 1) - 0.5) * STRAY;
      // Kept only where it can be walked: a trail does not wander into the thicket.
      if (letterAt(map, Math.floor(x / PLOT_W), Math.floor(y / PLOT_H)) === undefined) continue;
      // Thinner the further it goes: whoever left it was bound up along the way.
      marks.push({ x: Math.round(x), y: Math.round(y), size: (1 - 0.5 * i / way.length) * (0.5 + 0.5 * chance(n, i, seed + 2)) });
    }
    owed -= len;
  }
  return marks;
}
