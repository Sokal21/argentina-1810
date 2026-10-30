import { ISO_Y } from '../machi/data';
import type { Vec } from '../machi/controller';

// What the Wekufe does, himself (the second phase of his fight, docs/historia/inti/README.md): he floats,
// keeping his distance, and in turn, never the same twice running, he dives into the earth to come out beside
// her with his claws, throws his red fire, or calls up his lost souls. He thinks in the 2D game's terms, as
// the soldiers' brains do; three/wekufeFigure.ts shows him, and the game takes what he does to her.

/**
 * How he goes about it: how far from her he keeps and how fast he drifts there; how long he floats between
 * one thing and the next. Each clip's length and the moment that matters in it (measured on the model, see
 * docs/personajes/wekufe.md). His dive: how long he is under and how far from her he comes up, the place
 * shown all that while. His claws: how far they reach and what they take. His souls: how long they hurt once
 * called, what they take and how often, and how long before he calls them again.
 */
export const WEKUFE = {
  keep: 220, drift: 34, floats: [1.1, 2.1],
  dive: { time: 0.96, under: 1.2, beside: 70 },
  claw: { time: 2.12, from: 22.5 / 51, to: 27 / 51, reach: 105, damage: 2 },
  throw: { time: 2.08 },
  invoke: { time: 2.83, at: 40 / 68, lasts: 6, every: 1.2, damage: 1, again: 10 },
  dying: 3.2,
};

export type WekufeState = 'float' | 'dive' | 'under' | 'claw' | 'throw' | 'invoke' | 'dying';
const ATTACKS = ['dive', 'throw', 'invoke'] as const;

/** What a step of his did to her. */
export interface WekufeDeed {
  /** His claws have reached her: how much it takes. */
  clawed?: number;
  /** His souls have reached her: how much it takes. */
  haunted?: number;
}

const off = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, (a.y - b.y) / ISO_Y);

export class WekufeMind {
  state: WekufeState = 'float';
  /** Seconds in this state. */
  t = 0;
  /** Where he will come up, while he is under. */
  coming: Vec | null = null;
  /** How many times he has been set back as he was: what he had in the air goes. */
  resets = 0;
  /** Seconds his souls have still to hurt. */
  souls = 0;
  private wait: number;
  private last: (typeof ATTACKS)[number] | null = null;
  private clawed = false;
  private tick = 0;
  private again = 0;

  /** `reach`, how far off his souls hurt; `walkable`, the ground he may come up on. */
  constructor(public x: number, public y: number, private readonly reach: number, private readonly walkable: (x: number, y: number) => boolean, private readonly rnd: () => number = Math.random) {
    this.wait = WEKUFE.floats[1];
  }

  /** Not to be struck: under the earth, or as good as. */
  get under(): boolean {
    return this.state === 'under';
  }

  /** His life has run out. */
  die(): void {
    this.enter('dying');
    this.souls = 0;
  }

  /** As he was before the fight. */
  reset(x: number, y: number): void {
    this.resets++;
    this.x = x;
    this.y = y;
    this.souls = this.again = 0;
    this.coming = null;
    this.last = null;
    this.wait = WEKUFE.floats[1];
    this.enter('float');
  }

  update(dt: number, her: Vec | null): WekufeDeed {
    this.t += dt;
    this.again = Math.max(0, this.again - dt);
    const deed: WekufeDeed = {};
    if (this.state === 'dying') return deed;
    this.haunt(dt, her, deed);
    switch (this.state) {
      case 'float':
        if (!her) break;
        this.drift(dt, her);
        this.wait -= dt;
        if (this.wait <= 0) this.choose(her);
        break;
      case 'dive':
        if (this.t >= WEKUFE.dive.time) this.enter('under');
        break;
      case 'under':
        if (this.t >= WEKUFE.dive.under) {
          if (this.coming) { this.x = this.coming.x; this.y = this.coming.y; }
          this.coming = null;
          this.clawed = false;
          this.enter('claw');
        }
        break;
      case 'claw': {
        const { time, from, to, reach, damage } = WEKUFE.claw, share = this.t / time;
        if (!this.clawed && share >= from && share <= to && her && off(her, this) <= reach) {
          this.clawed = true;
          deed.clawed = damage;
        }
        if (this.t >= time) this.rest();
        break;
      }
      case 'throw':
        if (this.t >= WEKUFE.throw.time) this.rest();
        break;
      case 'invoke':
        if (this.t >= WEKUFE.invoke.time * WEKUFE.invoke.at && this.t - dt < WEKUFE.invoke.time * WEKUFE.invoke.at) { this.souls = WEKUFE.invoke.lasts; this.tick = 0; }
        if (this.t >= WEKUFE.invoke.time) this.rest();
        break;
    }
    return deed;
  }

  /** His souls, while they last, take from her whenever she is within their ring. */
  private haunt(dt: number, her: Vec | null, deed: WekufeDeed): void {
    if (this.souls <= 0) return;
    this.souls = Math.max(0, this.souls - dt);
    this.tick -= dt;
    if (this.tick > 0 || !her || off(her, this) > this.reach) return;
    this.tick = WEKUFE.invoke.every;
    deed.haunted = WEKUFE.invoke.damage;
  }

  /** Toward where he keeps from her, on ground he may be on. */
  private drift(dt: number, her: Vec): void {
    const far = off(her, this);
    if (far < 1) return;
    const sign = far > WEKUFE.keep ? 1 : -1, step = Math.min(WEKUFE.drift * dt, Math.abs(far - WEKUFE.keep));
    const x = this.x + (her.x - this.x) / far * step * sign, y = this.y + (her.y - this.y) / far * step * sign;
    if (this.walkable(x, y)) { this.x = x; this.y = y; }
  }

  /** Something other than what he did last; his souls not while they still hurt, nor soon after. */
  private choose(her: Vec): void {
    const open = ATTACKS.filter(a => a !== this.last && (a !== 'invoke' || (this.souls <= 0 && this.again <= 0)));
    const pick = open[Math.floor(this.rnd() * open.length)];
    this.last = pick;
    if (pick === 'dive') this.coming = this.beside(her);
    if (pick === 'invoke') this.again = WEKUFE.invoke.again;
    this.enter(pick);
  }

  /** Where he comes up: a little off her, on her side of him, or wherever round her he may. */
  private beside(her: Vec): Vec {
    const toward = Math.atan2((this.y - her.y) / ISO_Y, this.x - her.x);
    for (const turn of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
      const x = her.x + Math.cos(toward + turn) * WEKUFE.dive.beside, y = her.y + Math.sin(toward + turn) * WEKUFE.dive.beside * ISO_Y;
      if (this.walkable(x, y)) return { x, y };
    }
    return { x: her.x, y: her.y };
  }

  private rest(): void {
    this.wait = WEKUFE.floats[0] + this.rnd() * (WEKUFE.floats[1] - WEKUFE.floats[0]);
    this.enter('float');
  }

  private enter(state: WekufeState): void {
    this.state = state;
    this.t = 0;
  }
}
