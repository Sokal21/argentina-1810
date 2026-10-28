import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';

// The plague-dead soldier's pool of retching, as the game reckons it: where it lies, whether she is
// standing in it, and the plague it gives her. Shown in 3D by three/vomit.ts, by the same shape.

/**
 * Its shape, from where he stands the way he faces: from how far before him to how far it lies, and
 * how wide it is at its near end and at its far end (all shares of his height); when in his scream it
 * is thrown and until when (seconds); how long the pool lies before it dries, and how long it takes
 * drying.
 */
export const VOMIT = { near: 0.4, reach: 2.4, wide: [0.75, 1.8], from: 0.55, to: 1.55, lies: 5, dries: 2.6 };
/** How wide the pool is (a share of his height) at a share `d` of the way from its near end to its far end. */
export const wideAt = (d: number) => VOMIT.wide[0] + (VOMIT.wide[1] - VOMIT.wide[0]) * d;

/**
 * What it does to her (the user, 27/10/2026): slowed while she stands in it, to this share of her
 * pace; and once she has stepped in it, plagued for `lasts` seconds, her life drained little by little
 * all the while, `damage` of it in all, so that she sees it go (two points at first, in bites, was too
 * much; then one, still too much: half a point). Stepping in again starts it over, it does not add up; it neither breaks
 * her healing nor guards her from the next blow, and her healing ritual rids her of it.
 */
export const PLAGUE = { slow: 0.6, lasts: 4, damage: 0.5 };

/**
 * How far past the pool's drawn edges it still catches her, a share of his height: its splashes and
 * its ragged rim reach that far, and drawn as big as it is it felt too small for what is seen (the
 * user, 27/10/2026). Its ends, rounded off, are taken no narrower than `ends` of its width.
 */
const MARGIN = 0.14, ENDS = 0.45;

/** One pool: where he stood, the way he faced (along the ground, not foreshortened), how tall he is, how long since he began to retch. */
export interface Pool { x: number; y: number; dx: number; dy: number; tall: number; t: number }

/** How far it has spread, 0 to 1, as the 3D pool spreads (three/vomit.ts). */
export function spread(t: number): number {
  const k = Math.max(0, Math.min(1, (t - VOMIT.from - 0.1) / (VOMIT.to - VOMIT.from)));
  return 1 - (1 - k) ** 2;
}

/** Whether it still lies there: from the first of it on the ground until it is half dried away. */
export function lying(pool: Pool): boolean {
  return pool.t >= VOMIT.from + 0.1 && pool.t < VOMIT.to + VOMIT.lies + VOMIT.dries * 0.5;
}

/** Whether a spot of the 2D ground is in it, as far as it has spread. */
export function inPool(pool: Pool, at: Vec): boolean {
  if (!lying(pool)) return false;
  const x = at.x - pool.x, y = (at.y - pool.y) / ISO_Y;
  const ahead = x * pool.dx + y * pool.dy, across = Math.abs(x * pool.dy - y * pool.dx);
  const margin = pool.tall * MARGIN, near = pool.tall * VOMIT.near, long = pool.tall * (VOMIT.reach - VOMIT.near) * spread(pool.t);
  if (ahead < near - margin || ahead > near + long + margin) return false;
  // Its ends are rounded off as the picture's are: narrower toward each.
  const d = Math.max(0, Math.min(1, (ahead - near) / (pool.tall * (VOMIT.reach - VOMIT.near))));
  const rounded = Math.max(ENDS, Math.sqrt(Math.max(0, 1 - Math.abs(2 * d - 1) ** 2.4)));
  return across <= wideAt(d) * pool.tall * 0.45 * rounded + margin;
}

/** The plague on her: how long it has left. */
export class Plague {
  left = 0;

  get on(): boolean {
    return this.left > 0;
  }

  /** She stepped in it: plagued afresh, for all of its time. */
  catch(): void {
    this.left = PLAGUE.lasts;
  }

  /** Rid of it, by her healing. */
  cure(): void {
    this.left = 0;
  }

  /** Time passes; says how much life it drains this step. */
  update(dt: number): number {
    if (!this.on) return 0;
    const spent = Math.min(dt, this.left);
    this.left -= spent;
    return PLAGUE.damage * spent / PLAGUE.lasts;
  }
}
