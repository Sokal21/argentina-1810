import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';

export const LIFE = 2;          // spells it takes to bring down
export const HOVER = 40;        // height it flies at, above the ground
export const FLY = 55;          // sprite pixels per second while circling
export const RING = 95;         // ground distance it keeps from her while circling
export const NEAR = 42;         // closer than this it bites instead of diving
export const REACH = 170;       // further than this it does not attack at all
export const WAIT: [number, number] = [1.4, 2.6]; // seconds between attacks
export const WINDUP = 0.55;     // seconds of warning before a dive
export const DIVE_SPEED = 250;
export const DIVE_PAST = 45;    // how far beyond her a dive carries
export const DIVE_LOW = 22;     // height a dive comes down to
export const DIVE_HIT = 13;     // ground distance at which a dive catches her
export const RECOVER = 1.1;     // seconds it is slow and low after a dive
export const BITE_TIME = 0.6;   // a whole bite, from opening its mouth
export const BITE_SNAP = 0.4;   // seconds into a bite at which the jaws shut
export const BITE_REACH = 36;   // ground distance the snap covers
export const BITE_LUNGE = 8;    // pixels it jerks toward her as it snaps
export const DYING = 0.9;       // seconds it takes to fall
export const RESPAWN = 6;       // seconds until it is back, so there is always one to fight

export type Mode = 'fly' | 'windup' | 'dive' | 'recover' | 'bite' | 'dying' | 'gone';

export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

/**
 * How a chonchón behaves, with nothing drawn: it circles her out of reach,
 * dives at her from a distance and bites her up close.
 *
 * Positions are the spot on the ground under it, in the same units as hers:
 * vertical distances on screen are half what they are on the ground.
 */
export class ChonchonBrain {
  x: number;
  y: number;
  z = HOVER;
  mode: Mode = 'fly';
  /** Seconds spent in the current mode. */
  t = 0;
  life = LIFE;
  /** Which way it faces across the screen: 1 right, -1 left. */
  faceX = 1;
  /** Whether it is heading up the screen, showing the back of its head. */
  back = false;

  private wait: number;
  /** Sense it circles in, and seconds until it changes its mind. */
  private turn = 1;
  private swap = 0;
  /** Unit direction on the ground it is pointed along: at her, or down its dive. */
  dir: Vec = { x: 1, y: 0 };
  /** Ground distance left of a dive. */
  private left = 0;
  private snapped = false;
  private home: Vec;

  constructor(x: number, y: number, private bounds?: Bounds, private rnd: () => number = Math.random) {
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.wait = this.between(WAIT);
  }

  /** It is in the air and can be hit. */
  get alive(): boolean {
    return this.mode !== 'dying' && this.mode !== 'gone';
  }

  /**
   * Advances it. `her` is where she stands, if she can be attacked. Returns
   * true on the step its teeth reach her.
   */
  update(dt: number, her: Vec | null): boolean {
    this.t += dt;
    // Offset to her on the ground, and how far that is.
    const to = her ? { x: her.x - this.x, y: (her.y - this.y) / ISO_Y } : null;
    const far = to ? Math.hypot(to.x, to.y) : Infinity;

    switch (this.mode) {
      case 'fly': {
        if (!to) return false;
        this.look(to);
        this.circle(dt, to, far);
        // Pressed close it snaps sooner than it would otherwise attack.
        this.wait -= far < NEAR ? dt * 2 : dt;
        if (this.wait > 0 || far > REACH) return false;
        this.enter(far < NEAR ? 'bite' : 'windup');
        this.snapped = false;
        return false;
      }
      case 'windup': {
        if (to) this.look(to);
        if (this.t < WINDUP) return false;
        // The line is fixed here: where she was as it let go.
        this.left = (to ? far : 0) + DIVE_PAST;
        this.enter('dive');
        return false;
      }
      case 'dive': {
        const step = Math.min(this.left, DIVE_SPEED * dt);
        this.move(this.dir.x * step, this.dir.y * step);
        this.left -= step;
        this.z = Math.max(DIVE_LOW, this.z - (HOVER - DIVE_LOW) * dt / 0.15);
        if (this.left <= 0) this.enter('recover');
        if (this.snapped || !her) return false;
        const gap = Math.hypot(her.x - this.x, (her.y - this.y) / ISO_Y);
        return this.snapped = gap < DIVE_HIT;
      }
      case 'recover': {
        const p = Math.min(1, this.t / RECOVER);
        // Carries on a little, slowing, as it climbs back up.
        const drift = 40 * (1 - p) * dt;
        this.move(this.dir.x * drift, this.dir.y * drift);
        this.z = DIVE_LOW + (HOVER - DIVE_LOW) * p;
        if (p >= 1) this.rest();
        return false;
      }
      case 'bite': {
        if (to && this.t < BITE_SNAP) this.look(to);
        if (this.t >= BITE_TIME) this.rest();
        if (this.snapped || this.t < BITE_SNAP) return false;
        this.snapped = true;
        if (!to || far > BITE_REACH) return false;
        const len = far || 1;
        this.move(to.x / len * BITE_LUNGE, to.y / len * BITE_LUNGE);
        return true;
      }
      case 'dying':
        if (this.t >= DYING) this.enter('gone');
        return false;
      case 'gone':
        if (this.t >= RESPAWN) this.respawn();
        return false;
    }
  }

  /** Struck by a spell travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number, amount = 1): void {
    if (!this.alive) return;
    this.life -= amount;
    const len = Math.hypot(dx, dy) || 1;
    this.move(dx / len * 6, dy / len * 6 / ISO_Y);
    if (this.life <= 0) this.enter('dying');
  }

  // Closes to the ring around her, or backs off to it, while sliding round.
  private circle(dt: number, to: Vec, far: number): void {
    this.swap -= dt;
    if (this.swap <= 0) {
      this.swap = 2 + this.rnd() * 3;
      if (this.rnd() < 0.5) this.turn = -this.turn;
    }
    const len = far || 1;
    const ux = to.x / len, uy = to.y / len;
    const pull = Math.max(-1, Math.min(1, (far - RING) / 30));
    let vx = ux * pull - uy * this.turn * 0.8;
    let vy = uy * pull + ux * this.turn * 0.8;
    const speed = Math.hypot(vx, vy);
    if (speed > 1) { vx /= speed; vy /= speed; }
    this.move(vx * FLY * dt, vy * FLY * dt);
  }

  // Faces a direction on the ground, without flickering when it is nearly
  // straight above or beside it.
  private look(to: Vec): void {
    const len = Math.hypot(to.x, to.y);
    if (len > 0) this.dir = { x: to.x / len, y: to.y / len };
    if (Math.abs(to.x) > 4) this.faceX = to.x > 0 ? 1 : -1;
    if (Math.abs(to.y) > 8) this.back = to.y < 0;
  }

  // Moves it by an offset on the ground.
  private move(gx: number, gy: number): void {
    this.x += gx;
    this.y += gy * ISO_Y;
    if (!this.bounds) return;
    this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
    this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
  }

  private enter(mode: Mode): void {
    this.mode = mode;
    this.t = 0;
    if (mode === 'dive' || mode === 'recover') {
      this.faceX = this.dir.x >= 0 ? 1 : -1;
      this.back = this.dir.y < 0;
    }
  }

  // Back to circling, with a fresh wait before the next attack.
  private rest(): void {
    this.enter('fly');
    this.z = HOVER;
    this.wait = this.between(WAIT);
  }

  private respawn(): void {
    this.x = this.home.x;
    this.y = this.home.y;
    this.life = LIFE;
    this.rest();
  }

  private between([low, high]: [number, number]): number {
    return low + this.rnd() * (high - low);
  }
}
