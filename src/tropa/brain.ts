import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';

// The rest of the king's men, each kind told apart by what it is given
// here and nothing else: one brain serves them all. A kind may shoot, may
// strike whoever comes near, may walk or stay where it is, and may rally
// those about it. Nothing is drawn.

/** What makes one kind of soldier what it is. */
export interface Kind {
  id: string;
  name: string;
  /** Blows it takes to bring down, and how far its body reaches from where it stands. */
  life: number;
  girth: number;
  /** Sprite pixels a second along the ground; none for one who stays where he is. */
  pace: number;
  /** Further than this he does not notice anyone. */
  sight: number;
  /** He shoots: from how far, how long he aims (the warning), how long before the shot his aim stops following, how long until he can again, and how high the ball leaves from. */
  shot?: { range: number; aim: number; lock: number; reload: [number, number]; muzzle: number };
  /** He strikes whoever is nearer than `near`: how long the whole blow takes, when in it it lands, how far it reaches, and how long he stands before another. */
  blow?: { near: number; time: number; hit: number; reach: number; rest: number };
  /** He rallies those about him: how often, how long the shout takes, how far it carries, and for how long it quickens them. */
  rally?: { every: number; time: number; reach: number; lasts: number };
  /** Below half his life he comes on this many times faster. */
  fury?: number;
  /** What bringing him down is worth, in experience and in reales. */
  worth: number;
  spoils: number;
}

export const KINDS = {
  // No musket: he runs at whoever he sees and cuts. Soon down, if he can be caught.
  sableador: { id: 'sableador', name: 'Sableador', life: 3, girth: 9, pace: 96, sight: 340, blow: { near: 42, time: 0.55, hit: 0.3, reach: 46, rest: 0.7 }, worth: 7, spoils: 4 },
  // Behind his basket of earth he never moves, and shoots from further and oftener than anyone. Helpless up close.
  tirador: { id: 'tirador', name: 'Tirador', life: 2, girth: 11, pace: 0, sight: 460, shot: { range: 440, aim: 1.1, lock: 0.3, reload: [1.6, 2.2], muzzle: 22 }, worth: 8, spoils: 5 },
  // Slow, hard to bring down, a wide sweep with his halberd, and a shout that quickens his men.
  sargento: { id: 'sargento', name: 'Sargento', life: 8, girth: 11, pace: 30, sight: 320, blow: { near: 54, time: 0.9, hit: 0.55, reach: 62, rest: 0.6 }, rally: { every: 9, time: 0.9, reach: 260, lasts: 5 }, worth: 20, spoils: 12 },
  // Whoever commands the column: a pistol from afar, a long thrust up close, and worse once he is hurt.
  capitan: { id: 'capitan', name: 'El capitán', life: 14, girth: 10, pace: 44, sight: 420, shot: { range: 230, aim: 0.7, lock: 0.2, reload: [2.4, 3.2], muzzle: 34 }, blow: { near: 52, time: 0.7, hit: 0.4, reach: 60, rest: 0.5 }, fury: 1.5, worth: 80, spoils: 60 },
} satisfies Record<string, Kind>;
export type KindName = keyof typeof KINDS;

export const DYING = 1.2;   // seconds he takes to fall
export const RETURNS = 7;   // seconds until one who is not at a post is back
/** How much faster one who has been rallied walks and reloads. */
export const QUICKENED = 1.5;

export type Mode = 'stand' | 'walk' | 'aim' | 'blow' | 'rally' | 'dying' | 'gone';

/** What a step of his produced. */
export interface Deed {
  shot?: { x: number; y: number; height: number; dx: number; dy: number };
  cut?: boolean;
  /** He has shouted: those within this far of him are quickened for so long. */
  rally?: { reach: number; lasts: number };
}

const NOTHING: Deed = {};

export class TroopBrain {
  x: number;
  y: number;
  mode: Mode = 'stand';
  /** Seconds spent in the current mode. */
  t = 0;
  life: number;
  max: number;
  /** Which way he faces across the screen, and whether he shows his back. */
  faceX = 1;
  back = false;
  dir: Vec = { x: 1, y: 0 };
  /** As in the fusilier: back by himself after a while, or only when called; after whoever he seeks however far; kept to ground he can walk. */
  returns = true;
  relentless = false;
  ground?: (x: number, y: number) => boolean;

  private reload: number;
  private rest = 0;
  private shout: number;
  private done = false;
  private quick = 0;
  private home: Vec;

  constructor(readonly kind: Kind, x: number, y: number, private rnd: () => number = Math.random) {
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.life = this.max = kind.life;
    // Neither shot nor shout comes the moment he is first seen.
    this.reload = 0.8 + this.rnd() * 0.8;
    this.shout = 2 + this.rnd() * 3;
  }

  get alive(): boolean {
    return this.mode !== 'dying' && this.mode !== 'gone';
  }

  /** Quickens him for a while, as a sergeant's shout does. */
  hurry(seconds: number): void {
    this.quick = Math.max(this.quick, seconds);
  }
  get hurried(): boolean {
    return this.quick > 0;
  }

  update(dt: number, her: Vec | null): Deed {
    this.t += dt;
    const k = this.kind, haste = this.quick > 0 ? QUICKENED : 1;
    if (this.alive) {
      this.quick = Math.max(0, this.quick - dt);
      this.reload = Math.max(0, this.reload - dt * haste);
      this.rest = Math.max(0, this.rest - dt);
      this.shout = Math.max(0, this.shout - dt);
    }
    const to = her ? { x: her.x - this.x, y: (her.y - this.y) / ISO_Y } : null;
    const far = to ? Math.hypot(to.x, to.y) : Infinity;

    switch (this.mode) {
      case 'stand':
      case 'walk': {
        if (!to || (far > k.sight && !this.relentless)) { this.enter('stand'); return NOTHING; }
        this.look(to);
        if (k.blow && far < k.blow.near) {
          if (this.rest <= 0) { this.enter('blow'); this.done = false; } else this.enter('stand');
          return NOTHING;
        }
        if (k.rally && this.shout <= 0) { this.enter('rally'); this.done = false; return NOTHING; }
        if (k.shot && far <= k.shot.range && this.reload <= 0) { this.enter('aim'); return NOTHING; }
        if (!k.pace) { this.enter('stand'); return NOTHING; }
        // One who shoots and is in range comes on slowly while he reloads; anyone else comes straight on.
        const hurt = k.fury && this.life <= this.max / 2 ? k.fury : 1;
        const pace = k.pace * haste * hurt * (k.shot && far <= k.shot.range ? 0.5 : 1);
        this.enter('walk');
        this.move(this.dir.x * pace * dt, this.dir.y * pace * dt);
        return NOTHING;
      }
      case 'aim': {
        const s = k.shot!;
        // Anyone who gets inside his guard makes him drop the shot, if he has anything to meet them with.
        if (to && k.blow && far < k.blow.near) { this.enter('stand'); return NOTHING; }
        if (to && this.t < s.aim - s.lock) this.look(to);
        if (this.t < s.aim) return NOTHING;
        this.enter('stand');
        this.reload = s.reload[0] + this.rnd() * (s.reload[1] - s.reload[0]);
        return { shot: { x: this.x, y: this.y, height: s.muzzle, dx: this.dir.x, dy: this.dir.y } };
      }
      case 'blow': {
        const b = k.blow!;
        if (to && this.t < b.hit * 0.6) this.look(to);
        if (this.t >= b.time) { this.enter('stand'); this.rest = b.rest; }
        if (this.done || this.t < b.hit) return NOTHING;
        this.done = true;
        return { cut: !!to && far <= b.reach };
      }
      case 'rally': {
        const r = k.rally!;
        if (this.t >= r.time) { this.enter('stand'); this.shout = r.every; }
        if (this.done || this.t < r.time * 0.5) return NOTHING;
        this.done = true;
        return { rally: { reach: r.reach, lasts: r.lasts } };
      }
      case 'dying':
        if (this.t >= DYING) this.enter('gone');
        return NOTHING;
      case 'gone':
        if (this.returns && this.t >= RETURNS) this.respawn();
        return NOTHING;
    }
  }

  /** Struck by something travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number, amount = 1): void {
    if (!this.alive) return;
    this.life -= amount;
    if (this.life <= 0) { this.enter('dying'); return; }
    // A blow knocks his aim off; one who stays where he is is not moved by it.
    if (this.mode === 'aim') this.enter('stand');
    if (!this.kind.pace) return;
    const len = Math.hypot(dx, dy) || 1;
    this.move(dx / len * 3, dy / len * 3 / ISO_Y);
  }

  vanish(): void {
    this.returns = false;
    this.mode = 'gone';
    this.t = 0;
  }

  revive(): void {
    if (!this.alive) this.respawn();
  }

  private enter(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.t = 0;
  }

  private look(to: Vec): void {
    const len = Math.hypot(to.x, to.y) || 1;
    this.dir = { x: to.x / len, y: to.y / len };
    if (Math.abs(to.x) > 1) this.faceX = to.x >= 0 ? 1 : -1;
    this.back = to.y < 0;
  }

  private move(dx: number, dy: number): void {
    const x = this.x + dx, y = this.y + dy * ISO_Y, on = this.ground;
    if (!on || on(x, y)) { this.x = x; this.y = y; }
    else if (on(x, this.y)) this.x = x;
    else if (on(this.x, y)) this.y = y;
  }

  private respawn(): void {
    this.x = this.home.x;
    this.y = this.home.y;
    this.life = this.max;
    this.reload = 0.8 + this.rnd() * 0.8;
    this.rest = 0;
    this.quick = 0;
    this.enter('stand');
  }
}
