// Something the hero has to bring somewhere: it comes along behind, slower
// than he walks, and whatever of the enemy gets near it wears it down. It
// goes where he has gone, step for step, so it never leaves the ground that
// can be walked. Nothing here is drawn.

type Vec = { x: number; y: number };

/** How far it keeps behind whoever it follows, and how far apart their steps are remembered, in pixels. */
export const BEHIND = 46, STEP = 10;
/** How near its own place a step of the way has to come back for the stretch before it to be skipped. */
export const LOOP = 28;
/** How near an enemy has to be to hurt it, and how often each one that is does, in seconds. */
export const REACH = 70, EVERY = 1.6;

export class Escort {
  x: number;
  y: number;
  life: number;
  /** Where whoever it follows has been, oldest first. */
  private way: Vec[] = [];
  private hurt = 0;
  /** Which way it last went across the screen: 1 right, -1 left. */
  facing: 1 | -1 = 1;
  /** Whether it moved on the last step. */
  moving = false;

  /**
   * @param start where it waits to be led off
   * @param max   blows it takes before it is lost
   * @param pace  pixels a second it moves at
   */
  constructor(private start: Vec, readonly max: number, readonly pace: number) {
    this.x = start.x;
    this.y = start.y;
    this.life = max;
  }

  get lost(): boolean {
    return this.life <= 0;
  }

  /** Comes along behind whoever leads it. */
  follow(dt: number, leader: Vec): void {
    const last = this.way[this.way.length - 1] ?? this;
    if (Math.hypot(leader.x - last.x, leader.y - last.y) >= STEP) this.way.push({ x: leader.x, y: leader.y });
    // Where the way comes back past it, the stretch before is a loop it has no need to walk: whoever
    // led it went off and came back, and following him out and back would take it away from him.
    // Only a true loop: the way has to have gone well away from it in between, not just begun beside it.
    const off = (p: Vec) => Math.hypot(p.x - this.x, p.y - this.y);
    for (let i = this.way.length - 1; i > 0; i--) {
      if (off(this.way[i]) > LOOP) continue;
      if (this.way.slice(0, i).some(p => off(p) > LOOP * 2)) this.way.splice(0, i);
      break;
    }
    const was = this.x, wasY = this.y;
    // As far as its pace takes it, and no nearer the leader than it keeps.
    for (let left = this.pace * dt; left > 0 && this.way.length * STEP > BEHIND;) {
      const next = this.way[0], far = Math.hypot(next.x - this.x, next.y - this.y);
      if (far <= left) { this.x = next.x; this.y = next.y; this.way.shift(); left -= far; continue; }
      this.x += (next.x - this.x) / far * left;
      this.y += (next.y - this.y) / far * left;
      left = 0;
    }
    this.moving = Math.hypot(this.x - was, this.y - wasY) > 0.01;
    if (Math.abs(this.x - was) > 0.01) this.facing = this.x > was ? 1 : -1;
  }

  /** A blow struck at it on purpose: one of its lives. */
  strike(): void {
    this.life = Math.max(0, this.life - 1);
  }

  /** Is worn down by whatever of the enemy is near. Says whether it was hurt on this step. */
  harm(dt: number, threats: Vec[]): boolean {
    const near = threats.filter(t => Math.hypot(t.x - this.x, t.y - this.y) <= REACH).length;
    if (!near) { this.hurt = 0; return false; }
    if ((this.hurt += dt) < EVERY) return false;
    this.hurt = 0;
    this.life = Math.max(0, this.life - near);
    return true;
  }

  /** Whether it has come within so far of somewhere. */
  at(place: Vec, within: number): boolean {
    return Math.hypot(place.x - this.x, place.y - this.y) <= within;
  }

  /** Puts it back where it began, whole, to be led off again. */
  reset(): void {
    this.x = this.start.x;
    this.y = this.start.y;
    this.life = this.max;
    this.way = [];
    this.hurt = 0;
  }
}
