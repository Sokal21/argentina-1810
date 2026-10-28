import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';
import { outOf, skirt, type Flames } from '../machi/flames';

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
  /** He shoots: from how far, how long he aims (the warning), how long before the shot his aim stops following, how long until he can again, how high the ball leaves from, and how long he stands after it (lowering his pistol: walking, his feet slid). */
  shot?: { range: number; aim: number; lock: number; reload: [number, number]; muzzle: number; after?: number; damage?: number };
  /** Once whoever he is after is within his shot he walks no more: down on one knee, he stays, and no blow moves him. */
  stays?: boolean;
  /** No blow moves him, nor puts him off his aim. */
  steady?: boolean;
  /**
   * He lunges at whoever is between `from` and `to` off: stands drawn back for `charge` seconds (the
   * warning), then throws himself `dash` along the ground at her and thrusts, landing at `hit`, as far
   * as `reach` from where he has got to (stopping short of going through her); done at `time`, and not
   * again for `every`. It takes as much as his blow.
   */
  lunge?: { from: number; to: number; charge: number; dash: number; hit: number; reach: number; time: number; every: number };
  /**
   * He calls up more of his men, his sabre raised: first `first` seconds after he has seen her, then
   * every `every`; it takes `time`, and they are called at `at` of it, `many` at a time, never more
   * than `most` of those he called standing at once (the field keeps count).
   */
  call?: { first: number; every: number; time: number; at: number; many: number; most: number };
  /**
   * He strikes whoever is nearer than `near`: how long the whole blow takes, when in it it lands, how far it reaches, how long he stands before another,
   * and how much life it takes (one if not said); with `press`, he keeps after her as he swings, at that share of his pace, until his last cut lands.
   */
  blow?: { near: number; time: number; hit: number; reach: number; rest: number; damage?: number; again?: { hit: number; reach: number }; press?: number };
  /** He rallies those about him: how often, how long the shout takes, how far it carries, and for how long it quickens them. */
  rally?: { every: number; time: number; reach: number; lasts: number };
  /** Below half his life he comes on this many times faster. */
  fury?: number;
  /** He comes straight in for his blow, not round to a side of her first as the others do. */
  rushes?: boolean;
  /**
   * He retches at whoever is between `from` and `to` off: stands, his head thrown at her, for `time`
   * seconds, and not again for `every`. The pool it leaves (tropa/vomit.ts) is laid by one `tall` high.
   */
  retch?: { from: number; to: number; time: number; every: number; tall: number };
  /** He comes up out of the earth (`rise`): it takes `time` seconds, and for the first `under` of them he is under it, not to be struck. */
  rises?: { time: number; under: number };
  /** How much of what fire does (a grenade's blast, burning) he takes; all of it if not said. */
  fire?: number;
  /** What bringing him down is worth, in experience and in reales. */
  worth: number;
  spoils: number;
}

/** How tall the plague-dead soldier is drawn (three/realista.ts), for the pool he leaves, which is as big as he is. */
export const APESTADO_DRAWN = 88;

export const KINDS = {
  // No musket: he runs at whoever he sees and cuts. Soon down, if he can be caught.
  // Two cuts at a time (Mixamo's Standing Melee Combo Attack, at its own pace: faster read as frantic):
  // straight before him first (frame 18 of 52), its point 50 off, then a backhand nearer (frame 32);
  // measured on the model.
  // He comes straight in, swings as soon as he is within reach, and a quarter faster than the clip's own
  // pace (at it he ran up and stood, the user found, 26/10/2026: 0.75, 2.15 and 1.33; near 44, rest 0.4).
  // His reach is half as long again, and he keeps after whoever steps back as he swings, a little faster
  // than a hero walks: walking away no longer gets clear of him; a dodge does (reach 50 and 40 till then).
  sableador: { id: 'sableador', name: 'Sableador', life: 3, girth: 9, pace: 96, sight: 340, rushes: true, blow: { near: 62, time: 1.72, hit: 0.6, reach: 75, rest: 0.2, again: { hit: 1.06, reach: 62 }, press: 1.35 }, worth: 7, spoils: 4 },
  // Walks up slowly until whoever he is after is within his shot, then kneels and never moves again; shoots from further and oftener than anyone. Helpless up close.
  tirador: { id: 'tirador', name: 'Tirador', life: 2, girth: 11, pace: 30, stays: true, sight: 460, shot: { range: 440, aim: 1.1, lock: 0.3, reload: [1.6, 2.2], muzzle: 22 }, worth: 8, spoils: 5 },
  // Slow, hard to bring down, a wide sweep with his halberd, and a shout that quickens his men.
  // His blow is a heavy two-handed one (tools/blender/anims/golpe_pesado.py): long in the coming, to be
  // dodged; it sweeps across before him from his right, its head passing 100 to 110 from him (measured
  // on the model: its reach), and takes twice what any other blow or ball takes.
  // Fire does him a fifth of what it does others: one grenade all but killed him (the user, 26/10/2026).
  sargento: { id: 'sargento', name: 'Sargento', life: 8, girth: 11, pace: 30, sight: 320, fire: 0.2, blow: { near: 95, time: 1.3, hit: 0.5, reach: 110, rest: 0.8, damage: 2 }, rally: { every: 9, time: 2.0, reach: 260, lasts: 5 }, worth: 20, spoils: 12 },
  // Whoever commands the column, and the hardest of them to bring down: a pistol from afar, a long
  // thrust up close, a lunge from between the two, a shout that quickens his men as the sergeant's
  // does, and more of his men called up now and again, his sabre raised; no blow moves him, his ball
  // and his sabre each take twice what others do, and he is worse once he is hurt. His thrust takes a second, so his arm is drawn back by its end (Mixamo's
  // Stabbing, al_frente.py); his lunge is that thrust, held drawn back first and thrown forward.
  capitan: {
    id: 'capitan', name: 'El capitán', life: 40, girth: 10, pace: 44, sight: 420, steady: true,
    shot: { range: 230, aim: 0.7, lock: 0.2, reload: [2.4, 3.2], muzzle: 34, after: 0.8, damage: 2 },
    blow: { near: 52, time: 1.0, hit: 0.4, reach: 60, rest: 0.5, damage: 2 },
    lunge: { from: 90, to: 220, charge: 0.6, dash: 170, hit: 0.95, reach: 60, time: 1.95, every: 5 },
    rally: { every: 12, time: 2.0, reach: 260, lasts: 5 }, call: { first: 8, every: 18, time: 2.0, at: 0.6, many: 2, most: 4 },
    // Fire does him a fifth of what it does others, as it does the sergeant (the user, 26/10/2026).
    fire: 0.2, fury: 1.5, worth: 80, spoils: 60,
  },
  // The frontier soldier of 1879, Inti's enemy (27 October 2026): a modern rifle, breech-loaded, so
  // he shoots from further and oftener than the royalists, and quicker to the aim; up close, his
  // bayonet (Mixamo's Bayonet Stab, its point furthest out at frame 22 of 62, some 66 off at his
  // height: played half as fast again, it lands at 0.6 s and he is back on guard by 1.1).
  frontera: { id: 'frontera', name: 'Soldado de frontera', life: 4, girth: 9, pace: 36, sight: 380, shot: { range: 300, aim: 0.7, lock: 0.2, reload: [1.4, 2.0], muzzle: 30 }, blow: { near: 50, time: 1.1, hit: 0.6, reach: 62, rest: 0.5 }, worth: 9, spoils: 6 },
  // The plague-dead soldier, Inti's arc's tank (27 October 2026, docs/personajes/apestado.md): he comes
  // up out of the earth near her (the ground heaving 0.8 s, then his getting up, Mixamo's Zombie Stand
  // Up played in 3 s); slow and hard to bring down, and no blow moves him; up close a heavy swipe
  // (Mixamo's zombie attack, his hand furthest out at frame 20 of 48, some 53 off: played so it lands
  // at 1.3 s, long in the coming, to be dodged) taking 3 of her 5; and from further off he retches a
  // pool before him that slows and plagues her, played on his scream. Now and then, from further off
  // still, he charges (else she kept well away from him, the user found): he roars, then runs at her
  // straight the way he was looking, and swipes as he reaches her, as heavily as his swipe.
  apestado: {
    id: 'apestado', name: 'Apestado', life: 14, girth: 13, pace: 26, sight: 420, steady: true, rushes: true,
    blow: { near: 60, time: 2.0, hit: 1.3, reach: 72, rest: 0.6, damage: 3 },
    lunge: { from: 150, to: 380, charge: 0.7, dash: 240, hit: 1.75, reach: 72, time: 2.7, every: 8 },
    retch: { from: 80, to: 220, time: 2.0, every: 7, tall: APESTADO_DRAWN / Math.sqrt(1 - ISO_Y * ISO_Y) },
    rises: { time: 3.8, under: 1.2 }, worth: 25, spoils: 12,
  },
} satisfies Record<string, Kind>;
export type KindName = keyof typeof KINDS;

// How far to one side of her one heads while still well off, and how near one comes before turning straight in.
const ROUND = 170, RING = 26, ARRIVED = 0.35; // how near he begins to go round her, how far outside his reach, and how near his side counts as reached
/** How much faster than his walk one gets out of a fire. */
export const FLEE = 1.6;
export const DYING = 1.2;   // seconds he takes to fall
export const RETURNS = 7;   // seconds until one who is not at a post is back
/** How much faster one who has been rallied walks and reloads. */
export const QUICKENED = 1.5;

export type Mode = 'stand' | 'walk' | 'aim' | 'blow' | 'lunge' | 'rally' | 'call' | 'retch' | 'rise' | 'dying' | 'gone';

/** What a step of his produced. */
export interface Deed {
  shot?: { x: number; y: number; height: number; dx: number; dy: number; damage?: number };
  cut?: boolean;
  /** He has shouted: those within this far of him are quickened for so long. */
  rally?: { reach: number; lasts: number };
  /** He has called up more of his men: so many, so long as no more than `most` he called are standing. */
  call?: { many: number; most: number };
  /** He has begun to retch, from here, the way he faces (along the ground): his pool is to be laid. */
  retch?: { x: number; y: number; dx: number; dy: number };
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
  /** Seconds he is still after whoever struck him, however far off they are. */
  provoked = 0;
  /** The ground alight about him, which he keeps out of (the field's, shared). */
  fires: readonly Flames[] = [];

  /** Struck, or one of his own struck nearby: he goes after them for a while, wherever they are. */
  provoke(seconds: number): void {
    if (this.alive) this.provoked = Math.max(this.provoked, seconds);
  }
  ground?: (x: number, y: number) => boolean;

  private reload: number;
  private rest = 0;
  /** Seconds he still stands after a shot. */
  private still = 0;
  /** Seconds until he can lunge again. */
  private lunging = 3;
  /** Seconds until he can retch again. */
  private retching = 2;
  /** Seconds until he calls up more of his men, counted while he has someone to fight. */
  private calling = 0;
  private shout: number;
  private done = false;
  private twice = false;
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
    this.calling = kind.call?.first ?? 0;
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
      this.still = Math.max(0, this.still - dt);
      this.lunging = Math.max(0, this.lunging - dt);
      this.retching = Math.max(0, this.retching - dt);
      this.shout = Math.max(0, this.shout - dt);
      this.provoked = Math.max(0, this.provoked - dt);
    }
    const to = her ? { x: her.x - this.x, y: (her.y - this.y) / ISO_Y } : null;
    const far = to ? Math.hypot(to.x, to.y) : Infinity;

    // Whoever stands in fire gets out of it before anything else, even one who kneels to shoot.
    if ((this.mode === 'stand' || this.mode === 'walk' || this.mode === 'aim') && k.pace) {
      const out = outOf(this, this.fires, k.girth);
      if (out) {
        this.enter('walk');
        this.look(out);
        this.move(out.x * k.pace * haste * FLEE * dt, out.y * k.pace * haste * FLEE * dt);
        return NOTHING;
      }
    }

    switch (this.mode) {
      case 'stand':
      case 'walk': {
        if (!to || (far > k.sight && !this.relentless && this.provoked <= 0)) { this.enter('stand'); return NOTHING; }
        this.look(to);
        this.calling -= dt;
        if (k.call && this.calling <= 0 && this.still <= 0) { this.enter('call'); this.done = false; return NOTHING; }
        if (k.blow && far < k.blow.near) {
          if (this.rest <= 0) { this.enter('blow'); this.done = false; } else this.enter('stand');
          return NOTHING;
        }
        if (k.rally && this.shout <= 0) { this.enter('rally'); this.done = false; return NOTHING; }
        if (k.retch && this.retching <= 0 && far >= k.retch.from && far <= k.retch.to) {
          this.enter('retch');
          this.look(to);
          return { retch: { x: this.x, y: this.y, dx: this.dir.x, dy: this.dir.y } };
        }
        if (k.lunge && this.lunging <= 0 && this.still <= 0 && far >= k.lunge.from && far <= k.lunge.to) { this.enter('lunge'); this.done = false; return NOTHING; }
        if (k.shot && far <= k.shot.range && this.reload <= 0) { this.enter('aim'); return NOTHING; }
        if (!k.pace || this.still > 0 || (k.stays && k.shot && far <= k.shot.range)) { this.enter('stand'); return NOTHING; }
        // One who shoots and is in range comes on slowly while he reloads; anyone else comes straight on.
        const hurt = k.fury && this.life <= this.max / 2 ? k.fury : 1;
        const pace = k.pace * haste * hurt * (k.shot && far <= k.shot.range ? 0.5 : 1);
        const found = this.way(to, far, dt);
        // Nowhere to go that comes nearer her: he stands and waits, his gun ready if he has one.
        if (!found) { this.enter('stand'); return NOTHING; }
        // Round any fire in his way.
        const way = skirt(this, found, this.fires, k.girth);
        this.enter('walk');
        this.move(way.x * pace * dt, way.y * pace * dt);
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
        this.still = s.after ?? 0;
        return { shot: { x: this.x, y: this.y, height: s.muzzle, dx: this.dir.x, dy: this.dir.y, damage: s.damage } };
      }
      case 'blow': {
        const b = k.blow!;
        if (to && this.t < b.hit * 0.6) this.look(to);
        // One who presses keeps after her until his last cut lands, as long as she is not already well within it.
        if (to && b.press && this.t < (b.again?.hit ?? b.hit) && far > (this.done && b.again ? b.again.reach : b.reach) * 0.6) {
          this.look(to);
          const step = k.pace * b.press * haste * dt;
          this.move(this.dir.x * step, this.dir.y * step);
        }
        if (this.t >= b.time) { this.enter('stand'); this.rest = b.rest; }
        // A second cut, if his blow has one, once the first has landed.
        if (this.done && b.again && !this.twice && this.t >= b.again.hit) {
          this.twice = true;
          return { cut: !!to && far <= b.again.reach };
        }
        if (this.done || this.t < b.hit) return NOTHING;
        this.done = true;
        this.twice = false;
        return { cut: !!to && far <= b.reach };
      }
      case 'lunge': {
        const l = k.lunge!;
        if (this.t >= l.time) { this.enter('stand'); this.lunging = l.every; return NOTHING; }
        // Drawn back, following her with his eyes; then thrown at her, no further than his reach short of her.
        if (this.t < l.charge) { if (to) this.look(to); return NOTHING; }
        if (this.t < l.hit && (!to || far > l.reach * 0.6)) {
          const step = dt * l.dash / (l.hit - l.charge);
          this.move(this.dir.x * step, this.dir.y * step);
        }
        if (this.done || this.t < l.hit) return NOTHING;
        this.done = true;
        return { cut: !!to && far <= l.reach };
      }
      case 'retch':
        // His head thrown at her the way he began: the pool lies where it was aimed.
        if (this.t >= k.retch!.time) { this.enter('stand'); this.retching = k.retch!.every; }
        return NOTHING;
      case 'rise':
        if (this.t >= (k.rises?.time ?? 0)) this.enter('stand');
        else if (to) this.look(to);
        return NOTHING;
      case 'call': {
        const c = k.call!;
        if (this.t >= c.time) { this.enter('stand'); this.calling = c.every; }
        if (this.done || this.t < c.time * c.at) return NOTHING;
        this.done = true;
        return { call: { many: c.many, most: c.most } };
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
    if (!this.alive || this.under) return;
    this.life -= amount;
    if (this.life <= 0) { this.enter('dying'); return; }
    // A blow knocks his aim off, and moves him; not one who stays where he is, nor one who is steady.
    if (this.kind.steady) return;
    if (this.mode === 'aim') this.enter('stand');
    if (!this.kind.pace || this.kind.stays) return;
    const len = Math.hypot(dx, dy) || 1;
    this.move(dx / len * 3, dy / len * 3 / ISO_Y);
  }

  /** Still under the earth he is coming up out of: not to be struck. */
  get under(): boolean {
    return this.mode === 'rise' && this.t < (this.kind.rises?.under ?? 0);
  }

  /** Comes up out of the earth here, whole, facing her if she is given. */
  rise(x: number, y: number, her?: Vec): void {
    this.x = x;
    this.y = y;
    this.life = this.max;
    this.rest = 0;
    this.retching = 2;
    this.mode = 'rise';
    this.t = 0;
    if (her) this.look({ x: her.x - x, y: (her.y - y) / ISO_Y });
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

  /**
   * Which way round her he comes at: an offset on the ground, up to a step long, set by whoever
   * commands him. Far off he heads for a point that far to one side of her, and turns straight
   * in only as he closes, so that a squad comes at her from several sides and not in a knot.
   */
  flank = { x: 0, y: 0 };

  /** Eases him aside by so much along the ground, as far as the ground lets him: someone else is where he stands. */
  shove(dx: number, dy: number): void {
    if (this.alive) this.move(dx, dy);
  }

  /** Finds the way to her round what is in the way, if he is given one: which way to go, or nothing if he cannot get to her. */
  route?: { way(at: Vec): Vec | null; reaches(at: Vec): boolean };
  /** How far he got over the last little while, to know when he has stuck. */
  private progress = { t: 0, x: 0, y: 0, stuck: 0 };

  // Whether the ground is clear in a straight line from him toward her, as far as `far`.
  private clear(to: Vec, far: number): boolean {
    const on = this.ground;
    if (!on) return true;
    const len = Math.hypot(to.x, to.y) || 1;
    for (let d = 16; d < far; d += 16) if (!on(this.x + to.x / len * d, this.y + to.y / len * d * ISO_Y)) return false;
    return true;
  }

  // The way he walks: straight, or round her to his side, while nothing is in the way; round
  // whatever is, by the route, when something is or when he has stuck. Null: she cannot be got
  // to from where he is, and he had better stand.
  private way(to: Vec, far: number, dt: number): Vec | null {
    const p = this.progress;
    p.t += dt;
    if (p.t > 0.6) {
      p.stuck = Math.hypot(this.x - p.x, this.y - p.y) < 6 ? p.stuck + 1 : 0;
      p.t = 0; p.x = this.x; p.y = this.y;
    }
    if (!this.route) return this.toward(to, far);
    if (!this.route.reaches(this) ) return null;
    if (p.stuck === 0 && this.clear(to, far)) return this.toward(to, far);
    return this.route.way(this) ?? this.toward(to, far);
  }

  // The way he walks toward her. Far off, straight at her. Nearer, he goes round her, just
  // outside his reach, to his own side of her (his flank), and only then closes in: a squad that
  // came together ends up round her and not in a knot in front, where one swing takes them all.
  private toward(to: { x: number; y: number }, far: number): { x: number; y: number } {
    const reach = (this.kind.blow?.near ?? 60), ring = reach + RING;
    const side = Math.atan2(this.flank.y, this.flank.x), at = Math.atan2(-to.y, -to.x);
    let turn = side - at;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    if (this.kind.rushes || far > ROUND || Math.abs(turn) < ARRIVED || (this.flank.x === 0 && this.flank.y === 0)) return { x: to.x / (far || 1), y: to.y / (far || 1) };
    // Round her, the short way, and in or out toward the ring.
    const out = { x: -to.x / far, y: -to.y / far }, sign = Math.sign(turn);
    const tx = -out.y * sign, ty = out.x * sign, pull = Math.max(-1, Math.min(1, (far - ring) / RING));
    const x = tx - out.x * pull, y = ty - out.y * pull, len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
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
    this.still = 0;
    this.lunging = 3;
    this.calling = this.kind.call?.first ?? 0;
    this.quick = 0;
    this.enter('stand');
  }
}
