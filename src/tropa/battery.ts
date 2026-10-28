import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';

// Roca's Krupp battery, as the game reckons it (docs/historia/inti/README.md): it is never seen, only
// its shells, falling where his spotter signals. A salvo is planned here, where each shell's mark
// shows on the ground and when it lands, and where and when each blast is; three/battery.ts draws it
// and the game hurts whoever is in a blast.

/**
 * The kinds of salvo. In the first phase, the challenge: `scattered`, many small shells strewn about
 * the place, each its own mark, staggered; or `concentrated`, one great mark where all of them fall
 * together, one blast after another over it. In the second, with Roca fighting, `small`: one of
 * those, half as wide. For each: how many shells, how far they are strewn from where it is aimed, how wide a blast
 * is, how long its mark shows before it lands, how much later the last lands than the first, and how
 * much life a blast takes. All in the ground's units.
 */
// Its marks come quicker than at first (1.6 s, 2 and 1.4): they were too easy to get out of, the great
// one above all (the user, 28/10/2026). From the middle of the great one she must cover its width,
// 130, in 1.3 s: walking (115 a second in 3D) just; with a dash, surely.
// `gathered`: all of it in one mark. Roca's own, called with his sabre in the second phase, is a
// concentrated salvo half as wide (the user, 28/10/2026).
export const SALVO = {
  scattered: { shells: 9, spread: 240, radius: 36, warn: 1.1, stagger: 0.7, damage: 1, gathered: false },
  concentrated: { shells: 7, spread: 0, radius: 130, warn: 1.3, stagger: 0.4, damage: 2, gathered: true },
  small: { shells: 5, spread: 0, radius: 65, warn: 1.0, stagger: 0.3, damage: 1, gathered: true },
};
export type SalvoKind = keyof typeof SALVO;
/** How far apart, at least, the edges of two marks of a salvo are. */
const GAP = 8;

/** A shell's mark on the ground: where (the 2D ground), how wide, when it shows and when it lands, seconds from the salvo. */
export interface Mark { x: number; y: number; r: number; shows: number; lands: number }
/** A blast: where, how wide, when; and whether it is one of a great salvo's (drawn bigger). */
export interface Blast { x: number; y: number; r: number; at: number; great?: boolean }

/** Where and when a salvo of a kind aimed at a spot falls: its marks, and its blasts. */
export function plan(kind: SalvoKind, at: Vec, rnd: () => number = Math.random): { marks: Mark[]; blasts: Blast[] } {
  const s = SALVO[kind];
  // A spot about `at`, `far` off at most along the ground (foreshortened down the screen).
  const about = (far: number) => {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * far;
    return { x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * ISO_Y };
  };
  if (s.gathered) {
    // One great mark; inside it, one blast after another, the last over all of it.
    const marks = [{ x: at.x, y: at.y, r: s.radius, shows: 0, lands: s.warn }];
    const blasts: Blast[] = [];
    for (let i = 0; i < s.shells - 1; i++) {
      const p = about(s.radius * 0.7);
      blasts.push({ ...p, r: s.radius * 0.4, at: s.warn + s.stagger * (i / (s.shells - 1)), great: true });
    }
    blasts.push({ x: at.x, y: at.y, r: s.radius, at: s.warn + s.stagger, great: true });
    return { marks, blasts };
  }
  const marks: Mark[] = [], blasts: Blast[] = [];
  // No two of a scattered salvo's marks overlap (the user, 28/10/2026): each tried a few times for a
  // spot clear of the others by its own width and a little; one that finds none is left out.
  const clear = (p: Vec) => marks.every(m => Math.hypot(p.x - m.x, (p.y - m.y) / ISO_Y) >= s.radius * 2 + GAP);
  for (let i = 0; i < s.shells; i++) {
    let p = i === 0 ? { x: at.x, y: at.y } : about(s.spread);
    for (let tries = 0; i > 0 && !clear(p) && tries < 30; tries++) p = about(s.spread);
    if (!clear(p)) continue;
    const shows = s.stagger * rnd();
    marks.push({ ...p, r: s.radius, shows, lands: shows + s.warn });
    blasts.push({ ...p, r: s.radius, at: shows + s.warn });
  }
  return { marks, blasts };
}

/** Whether a spot of the 2D ground is within a blast. */
export function inBlast(blast: Blast, spot: Vec): boolean {
  return Math.hypot(spot.x - blast.x, (spot.y - blast.y) / ISO_Y) <= blast.r;
}
