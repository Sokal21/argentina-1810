// What is drawn of a map's scenery. A map holds thousands of plants, posts
// and shadows, and the engine works out every one of them each frame whether
// or not it is on screen: nothing is left out for being far away. So the
// ground is ruled into squares, everything that stands still is kept by the
// square its foot is in, and only the squares near what the camera sees are
// shown.

/** The side of a square of ground, in world pixels. */
export const SQUARE = 256;

/** Something that stands in one place and can be hidden. */
export interface Standing {
  x: number;
  y: number;
  setVisible(shown: boolean): unknown;
  /** The ground its drawing covers. */
  getBounds(): { left: number; right: number; top: number; bottom: number };
}

interface Squares { left: number; right: number; top: number; bottom: number }

export class Sight {
  private squares = new Map<number, Standing[]>();
  /** How far the widest and the tallest drawing reaches from its foot: something whose foot is off screen may still show. */
  private reach = { x: 0, y: 0 };
  /** The squares now shown. */
  private shown: Squares | null = null;

  /** Takes charge of things that will not move again. They are hidden until looked at. */
  add(things: Standing[]): void {
    this.hide();
    for (const thing of things) {
      const bounds = thing.getBounds();
      this.reach.x = Math.max(this.reach.x, thing.x - bounds.left, bounds.right - thing.x);
      this.reach.y = Math.max(this.reach.y, thing.y - bounds.top, bounds.bottom - thing.y);
      const key = this.key(Math.floor(thing.x / SQUARE), Math.floor(thing.y / SQUARE));
      const square = this.squares.get(key);
      if (square) square.push(thing);
      else this.squares.set(key, [thing]);
      thing.setVisible(false);
    }
  }

  /** Shows what stands in or near a stretch of ground, and hides the rest. */
  look(view: { x: number; y: number; width: number; height: number }): void {
    const next: Squares = {
      left: Math.floor((view.x - this.reach.x) / SQUARE),
      right: Math.floor((view.x + view.width + this.reach.x) / SQUARE),
      top: Math.floor((view.y - this.reach.y) / SQUARE),
      bottom: Math.floor((view.y + view.height + this.reach.y) / SQUARE),
    };
    const was = this.shown;
    if (was && was.left === next.left && was.right === next.right && was.top === next.top && was.bottom === next.bottom) return;
    const within = (s: Squares, col: number, row: number) => col >= s.left && col <= s.right && row >= s.top && row <= s.bottom;
    if (was) this.each(was, (col, row) => { if (!within(next, col, row)) this.set(col, row, false); });
    this.each(next, (col, row) => { if (!was || !within(was, col, row)) this.set(col, row, true); });
    this.shown = next;
  }

  private hide(): void {
    if (this.shown) this.each(this.shown, (col, row) => this.set(col, row, false));
    this.shown = null;
  }

  private each(squares: Squares, visit: (col: number, row: number) => void): void {
    for (let row = squares.top; row <= squares.bottom; row++) {
      for (let col = squares.left; col <= squares.right; col++) visit(col, row);
    }
  }

  private set(col: number, row: number, shown: boolean): void {
    for (const thing of this.squares.get(this.key(col, row)) ?? []) thing.setVisible(shown);
  }

  // One number for a square, good for any map: a few thousand squares either way.
  private key(col: number, row: number): number {
    return (row + 4096) * 8192 + col + 4096;
  }
}
