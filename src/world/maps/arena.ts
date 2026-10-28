import { PLOT_H, PLOT_W, type WorldMap } from '../zones';
import { ISO_Y } from '../../machi/data';

// Where Inti fights Roca's battery (docs/historia/inti/README.md, 28 October 2026): a round clearing
// in the monte, not large, with nothing in it to hide behind (the user: she gets out of the shells'
// way by moving); the battery and Roca beyond its edge. She comes in at its south edge, the safe
// ground every map begins on (a neck through the monte to it hid her among the trees). Her first map for now, in place of her forest (maps/bosque.ts).

/** How far the clearing reaches from its middle, in the ground's units (the great salvo is 130 across its middle). */
export const ARENA_REACH = 400;
/** The map in plots: how wide and deep, and the clearing's middle. */
const COLS = 21, ROWS = 21, MIDDLE: [number, number] = [10, 9];
/** How many plots south of the middle she comes in. */
const ENTRY = 3;

function plots(): string[] {
  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      // A plot is in the clearing if its middle is, measured along the ground (down the screen
      // foreshortened), give or take a quarter of a plot: at the reach itself the plots came out a diamond.
      const dx = (c - MIDDLE[0]) * PLOT_W, dy = (r - MIDDLE[1]) * PLOT_H / ISO_Y;
      const inside = Math.hypot(dx, dy) <= ARENA_REACH + PLOT_W / 4;
      // Where she comes in: the clearing's southmost plot.
      const entry = c === MIDDLE[0] && r === MIDDLE[1] + ENTRY;
      line += entry && inside ? 'E' : inside ? 'A' : '.';
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
  start: [MIDDLE[0], MIDDLE[1] + ENTRY],
  objectives: [],
};
