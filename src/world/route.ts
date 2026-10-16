import { ISO_Y } from '../machi/data';

// Finding the way round what is in the way. The ground near the hero is ruled into small cells;
// from the cell the hero stands in, every cell that can be walked is told how many steps it is
// from them, going round whatever cannot: a house, a fence, ground too thick to cross. Whoever
// has no straight way to the hero goes, cell by cell, to whichever neighbour is fewer steps away.
// Worked out again only when the hero moves to another cell, and only so far round them as anyone
// who could be after them stands.

type Vec = { x: number; y: number };
const NONE = 0xffff;
/** The side of a cell on the ground, across and down the screen. */
export const CELL = { w: 32, h: 16 };
/** How far round the hero it is worked out, in cells each way. */
const REACH = { cols: 30, rows: 36 };
const NEIGHBOURS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class Route {
  private readonly cols = REACH.cols * 2 + 1;
  private readonly rows = REACH.rows * 2 + 1;
  private steps = new Uint16Array(this.cols * this.rows).fill(NONE);
  private open = new Uint8Array(this.cols * this.rows);
  private queue = new Int32Array(this.cols * this.rows);
  /** The cell the hero stands in, in cells of the whole ground; the window is laid round it. */
  private centre: [number, number] | null = null;

  /** @param walkable whether a spot on the ground can be walked */
  constructor(private walkable: (x: number, y: number) => boolean) {}

  /** Counts the steps out from where the hero stands, if they have moved to another cell; or forgets, given nothing. */
  toward(hero: Vec | null): void {
    if (!hero) { this.centre = null; return; }
    const hc = Math.floor(hero.x / CELL.w), hr = Math.floor(hero.y / CELL.h);
    if (this.centre && this.centre[0] === hc && this.centre[1] === hr) return;
    this.centre = [hc, hr];
    const { cols, rows, steps, open, queue } = this;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (hc - REACH.cols + c + 0.5) * CELL.w, y = (hr - REACH.rows + r + 0.5) * CELL.h;
        // Open only if the whole of it is: a wall that crosses a corner of it is not gone through.
        const w = this.walkable, dx = CELL.w * 0.45, dy = CELL.h * 0.45;
        open[r * cols + c] = w(x, y) && w(x - dx, y - dy) && w(x + dx, y - dy) && w(x - dx, y + dy) && w(x + dx, y + dy) ? 1 : 0;
      }
    }
    steps.fill(NONE);
    const start = REACH.rows * cols + REACH.cols;
    let head = 0, tail = 0;
    steps[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const here = queue[head++], c = here % cols, r = (here / cols) | 0, next = steps[here] + 1;
      for (const [dc, dr] of NEIGHBOURS) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const n = nr * cols + nc;
        if (steps[n] !== NONE || !open[n]) continue;
        // Not across a corner that cannot be walked.
        if (dc && dr && (!open[r * cols + nc] || !open[nr * cols + c])) continue;
        steps[n] = next;
        queue[tail++] = n;
      }
    }
  }

  // Where a spot is in the window, or nothing if it is outside it.
  private cell(at: Vec): number | null {
    if (!this.centre) return null;
    const c = Math.floor(at.x / CELL.w) - this.centre[0] + REACH.cols, r = Math.floor(at.y / CELL.h) - this.centre[1] + REACH.rows;
    return c < 0 || r < 0 || c >= this.cols || r >= this.rows ? null : r * this.cols + c;
  }

  /** Whether the hero can be got to from a spot. Too far off to know, it is taken that they can. */
  reaches(at: Vec): boolean {
    if (!this.centre) return false;
    const n = this.cell(at);
    if (n === null) return true;
    // Standing on a cell that cannot be walked (the edge of something), the neighbours tell.
    if (this.steps[n] !== NONE) return true;
    return this.best(n) !== null;
  }

  // The neighbour of a cell fewest steps from the hero, if any is nearer than the cell itself.
  private best(n: number): number | null {
    const c = n % this.cols, r = (n / this.cols) | 0;
    let least = this.steps[n], found: number | null = null;
    for (const [dc, dr] of NEIGHBOURS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
      const m = nr * this.cols + nc;
      if (this.steps[m] < least) { least = this.steps[m]; found = m; }
    }
    return found;
  }

  /** Which way to go from a spot, along the ground, to come nearer the hero round what is in the way; nothing if beside them or not known. */
  way(at: Vec): Vec | null {
    const n = this.cell(at);
    if (n === null || this.steps[n] === 0) return null;
    const to = this.best(n);
    if (to === null || !this.centre) return null;
    const c = to % this.cols, r = (to / this.cols) | 0;
    const x = (this.centre[0] - REACH.cols + c + 0.5) * CELL.w - at.x, y = ((this.centre[1] - REACH.rows + r + 0.5) * CELL.h - at.y) / ISO_Y;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }
}

/**
 * The way across a whole map to one place, plot by plot: for what goes somewhere on its own, like a
 * cart on its way to the village. Worked out once, from the place outward over every plot that can
 * be walked; from anywhere, the next plot is whichever neighbour is fewer steps from it.
 */
export class Road {
  private steps: Uint16Array;
  private cols: number;
  private rows: number;

  /** @param open whether a plot can be travelled; @param to the plot it leads to */
  constructor(cols: number, rows: number, open: (col: number, row: number) => boolean, private to: { col: number; row: number }, private size: { w: number; h: number }) {
    this.cols = cols;
    this.rows = rows;
    this.steps = new Uint16Array(cols * rows).fill(NONE);
    const queue = new Int32Array(cols * rows);
    let head = 0, tail = 0;
    const start = to.row * cols + to.col;
    this.steps[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const here = queue[head++], c = here % cols, r = (here / cols) | 0;
      for (const [dc, dr] of NEIGHBOURS) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const n = nr * cols + nc;
        if (this.steps[n] !== NONE || !open(nc, nr)) continue;
        if (dc && dr && (!open(c + dc, r) || !open(c, r + dr))) continue;
        this.steps[n] = this.steps[here] + 1;
        queue[tail++] = n;
      }
    }
  }

  /** The point to head for next from a spot: the middle of the next plot on the way, or the end. */
  next(at: Vec): Vec {
    const c = Math.floor(at.x / this.size.w), r = Math.floor(at.y / this.size.h);
    const centre = (col: number, row: number) => ({ x: (col + 0.5) * this.size.w, y: (row + 0.5) * this.size.h });
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return centre(this.to.col, this.to.row);
    let best = this.steps[r * this.cols + c], to: [number, number] | null = null;
    for (const [dc, dr] of NEIGHBOURS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
      const s = this.steps[nr * this.cols + nc];
      if (s < best) { best = s; to = [nc, nr]; }
    }
    return to ? centre(to[0], to[1]) : centre(this.to.col, this.to.row);
  }
}
