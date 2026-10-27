import type { Vec } from './controller';
import { ISO_Y } from './data';

// Fire on the ground, as the king's men see it: they keep out of it and get out of it, the way
// anyone would. Ways here are along the ground (y not foreshortened), as their brains walk them.

/** A patch of ground alight: its middle (on the 2D ground) and how far it reaches along the ground. */
export interface Flames {
  x: number;
  y: number;
  r: number;
}

/** How far past a fire's edge one keeps clear of it, and how far ahead a walk is looked along for one. */
export const WARY = { margin: 10, ahead: 40 };

// From a fire's middle to a spot, along the ground, and how far that is.
function from(f: Flames, at: Vec): { x: number; y: number; far: number } {
  const x = at.x - f.x, y = (at.y - f.y) / ISO_Y;
  return { x, y, far: Math.hypot(x, y) };
}

/** The way out of the fire one is standing in (straight away from its middle), or null if in none. */
export function outOf(at: Vec, fires: readonly Flames[], girth: number): Vec | null {
  for (const f of fires) {
    const d = from(f, at);
    if (d.far >= f.r + girth + WARY.margin) continue;
    if (d.far < 1e-3) return { x: 1, y: 0 };
    return { x: d.x / d.far, y: d.y / d.far };
  }
  return null;
}

/**
 * A way walked, turned aside where it would take one into a fire: round its edge, on whichever
 * side is nearer the way they meant to go. Unchanged where there is no fire ahead.
 */
export function skirt(at: Vec, way: Vec, fires: readonly Flames[], girth: number): Vec {
  for (const f of fires) {
    const next = { x: at.x + way.x * WARY.ahead, y: at.y + way.y * WARY.ahead * ISO_Y };
    const clear = f.r + girth + WARY.margin;
    if (from(f, next).far >= clear) continue;
    const d = from(f, at);
    if (d.far < 1e-3) continue;
    // Along the edge, the turn nearer the way he meant; not when he is going away from it already.
    const out = { x: d.x / d.far, y: d.y / d.far };
    if (out.x * way.x + out.y * way.y >= 0) continue;
    const side = out.x * way.y - out.y * way.x >= 0 ? 1 : -1;
    return { x: -out.y * side, y: out.x * side };
  }
  return way;
}
