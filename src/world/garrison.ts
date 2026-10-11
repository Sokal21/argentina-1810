import { chance } from './chance';
import { letterAt, PLOT_H, PLOT_W, type WorldMap } from './zones';

// Who holds a map. Nobody places them: each zone says how many soldiers
// are in it, and they are stood in pickets of two or three, well apart,
// out on its open ground. A soldier killed stays dead while the hero is
// about: he is back at his post only once the zone has been left behind,
// so nobody is ever seen to appear.

/** A soldier's post: where he stands, and the zone he holds. */
export interface Post { x: number; y: number; letter: string; /** What kind of soldier holds it; a fusilier, if unsaid. */ kind?: string }

/** How many men stand together, at most. */
export const PICKET = 3;
/** How far apart pickets are kept, and how far from where the hero arrives, in plots along the screen. */
export const APART = 6;
/** How far from the middle of his picket a man stands, in pixels. */
export const SPREAD = 46;
/** How far the hero has to be from a post, in pixels, before its man can be back. */
export const BEHIND = 1000;

/** Every post on a map, the same each time for the same map. */
export function garrison(map: WorldMap, seed = 1): Post[] {
  const posts: Post[] = [];
  // Plots are twice as wide as they are deep: distances are told in plots across.
  const far = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], (a[1] - b[1]) / 2);
  for (const [letter, zone] of Object.entries(map.zones)) {
    const men = zone.foes ?? 0;
    if (!men) continue;
    // Open ground: a plot of the zone with ground to walk on every side of it.
    const open: [number, number][] = [];
    map.plots.forEach((line, row) => [...line].forEach((l, col) => {
      if (l !== letter) return;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (letterAt(map, col + dc, row + dr) === undefined) return;
      open.push([col, row]);
    }));
    open.sort((a, b) => chance(a[0], a[1], seed + 300) - chance(b[0], b[1], seed + 300));
    const pickets: [number, number][] = [];
    const wanted = Math.ceil(men / PICKET);
    // As far apart as asked if the zone has room for it, and closer if it has not.
    for (let apart = APART; pickets.length < wanted && apart >= 0; apart -= 2) {
      for (const plot of open) {
        if (pickets.length >= wanted) break;
        if (far(plot, map.start) < APART || pickets.some(p => far(p, plot) < Math.max(apart, 1))) continue;
        pickets.push(plot);
      }
    }
    if (!pickets.length) continue;
    for (let n = 0; n < men; n++) {
      const [col, row] = pickets[n % pickets.length], place = Math.floor(n / pickets.length);
      // Round the middle of the picket, each in a place of his own.
      const turn = (place / PICKET + chance(col, row, seed + 310)) * Math.PI * 2;
      const out = SPREAD * (0.6 + 0.4 * chance(col + place, row, seed + 320));
      posts.push({
        x: Math.round((col + 0.5) * PLOT_W + Math.cos(turn) * out),
        y: Math.round((row + 0.5) * PLOT_H + Math.sin(turn) * out / 2),
        letter,
        // The zone's own mix of kinds, gone through in order: its first man is its first kind.
        kind: zone.mix?.[n % zone.mix.length],
      });
    }
  }
  return posts;
}

/**
 * Whether the zone a post is in has been left behind by a hero standing at
 * a spot: he is in some other zone, and too far off to see the post.
 */
export function leftBehind(map: WorldMap, post: Post, hero: { x: number; y: number }): boolean {
  if (letterAt(map, Math.floor(hero.x / PLOT_W), Math.floor(hero.y / PLOT_H)) === post.letter) return false;
  return Math.hypot(hero.x - post.x, hero.y - post.y) > BEHIND;
}
