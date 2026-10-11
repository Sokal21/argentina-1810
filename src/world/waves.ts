// Enemies that come in waves: so many at a time, the next lot only once the
// last of the lot before is down and a breath has passed, and an end when
// none are left to come. Nothing here is drawn, and nothing here knows what
// comes: it says when, and how many.

/** Seconds between the last of one wave falling and the next coming. */
export const BREATH = 2.5;

export class Waves {
  /** How many waves have come so far. */
  come = 0;
  private wait = 0;
  private over = false;

  /** @param sizes how many come in each wave, in order */
  constructor(readonly sizes: number[]) {}

  /** Whether the last of the last wave is down. */
  get won(): boolean {
    return this.over;
  }

  /**
   * Moves time on, told how many of those who have come are still standing.
   * Says how many come now, if a wave does; 'won' on the step it is over.
   */
  update(dt: number, standing: number): number | 'won' | null {
    if (this.over || standing > 0) return null;
    // The first comes at once; the others after a breath.
    if (this.come > 0 && (this.wait += dt) < BREATH) return null;
    this.wait = 0;
    if (this.come < this.sizes.length) return this.sizes[this.come++];
    this.over = true;
    return 'won';
  }
}
