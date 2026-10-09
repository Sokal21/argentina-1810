import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';

/** Inti's greatest power: the spirit jaguar she calls to her side. */
export const NAHUEL = {
  call: 0.9,      // seconds she beats her drum to call it
  comes: 0.5,     // seconds into that at which it appears
  time: 12,       // seconds it stays
  appear: 0.45,   // seconds it takes to come out of the light
  fade: 0.6,      // and to go back into it
  run: 120,       // sprite pixels per second along the ground
  reach: 26,      // ground distance from which it strikes, beyond its prey's own girth
  strike: 0.55,   // a whole attack, from gathering itself
  lands: 0.3,     // seconds into it at which the claws come down
  damage: 2,      // what they do
  heel: 46,       // ground distance it keeps from her when there is nothing to hunt
};

export type Mode = 'appear' | 'stand' | 'run' | 'strike' | 'fade' | 'gone';

/** Something it can hunt: where it stands, how far its body reaches, and whether it still stands. */
export interface Prey { x: number; y: number; girth: number; alive: boolean }

/**
 * How the nahuel behaves, with nothing drawn. Called up beside her, it runs
 * down whatever enemy is nearest and tears at it, one after another, until
 * its time is up; with nothing to hunt it comes back to heel. It is a
 * spirit: nothing can hurt it.
 *
 * Positions are the spot on the ground under it, in the same units as hers:
 * vertical distances on screen are half what they are on the ground.
 */
export class NahuelBrain {
  x = 0;
  y = 0;
  mode: Mode = 'gone';
  /** Seconds spent in the current mode. */
  t = 0;
  /** Seconds left before it starts to fade. */
  left = 0;
  /** Which way it faces across the screen: 1 right, -1 left. */
  faceX = 1;
  /** Whether it heads up the screen, showing its back. */
  back = false;

  private landed = false;

  /** It is there to be seen and to draw enemies off. */
  get present(): boolean {
    return this.mode !== 'gone';
  }

  /** It is fully there: hunting, and drawing enemies to itself. */
  get hunting(): boolean {
    return this.mode === 'stand' || this.mode === 'run' || this.mode === 'strike';
  }

  /** How much of its time is left, from 1 down to 0. */
  share(time = NAHUEL.time): number {
    return this.present ? Math.max(0, Math.min(1, this.left / time)) : 0;
  }

  /** Calls it up at a spot, for so many seconds. */
  summon(at: Vec, time = NAHUEL.time): void {
    this.x = at.x;
    this.y = at.y;
    this.left = time;
    this.enter('appear');
  }

  /**
   * Advances it. `prey` is everything it might hunt and `her` where she
   * stands. Returns the one its claws came down on this step, if any.
   */
  update(dt: number, prey: Prey[], her: Vec): Prey | null {
    if (this.mode === 'gone') return null;
    this.t += dt;
    if (this.mode === 'fade') {
      if (this.t >= NAHUEL.fade) this.enter('gone');
      return null;
    }
    this.left -= dt;
    if (this.mode === 'appear') {
      if (this.t >= NAHUEL.appear) this.enter('stand');
      return null;
    }
    // Its time runs out between attacks, not in the middle of one.
    if (this.left <= 0 && this.mode !== 'strike') { this.enter('fade'); return null; }

    const quarry = this.nearest(prey);
    if (this.mode === 'strike') {
      if (this.t >= NAHUEL.strike) this.enter('stand');
      if (this.landed || this.t < NAHUEL.lands) return null;
      this.landed = true;
      // It tears whatever is still in front of it when the claws come down.
      return quarry && this.gap(quarry) <= NAHUEL.reach * 1.5 + quarry.girth ? quarry : null;
    }

    if (quarry) {
      this.look(quarry);
      if (this.gap(quarry) <= NAHUEL.reach + quarry.girth) {
        this.enter('strike');
        this.landed = false;
        return null;
      }
      this.towards(quarry, NAHUEL.run * dt);
      this.enter('run');
      return null;
    }
    // Nothing to hunt: it keeps to her heel.
    if (this.gap(her) > NAHUEL.heel) {
      this.look(her);
      this.towards(her, NAHUEL.run * dt);
      this.enter('run');
    } else {
      this.enter('stand');
    }
    return null;
  }

  /**
   * Whether something standing at `spot` would rather go for it than for
   * her: it draws off those it is nearer to than she is.
   */
  lures(spot: Vec, her: Vec): boolean {
    return this.hunting && this.gap(spot) < Math.hypot(her.x - spot.x, (her.y - spot.y) / ISO_Y);
  }

  private nearest(prey: Prey[]): Prey | null {
    let best: Prey | null = null;
    for (const p of prey) {
      if (p.alive && (!best || this.gap(p) < this.gap(best))) best = p;
    }
    return best;
  }

  // Ground distance to a point.
  private gap(to: Vec): number {
    return Math.hypot(to.x - this.x, (to.y - this.y) / ISO_Y);
  }

  private look(to: Vec): void {
    if (Math.abs(to.x - this.x) > 1) this.faceX = to.x >= this.x ? 1 : -1;
    this.back = to.y < this.y;
  }

  // Moves so far along the ground toward a point, without overshooting it.
  private towards(to: Vec, step: number): void {
    const dx = to.x - this.x, dy = (to.y - this.y) / ISO_Y;
    const far = Math.hypot(dx, dy) || 1;
    const go = Math.min(step, far);
    this.x += dx / far * go;
    this.y += dy / far * go * ISO_Y;
  }

  private enter(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.t = 0;
  }
}
