import { PLOT_H, PLOT_W, type WorldMap } from '../zones';
import { ISO_Y } from '../../machi/data';

// Where Inti fights Roca's battery (docs/historia/inti/README.md, 28 October 2026): a round clearing
// in the monte, with nothing in it to hide behind (the user: she gets out of the shells' way by
// moving); the battery and Roca beyond its edge. Its ground is a true circle (the map's `round`), not
// as its plots make it: of plots alone it came out a square or a diamond. She comes in at its south
// edge, the safe ground every map begins on. Her first map for now, in place of her forest
// (maps/bosque.ts).

/**
 * How far the clearing reaches from its middle, in the ground's units (the great salvo is 130 across
 * its middle): 400 at first, then 510, both too small (the user, 28/10/2026).
 */
export const ARENA_REACH = 750;
/** The map in plots: how wide and deep, and the clearing's middle plot. */
const COLS = 31, ROWS = 31, MIDDLE: [number, number] = [15, 13];
/** The middle of the clearing, in world pixels: the middle of its middle plot. */
const CENTRE = { x: (MIDDLE[0] + 0.5) * PLOT_W, y: (MIDDLE[1] + 0.5) * PLOT_H };
/** How many plots south of the middle she comes in: its plot's middle well within the circle. */
const ENTRY = 5;
/** How far in and out its edge wobbles, at most. */
const WOBBLE = 70;

function plots(): string[] {
  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      // A plot belongs to the clearing if any of it is within the circle: its nearest point to the middle.
      const nx = Math.max(c * PLOT_W, Math.min(CENTRE.x, (c + 1) * PLOT_W)), ny = Math.max(r * PLOT_H, Math.min(CENTRE.y, (r + 1) * PLOT_H));
      const inside = Math.hypot(nx - CENTRE.x, (ny - CENTRE.y) / ISO_Y) <= ARENA_REACH + WOBBLE;
      const entry = c === MIDDLE[0] && r === MIDDLE[1] + ENTRY;
      line += entry ? 'E' : inside ? 'A' : '.';
    }
    rows.push(line);
  }
  return rows;
}

export const arenaDeRoca: WorldMap = {
  name: 'El claro de la batería',
  ground: ['#3a3a26', '#363624', '#3d3c28', '#33331f', '#40402a'],
  zones: {
    E: { name: 'La entrada', safe: true, open: true },
    // A clearing: no tree in it (the user, 28/10/2026: there were too many trees).
    A: { name: 'El claro de la batería', open: true },
  },
  plots: plots(),
  // Its edge wobbling in and out a little, so as not to look drawn (the user, 28/10/2026).
  round: { ...CENTRE, reach: ARENA_REACH, wobble: WOBBLE },
  start: [MIDDLE[0], MIDDLE[1] + ENTRY],
  objectives: [],
};
