import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';
import { outOf, skirt, type Flames } from '../machi/flames';

export const LIFE = 4;          // blows it takes to bring down
export const WALK = 36;         // sprite pixels per second along the ground
export const SIGHT = 300;       // further than this he does not notice anyone
export const RANGE = 190;       // he closes to this before shooting
// How far to one side of her he heads while he is still well off, and how near he comes before he turns straight in.
const ROUND = 170, RING = 26, ARRIVED = 0.35; // how near he begins to go round her, how far outside his reach, and how near his side counts as reached
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
export const GIRTH = 9;         // how far his body reaches from where he stands
const FLEE = 1.6;               // how much faster than his walk he gets out of a fire
/**
 * One who holds a post walks round it while nobody is about, rather than standing there waiting:
 * to a spot on his ground within `reach` of it, at `pace`, where he stands a while (`rest`, seconds)
 * before the next.
 */
export const PATROL = { reach: 140, pace: WALK * 0.55, rest: [1.5, 4] as [number, number] };

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
  /** Seconds he is quickened for, as by a sergeant's shout: he walks and reloads faster. */
  quick = 0;
  /** He goes for whoever he is after however far off they are: he was sent, and does not have to catch sight of them. */
  relentless = false;
  /** Seconds he is still after whoever struck him, however far off they are. */
  provoked = 0;
  /** He walks round his post while nobody is about (one who holds a post does): see PATROL. */
  patrols = false;
  /** Where his round takes him next, and how long he stands before setting off again. */
  private goal: Vec | null = null;
  private resting = 0;

  /** Struck, or one of his own struck nearby: he goes after them for a while, wherever they are. */
  provoke(seconds: number): void {
    if (this.alive) this.provoked = Math.max(this.provoked, seconds);
  }
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
      this.quick = Math.max(0, this.quick - dt);
      this.reload = Math.max(0, this.reload - dt * (this.quick > 0 ? 1.5 : 1));
      this.rest = Math.max(0, this.rest - dt);
      this.provoked = Math.max(0, this.provoked - dt);
    }
    // Offset to her on the ground, and how far that is.
    const to = her ? { x: her.x - this.x, y: (her.y - this.y) / ISO_Y } : null;
    const far = to ? Math.hypot(to.x, to.y) : Infinity;

    // Whoever stands in fire gets out of it before anything else.
    if (this.mode === 'stand' || this.mode === 'walk' || this.mode === 'aim' || this.mode === 'lower') {
      const out = outOf(this, this.fires, GIRTH);
      if (out) {
        const pace = WALK * FLEE * (this.quick > 0 ? 1.5 : 1);
        this.enter('walk');
        this.look(out);
        this.move(out.x * pace * dt, out.y * pace * dt);
        return NOTHING;
      }
    }

    switch (this.mode) {
      case 'stand':
      case 'walk': {
        if (!to || (far > SIGHT && !this.relentless && this.provoked <= 0)) return this.patrol(dt);
        this.look(to);
        if (far < NEAR) {
          if (this.rest <= 0) { this.enter('slash'); this.landed = false; } else this.enter('stand');
          return NOTHING;
        }
        if (far <= RANGE && this.reload <= 0) { this.enter('aim'); return NOTHING; }
        // Out of range he closes; in range and reloading he comes on more
        // slowly, so standing off does not keep him at bay for ever.
        const pace = (far > RANGE ? WALK : WALK * 0.5) * (this.quick > 0 ? 1.5 : 1);
        const found = this.way(to, far, dt);
        // Nowhere to go that comes nearer her: he stands and waits, his gun ready if he has one.
        if (!found) { this.enter('stand'); return NOTHING; }
        // Round any fire in his way.
        const way = skirt(this, found, this.fires, GIRTH);
        this.enter('walk');
        this.move(way.x * pace * dt, way.y * pace * dt);
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

  /** The ground alight about him, which he keeps out of (the field's, shared). */
  fires: readonly Flames[] = [];

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
    const reach = NEAR, ring = reach + RING;
    const side = Math.atan2(this.flank.y, this.flank.x), at = Math.atan2(-to.y, -to.x);
    let turn = side - at;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    if (far > ROUND || Math.abs(turn) < ARRIVED || (this.flank.x === 0 && this.flank.y === 0)) return { x: to.x / (far || 1), y: to.y / (far || 1) };
    // Round her, the short way, and in or out toward the ring.
    const out = { x: -to.x / far, y: -to.y / far }, sign = Math.sign(turn);
    const tx = -out.y * sign, ty = out.x * sign, pull = Math.max(-1, Math.min(1, (far - ring) / RING));
    const x = tx - out.x * pull, y = ty - out.y * pull, len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
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
    // Back at his post he is a fresh man: he no longer remembers who struck him (he came back
    // hunting them), nor any shout that quickened him.
    this.provoked = 0;
    this.quick = 0;
    this.goal = null;
    this.resting = 0;
    this.enter('stand');
  }

  // Nobody about: one who holds a post walks round it, stands a while at each spot, and goes on.
  private patrol(dt: number): Deed {
    if (!this.patrols || this.resting > 0) {
      this.resting = Math.max(0, this.resting - dt);
      this.enter('stand');
      return NOTHING;
    }
    // A spot on his ground near his post, if one can be found.
    for (let tries = 0; !this.goal && tries < 6; tries++) {
      const a = this.rnd() * Math.PI * 2, r = PATROL.reach * (0.3 + 0.7 * this.rnd());
      const spot = { x: this.home.x + Math.cos(a) * r, y: this.home.y + Math.sin(a) * r * ISO_Y };
      if (!this.ground || this.ground(spot.x, spot.y)) this.goal = spot;
    }
    const rest = () => { this.goal = null; this.resting = PATROL.rest[0] + this.rnd() * (PATROL.rest[1] - PATROL.rest[0]); this.enter('stand'); return NOTHING; };
    if (!this.goal) return rest();
    const to = { x: this.goal.x - this.x, y: (this.goal.y - this.y) / ISO_Y }, far = Math.hypot(to.x, to.y);
    if (far < 6) return rest();
    this.look(to);
    this.enter('walk');
    const was = { x: this.x, y: this.y }, step = PATROL.pace * dt;
    this.move(to.x / far * step, to.y / far * step);
    // Something in the way: he stands, and picks another spot after.
    if (Math.hypot(this.x - was.x, (this.y - was.y) / ISO_Y) < step * 0.2) return rest();
    return NOTHING;
  }
}
