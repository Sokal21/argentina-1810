import { chance } from './chance';
import { letterAt, PLOT_H, PLOT_W, zoneAt, type WorldMap, type Zone } from './zones';

// Where the fences run. A zone that people have fenced is closed along
// every side of a plot of it that looks onto ground nobody can cross; where
// it meets another zone it is left open, and that is its gate. Nothing is
// placed by hand: the fence follows the zone when its shape changes. But it
// does not follow the plots: it stands along a line of its own.

type Kind = NonNullable<Zone['fence']>;

/** A post of a fence: where its foot is, and which of the drawings it is, as a share from 0 up to 1. */
export interface Stake { x: number; y: number; which: number; /** How far along its fence it stands, in pixels. */ along: number }

type Point = { x: number; y: number };
/** A line a fence follows; `closed` when it comes back round to where it began. */
export interface Line { points: Point[]; closed: boolean }

/** How far a line may stray from the plots' own edges when their steps are taken out of it, in pixels. */
export const SLACK = 40;
/** How far a fence wanders to either side of its line, in pixels. */
export const WANDER = 5;
/** How far apart posts stand, along the screen and up it: they overlap going away. */
export const APART_X = 5, APART_Y = 3;
/** A wall is stood as slices this far apart, and wanders this little: it was built to a line. */
export const SLICE = 2, WALL_WANDER = 2;
/** A wall strays further from the plots' edges than a fence, to run in fewer, longer sweeps. */
export const WALL_SLACK = 100;

/**
 * The edge of every zone fenced in `kind`, where it meets ground nobody can
 * cross, as corners in order with the zone on the right hand going round.
 * Where the zone meets another the line stops: that is its gate.
 */
export function edges(map: WorldMap, kind: Kind): Line[] {
  const key = (p: Point) => `${p.x},${p.y}`;
  const from = new Map<string, { a: Point; b: Point }[]>(), into = new Set<string>();
  const add = (ax: number, ay: number, bx: number, by: number) => {
    const side = { a: { x: ax, y: ay }, b: { x: bx, y: by } };
    from.set(key(side.a), [...(from.get(key(side.a)) ?? []), side]);
    into.add(key(side.b));
  };
  map.plots.forEach((line, row) => [...line].forEach((letter, col) => {
    if (map.zones[letter]?.fence !== kind) return;
    const l = col * PLOT_W, t = row * PLOT_H, r = l + PLOT_W, b = t + PLOT_H;
    const wild = (c: number, r: number) => letterAt(map, c, r) === undefined;
    if (wild(col, row - 1)) add(l, t, r, t);
    if (wild(col + 1, row)) add(r, t, r, b);
    if (wild(col, row + 1)) add(r, b, l, b);
    if (wild(col - 1, row)) add(l, b, l, t);
  }));
  const lines: Line[] = [];
  const follow = (start: Point) => {
    const points = [start];
    for (let at = start; ;) {
      const side = from.get(key(at))?.pop();
      if (!side) break;
      points.push(at = side.b);
    }
    const closed = points.length > 2 && key(points[0]) === key(points[points.length - 1]);
    if (closed) points.pop();
    // Only the corners are kept.
    const corners = points.filter((p, i) => {
      if (!closed && (i === 0 || i === points.length - 1)) return true;
      const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length];
      return (p.x - a.x) * (b.y - p.y) !== (p.y - a.y) * (b.x - p.x);
    });
    if (corners.length > 1) lines.push({ points: corners, closed });
  };
  // Lines with an end first, begun at it; whatever is left goes round.
  for (const sides of [...from.values()]) for (const side of [...sides]) if (!into.has(key(side.a))) follow(side.a);
  for (const sides of [...from.values()]) while (sides.length) follow(sides[0].a);
  return lines;
}

/** The way out of the zone from a stretch going from a to b, one pixel long. */
function outward(a: Point, b: Point): Point {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.y - a.y) / len, y: -(b.x - a.x) / len };
}

/** A line stood `by` pixels further out from its zone. */
function pushed({ points, closed }: Line, by: number): Line {
  const n = points.length;
  return {
    closed,
    points: points.map((p, i) => {
      const before = closed || i > 0 ? outward(points[(i + n - 1) % n], p) : undefined;
      const after = closed || i < n - 1 ? outward(p, points[(i + 1) % n]) : undefined;
      const out = { x: (before?.x ?? 0) + (after?.x ?? 0), y: (before?.y ?? 0) + (after?.y ?? 0) };
      return { x: p.x + out.x * by, y: p.y + out.y * by };
    }),
  };
}

/** A line with every corner dropped that lies within `slack` of the line without it. */
function straightened(points: Point[], slack: number): Point[] {
  if (points.length < 3) return points;
  const a = points[0], b = points[points.length - 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let worst = 0, at = 0;
  points.forEach((p, i) => {
    const off = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / len;
    if (off > worst) { worst = off; at = i; }
  });
  if (worst <= slack) return [a, b];
  return [...straightened(points.slice(0, at + 1), slack).slice(0, -1), ...straightened(points.slice(at), slack)];
}

/** A line with its corners rounded off, by cutting each one a quarter of the way along both its sides. */
function rounded({ points, closed }: Line): Line {
  const cut: Point[] = [], n = points.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = points[i], b = points[(i + 1) % n];
    cut.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
  }
  return { closed, points: closed ? cut : [points[0], ...cut, points[n - 1]] };
}

/** The posts along one line stood `out` pixels beyond the zone's edge. */
function along(edge: Line, out: number, seed: number, apartX: number, apartY: number, wander: number, slack: number): Stake[] {
  let line = pushed(edge, out);
  if (line.closed) {
    // Straightened in two halves, between the two corners furthest apart along the line.
    const half = Math.floor(line.points.length / 2), p = line.points;
    line = { closed: true, points: [...straightened(p.slice(0, half + 1), slack).slice(0, -1), ...straightened([...p.slice(half), p[0]], slack).slice(0, -1)] };
  } else line = { closed: false, points: straightened(line.points, slack) };
  for (let i = 0; i < 3; i++) line = rounded(line);
  const points = line.closed ? [...line.points, line.points[0]] : line.points;
  const posts: Stake[] = [];
  // A slow wander to either side, the same every time for the same fence.
  const drift = (d: number) => {
    const i = Math.floor(d / 90), f = d / 90 - i, ease = f * f * (3 - 2 * f);
    const here = chance(i, Math.round(points[0].x + points[0].y), seed), next = chance(i + 1, Math.round(points[0].x + points[0].y), seed);
    return (here + (next - here) * ease - 0.5) * 2 * wander;
  };
  let walked = 0, owed = 1;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!len) continue;
    // How many posts' worth of ground the stretch covers: fewer the more it goes away.
    const worth = Math.hypot((b.x - a.x) / apartX, (b.y - a.y) / apartY), away = outward(a, b);
    for (; owed <= worth; owed++) {
      const t = owed / worth, off = drift(walked + len * t);
      const x = Math.round(a.x + (b.x - a.x) * t + away.x * off), y = Math.round(a.y + (b.y - a.y) * t + away.y * off);
      posts.push({ x, y, which: chance(x, y, seed), along: walked + len * t });
    }
    owed -= worth;
    walked += len;
  }
  return posts;
}

/** What stands along the edge of every zone fenced in `kind`, as near the zone as can be with none of it on ground that is walked. */
function standing(map: WorldMap, kind: Kind, seed: number, apartX: number, apartY: number, wander: number, slack: number): Stake[] {
  return edges(map, kind).flatMap(edge => {
    for (let out = 8; ; out += 6) {
      const posts = along(edge, out, seed, apartX, apartY, wander, slack);
      if (out > 120 || posts.every(p => zoneAt(map, p.x, p.y) === undefined)) return posts;
    }
  });
}

/**
 * Every post of a map's stake fences. The fence does not follow the plots:
 * the steps are taken out of the zone's edge, its corners are rounded, it
 * wanders a little, and posts are stood along it one by one.
 */
export function palisade(map: WorldMap, seed = 1): Stake[] {
  return standing(map, 'stakes', seed, APART_X, APART_Y, WANDER, SLACK);
}

/** A map's walls, along a line found the same way, as thin slices of wall stood side by side. */
export function walls(map: WorldMap, seed = 1): Stake[] {
  return standing(map, 'wall', seed, SLICE, SLICE, WALL_WANDER, WALL_SLACK);
}
