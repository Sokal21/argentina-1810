// The machi's movement, turning and attack rules, with no rendering: feed it
// the held directions each step and read back which frame to draw and where.
import {
  ATTACK_SLOW, ATTACK_TIME, ATTACK_UNWIND, COAST_GRACE, FPS, IDLE_REST, ISO_Y,
  PIVOT_DRIFT, PIVOT_STOP, RETREAT_BELOW, SHEETS, SNAP_STICK, SPEED, STANDING_TURNS, TURNS, TURN_FPS, VIEW_ORDER,
  type Sheet, type Turn, type View,
} from './data';

/** A direction on the ground, any angle. x is right, y is toward the camera. */
export interface Vec { x: number; y: number }

export interface MachiInput {
  /** -1 left, 1 right, 0 neither. */
  dx: number;
  /** -1 up, 1 down, 0 neither. */
  dy: number;
  attack: boolean;
  /**
   * Walk this way instead of along dx/dy, at any angle. She is drawn in the
   * nearest of her eight views; only her path is free.
   */
  move?: Vec | null;
  /**
   * Where a spell should go, at any angle. While attacking she faces it, even
   * if she is walking another way. Without it spells follow her view.
   */
  aim?: Vec | null;
  /**
   * The point on screen (world pixels, as drawn) a spell should pass through:
   * the pointer. The spell is seen flying above the ground, so this is a
   * point of the picture, not a spot on the floor.
   */
  target?: Vec | null;
}

export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

/** A spell leaving the branch: where it starts and which way it goes. */
export interface Cast {
  /** Point on the ground under the branch tip. */
  x: number;
  y: number;
  /** Height of the branch tip above that point. */
  height: number;
  /** Direction along the ground; not necessarily unit length. */
  dx: number;
  dy: number;
}

/** What to draw this step. Position is where her feet are. */
export interface MachiPose {
  x: number;
  y: number;
  sheet: string;
  frame: number;
  flip: boolean;
  /** Body centre inside the unflipped frame, and vertical shift. */
  ax: number;
  ay: number;
}

interface ActiveTurn {
  /** The walking turns or the standing ones, whichever it started in. */
  table: Record<string, Turn>;
  key: string;
  rest: string[];
  t: number;
  /** She was already moving when it began, so a pivot keeps some momentum. */
  coasting: boolean;
  /** Direction she was travelling in, for a pivot's drift. */
  from: { x: number; y: number };
}

function turnPath(table: Record<string, Turn>, from: View, to: View): string[] {
  if (table[`${from}>${to}`]) return [`${from}>${to}`];
  const a = VIEW_ORDER.indexOf(from), b = VIEW_ORDER.indexOf(to), step = Math.sign(b - a);
  const path: string[] = [];
  // Neighbours without a turn sheet are simply skipped.
  for (let i = a; i !== b; i += step) {
    const key = `${VIEW_ORDER[i]}>${VIEW_ORDER[i + step]}`;
    if (table[key]) path.push(key);
  }
  return path;
}

const turnLength = (turn: Turn) => turn.frames.length / (turn.fps ?? TURN_FPS);

const MIN_AIM = 4; // a pointer this close to the branch tip gives no direction
const SECTOR = Math.PI / 4;
/**
 * A free direction snapped to the eight she can be drawn in. `prev` is the
 * last answer: it is kept until the direction is clearly inside another
 * sector, so a pointer sitting on a boundary does not flicker between two.
 */
export function snap8(v: Vec, prev: [number, number] | null): [number, number] {
  const angle = Math.atan2(v.y, v.x);
  if (prev) {
    let off = Math.abs(angle - Math.atan2(prev[1], prev[0]));
    if (off > Math.PI) off = 2 * Math.PI - off;
    if (off <= SECTOR / 2 + SNAP_STICK) return prev;
  }
  const centre = Math.round(angle / SECTOR) * SECTOR;
  // Adding zero turns a rounded -0 into 0, so comparisons against 0 hold.
  return [Math.round(Math.cos(centre)) + 0, Math.round(Math.sin(centre)) + 0];
}

export class MachiController {
  x = 0;
  y = 0;
  private faceX = -1;
  private faceY = 1;
  private straight = false; // moving purely up or down
  private level = true;     // moving purely sideways
  private moving = false;
  private t = 0;            // time in the current moving or standing state
  private idle = 1;         // time since she last moved
  private turn: ActiveTurn | null = null;
  private dir = { x: 0, y: 0 };
  /** Time into the current cast, or null when not attacking. */
  private attack: number | null = null;
  private cast: Cast | null = null;
  private snappedMove: [number, number] | null = null;
  private snappedAim: [number, number] | null = null;
  /** Walking against her aim, so she is drawn backing away. */
  private retreating = false;

  constructor(private bounds?: Bounds) {}

  get view(): View {
    if (this.straight) return this.faceY < 0 ? 'north' : 'south';
    if (this.faceY < 0) return 'back';
    return this.level ? 'front' : 'down';
  }

  get isMoving(): boolean { return this.moving; }
  get isAttacking(): boolean { return this.attack !== null; }

  /** The spell released during the last update, if any. Reading it clears it. */
  takeCast(): Cast | null {
    const cast = this.cast;
    this.cast = null;
    return cast;
  }

  update(dt: number, input: MachiInput): void {
    this.updateAttack(dt, input.attack, input.aim ?? null, input.target ?? null);

    // A free walking direction is drawn as the nearest of the eight.
    let { dx, dy } = input;
    const free = input.move ?? null;
    this.snappedMove = free ? snap8(free, this.snappedMove) : null;
    if (this.snappedMove) [dx, dy] = this.snappedMove;
    // While attacking with an aim she faces the aim, whichever way she walks.
    this.snappedAim = input.attack && input.aim ? snap8(input.aim, this.snappedAim) : null;

    const wasMoving = this.moving;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving !== wasMoving) this.t = 0;
    this.t += dt;
    if (!this.moving) {
      this.idle += dt;
      // Standing, she still turns on the spot to follow the aim.
      if (this.snappedAim) this.turnTo(this.snappedAim[0], this.snappedAim[1], dt, false);
      else this.turn = null;
      return;
    }

    // Releasing one key just before pressing the next leaves a few frames
    // with nothing held; that must not cancel the turn or its momentum.
    const coasting = wasMoving || this.idle < COAST_GRACE;
    this.idle = 0;
    const [fx, fy] = this.snappedAim ?? [dx, dy];
    this.turnTo(fx, fy, dt, coasting);

    // During a pivot she drifts the old way while slowing down (or stands
    // still if she started from rest) only for the first PIVOT_STOP of the
    // turn, then already moves the new way, picking up speed quickly so the
    // middle of the turn is not static.
    const len = Math.hypot(dx, dy);
    let vx = free ? free.x : dx / len, vy = free ? free.y : dy / len;
    // Compared against the view she is drawn in, not the exact aim, so it
    // does not flip while the pointer wanders inside one view.
    this.retreating = !!this.snappedAim && RETREAT_BELOW >
      (vx * this.snappedAim[0] + vy * this.snappedAim[1]) / Math.hypot(...this.snappedAim);
    const pivot = this.turn && this.turn.table[this.turn.key];
    if (this.turn && pivot && pivot.pivot) {
      const p = this.turn.t / turnLength(pivot);
      if (p >= PIVOT_STOP) {
        const k = Math.sqrt((p - PIVOT_STOP) / (1 - PIVOT_STOP));
        vx *= k; vy *= k;
      } else {
        const k = this.turn.coasting ? (1 - p / PIVOT_STOP) * PIVOT_DRIFT : 0;
        vx = this.turn.from.x * k; vy = this.turn.from.y * k;
      }
    } else {
      this.dir = { x: vx, y: vy };
    }
    const speed = SPEED * (this.attack !== null ? ATTACK_SLOW : 1);
    this.x += vx * speed * dt;
    this.y += vy * speed * ISO_Y * dt;

    if (this.bounds) {
      this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.x));
      this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.y));
    }
  }

  // While the key is down the cast loops forward, starting on its first
  // frame. Once it is released she returns to rest the short way: unwinding
  // the cast backwards, or, if the light has already left the branch, letting
  // the last frames play out.
  // Faces the given direction. If that changes the view, the turn frames
  // between the two start playing; otherwise a turn in progress moves on.
  private turnTo(dx: number, dy: number, dt: number, coasting: boolean): void {
    const prevView = this.view, prevFaceX = this.faceX;
    this.face(dx, dy);
    const view = this.view;
    if (view !== prevView || this.faceX !== prevFaceX) {
      // Leaving a straight view can turn to either side; between two diagonal
      // views a turn only makes sense if the side stays the same.
      const sameSide = this.faceX === prevFaceX || prevView === 'north' || prevView === 'south';
      const flip = `${prevView}:${prevFaceX}>${view}:${this.faceX}`;
      const table = this.moving ? TURNS : STANDING_TURNS;
      const path = table[flip] ? [flip] : sameSide ? turnPath(table, prevView, view) : [];
      this.turn = path.length
        ? { table, key: path[0], rest: path.slice(1), t: 0, coasting, from: this.dir } : null;
    } else if (this.turn) {
      this.turn.t += dt;
      if (this.turn.t >= turnLength(this.turn.table[this.turn.key])) {
        this.turn = this.turn.rest.length
          ? { ...this.turn, key: this.turn.rest[0], rest: this.turn.rest.slice(1), t: 0 } : null;
      }
    }
  }

  private face(dx: number, dy: number): void {
    this.straight = dx === 0;
    this.level = dy === 0;
    if (dx) this.faceX = dx;
    this.faceY = dy || 1;
  }

  private updateAttack(dt: number, held: boolean, aim: Vec | null, target: Vec | null): void {
    if (held) {
      if (this.attack === null) {
        this.attack = 0;
      } else {
        const before = this.attack, after = before + dt;
        this.releaseSpell(before, after, aim, target);
        this.attack = after % ATTACK_TIME;
      }
    } else if (this.attack !== null) {
      const sheet = this.castSheet();
      if (sheet && this.attack >= (sheet.cast ?? sheet.frames) / sheet.frames * ATTACK_TIME) {
        this.attack += dt;
        if (this.attack >= ATTACK_TIME) this.attack = null;
      } else {
        this.attack -= dt * ATTACK_UNWIND;
        if (this.attack <= 0) this.attack = null;
      }
    }
  }

  // The spell goes off the moment the animation reaches the frame where the
  // light has left the branch. Nothing is released mid-turn, when the cast is
  // not on screen, nor while a released key is unwinding it.
  private releaseSpell(before: number, after: number, aim: Vec | null, target: Vec | null): void {
    const sheet = this.castSheet();
    if (!sheet || sheet.cast === undefined || !sheet.muzzle || this.turn) return;
    const at = sheet.cast / sheet.frames * ATTACK_TIME;
    if (before >= at || after < at) return;
    const mirrored = sheet.faces !== 0 && this.faceX !== sheet.faces;
    const x = this.x + (mirrored ? -sheet.muzzle[0] : sheet.muzzle[0]);
    const height = sheet.muzzle[1];
    // Toward the aim if there is one, otherwise the way her view points.
    let dx = aim ? aim.x : this.straight ? 0 : this.faceX;
    let dy = aim ? aim.y : this.straight ? this.faceY : this.level ? 0 : this.faceY;
    if (target) {
      // The spell is drawn at the branch tip, off to one side of her and high
      // above the ground, and flies level from there. Aimed from her body it
      // would run parallel to the line she points along and miss the pointer
      // by that offset, so it is aimed from where it is actually seen to
      // start. Screen offsets become a ground direction by undoing the
      // foreshortening of the vertical.
      const sx = target.x - x, sy = (target.y - (this.y - height)) / ISO_Y;
      if (Math.hypot(sx, sy) > MIN_AIM) { dx = sx; dy = sy; }
    }
    this.cast = { x, y: this.y, height, dx, dy };
  }

  // Which of the three casts fits what her legs are doing: planted, backing
  // away from the aim, or walking.
  private castName(): string {
    const view = this.view;
    if (!this.moving) return `attack_still_${view}`;
    return this.retreating ? `retreat_${view}` : `attack_${view}`;
  }

  private castSheet(): Sheet | undefined {
    return SHEETS[this.castName()];
  }

  pose(): MachiPose {
    const turn = this.turn && this.turn.table[this.turn.key];
    const view = this.view;
    let name = turn ? turn.sheet : `${this.moving ? 'trot' : 'idle'}_${view}`;
    const casting = this.attack !== null && !turn && !!SHEETS[`attack_${view}`];
    // Standing still she casts with her feet planted.
    if (casting) name = this.castName();
    const s = SHEETS[name];
    const count = s.frames - s.skip;

    let frame: number;
    if (turn && this.turn) {
      frame = turn.frames[Math.floor(this.turn.t * (turn.fps ?? TURN_FPS))];
    } else if (casting) {
      frame = Math.min(s.frames - 1, Math.floor(this.attack! / ATTACK_TIME * s.frames));
    } else if (s.still !== undefined) {
      frame = s.still;
    } else if (!this.moving) {
      // Idle: she holds the standing pose for IDLE_REST seconds, plays the
      // gesture once, and rests again, instead of repeating it back to back.
      const phase = this.t % (IDLE_REST + count / FPS) - IDLE_REST;
      frame = phase < 0 ? 0 : s.skip + Math.floor(phase * FPS) % count;
    } else {
      frame = s.skip + Math.floor(this.t * FPS) % count;
    }

    return {
      x: this.x,
      y: this.y,
      sheet: name,
      frame,
      flip: s.faces !== 0 && this.faceX !== s.faces,
      ax: Array.isArray(s.ax) ? s.ax[frame] : s.ax,
      ay: s.ay ?? 0,
    };
  }
}
