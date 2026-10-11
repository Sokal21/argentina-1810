import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';

export const LIFE = 4;          // blows it takes to bring down
export const WALK = 36;         // sprite pixels per second along the ground
export const SIGHT = 300;       // further than this he does not notice anyone
export const RANGE = 190;       // he closes to this before shooting
export const NEAR = 48;         // closer than this he draws his sabre instead
export const AIM = 0.85;        // seconds from shouldering the musket to the shot: the warning
export const LOCK = 0.25;       // seconds before the shot at which his aim stops following
export const LOWER = 0.4;       // seconds he takes to bring the musket down again
export const RELOAD: [number, number] = [2.2, 3.2]; // seconds until he can fire again
export const SLASH_TIME = 0.8;  // a whole cut, from drawing the sabre
export const SLASH_HIT = 0.5;   // seconds into it at which the blade comes across
export const SLASH_REACH = 44;  // ground distance the cut covers
export const SLASH_REST = 0.45; // seconds he stands before he can cut again
export const MUZZLE = 30;       // height the ball leaves the barrel at
export const DYING = 1.2;       // seconds he takes to fall
export const RESPAWN = 7;       // seconds until he is back, so there is always one to fight

export type Mode = 'stand' | 'walk' | 'aim' | 'lower' | 'slash' | 'dying' | 'gone';

export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

/** What a step of his produced: a ball let fly, or the sabre landing. */
export interface Deed {
  /** Where the ball starts and the direction on the ground it flies in. */
  shot?: { x: number; y: number; height: number; dx: number; dy: number };
  cut?: boolean;
}

const NOTHING: Deed = {};

/**
 * How a royalist soldier behaves, with nothing drawn: he walks into musket
 * range, shoulders, aims and fires, and reloads; anyone who gets close he
 * meets with his sabre instead.
 *
 * Positions are the spot on the ground he stands on, in the same units as
 * hers: vertical distances on screen are half what they are on the ground.
 */
export class RealistaBrain {
  x: number;
  y: number;
  mode: Mode = 'stand';
  /** Seconds spent in the current mode. */
  t = 0;
  life = LIFE;
  /** How much he takes to bring down: more for one who commands. */
  max = LIFE;
  /** Which way he faces across the screen: 1 right, -1 left. */
  faceX = 1;
  /** Whether he faces up the screen, showing his back. */
  back = false;
  /** Unit direction on the ground he faces: toward her, or down his aim. */
  dir: Vec = { x: 1, y: 0 };

  /** Seconds until the musket is loaded. */
  private reload: number;
  /** Seconds until he can cut again. */
  private rest = 0;
  private landed = false;
  private home: Vec;
  /** Whether he is back on his own a while after he falls. One who holds a post is not: he waits to be called. */
  returns = true;
  /** He goes for whoever he is after however far off they are: he was sent, and does not have to catch sight of them. */
  relentless = false;
  /** The ground he can walk on, if not all of it. */
  ground?: (x: number, y: number) => boolean;

  constructor(x: number, y: number, private bounds?: Bounds, private rnd: () => number = Math.random) {
    this.x = x;
    this.y = y;
    this.home = { x, y };
    // He does not fire the moment he is first seen.
    this.reload = 0.8 + this.rnd() * 0.8;
  }

  /** He is on his feet and can be hit. */
  get alive(): boolean {
    return this.mode !== 'dying' && this.mode !== 'gone';
  }

  /** Advances him. `her` is where she stands, if she can be attacked. */
  update(dt: number, her: Vec | null): Deed {
    this.t += dt;
    if (this.alive) {
      this.reload = Math.max(0, this.reload - dt);
      this.rest = Math.max(0, this.rest - dt);
    }
    // Offset to her on the ground, and how far that is.
    const to = her ? { x: her.x - this.x, y: (her.y - this.y) / ISO_Y } : null;
    const far = to ? Math.hypot(to.x, to.y) : Infinity;

    switch (this.mode) {
      case 'stand':
      case 'walk': {
        if (!to || (far > SIGHT && !this.relentless)) { this.enter('stand'); return NOTHING; }
        this.look(to);
        if (far < NEAR) {
          if (this.rest <= 0) { this.enter('slash'); this.landed = false; } else this.enter('stand');
          return NOTHING;
        }
        if (far <= RANGE && this.reload <= 0) { this.enter('aim'); return NOTHING; }
        // Out of range he closes; in range and reloading he comes on more
        // slowly, so standing off does not keep him at bay for ever.
        const pace = far > RANGE ? WALK : WALK * 0.5;
        this.enter('walk');
        this.move(this.dir.x * pace * dt, this.dir.y * pace * dt);
        return NOTHING;
      }
      case 'aim': {
        // Anyone who gets inside his guard makes him drop the shot.
        if (to && far < NEAR) { this.enter('stand'); return NOTHING; }
        if (to && this.t < AIM - LOCK) this.look(to);
        if (this.t < AIM) return NOTHING;
        this.enter('lower');
        this.reload = RELOAD[0] + this.rnd() * (RELOAD[1] - RELOAD[0]);
        return { shot: { x: this.x, y: this.y, height: MUZZLE, dx: this.dir.x, dy: this.dir.y } };
      }
      case 'lower':
        if (this.t >= LOWER) this.enter('stand');
        return NOTHING;
      case 'slash': {
        if (to && this.t < SLASH_HIT * 0.6) this.look(to);
        if (this.t >= SLASH_TIME) { this.enter('stand'); this.rest = SLASH_REST; }
        if (this.landed || this.t < SLASH_HIT) return NOTHING;
        this.landed = true;
        return { cut: !!to && far <= SLASH_REACH };
      }
      case 'dying':
        if (this.t >= DYING) this.enter('gone');
        return NOTHING;
      case 'gone':
        if (this.returns && this.t >= RESPAWN) this.respawn();
        return NOTHING;
    }
  }

  /** Struck by something travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number, amount = 1): void {
    if (!this.alive) return;
    this.life -= amount;
    if (this.life <= 0) { this.enter('dying'); return; }
    // A blow knocks his aim off: he has to shoulder the musket again.
    if (this.mode === 'aim') this.enter('stand');
    const len = Math.hypot(dx, dy) || 1;
    this.move(dx / len * 3, dy / len * 3 / ISO_Y);
  }

  private enter(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.t = 0;
  }

  // Faces a point on the ground: the way he is drawn, and the way he aims.
  private look(to: Vec): void {
    const len = Math.hypot(to.x, to.y) || 1;
    this.dir = { x: to.x / len, y: to.y / len };
    if (Math.abs(to.x) > 1) this.faceX = to.x >= 0 ? 1 : -1;
    this.back = to.y < 0;
  }

  /** Takes him off the field at once, for good. */
  vanish(): void {
    this.returns = false;
    this.mode = 'gone';
    this.t = 0;
  }

  /** Puts him back at his post, whole, if he has fallen. */
  revive(): void {
    if (!this.alive) this.respawn();
  }

  // Moves along the ground; the vertical part is foreshortened on screen.
  // Ground he cannot walk on stops him, and he slides along its edge.
  private move(dx: number, dy: number): void {
    const x = this.x + dx, y = this.y + dy * ISO_Y, on = this.ground;
    if (!on || on(x, y)) { this.x = x; this.y = y; }
    else if (on(x, this.y)) this.x = x;
    else if (on(this.x, y)) this.y = y;
    if (!this.bounds) return;
    this.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.x));
    this.y = Math.min(this.bounds.maxY, Math.max(this.bounds.minY, this.y));
  }

  private respawn(): void {
    this.x = this.home.x;
    this.y = this.home.y;
    this.life = this.max;
    this.reload = 0.8 + this.rnd() * 0.8;
    this.rest = 0;
    this.enter('stand');
  }
}
