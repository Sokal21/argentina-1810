// The machi's movement, turning and attack rules, with no rendering: feed it
// the held directions each step and read back which frame to draw and where.
import {
  ATTACK_SLOW, ATTACK_TIME, ATTACK_UNWIND, COAST_GRACE, FPS, IDLE_REST, ISO_Y,
  PIVOT_DRIFT, PIVOT_STOP, SHEETS, SPEED, TURNS, TURN_FPS, VIEW_ORDER,
  type Sheet, type Turn, type View,
} from './data';

export interface MachiInput {
  /** -1 left, 1 right, 0 neither. */
  dx: number;
  /** -1 up, 1 down, 0 neither. */
  dy: number;
  attack: boolean;
}

export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

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
  key: string;
  rest: string[];
  t: number;
  /** She was already moving when it began, so a pivot keeps some momentum. */
  coasting: boolean;
  /** Direction she was travelling in, for a pivot's drift. */
  from: { x: number; y: number };
}

function turnPath(from: View, to: View): string[] {
  if (TURNS[`${from}>${to}`]) return [`${from}>${to}`];
  const a = VIEW_ORDER.indexOf(from), b = VIEW_ORDER.indexOf(to), step = Math.sign(b - a);
  const path: string[] = [];
  // Neighbours without a turn sheet are simply skipped.
  for (let i = a; i !== b; i += step) {
    const key = `${VIEW_ORDER[i]}>${VIEW_ORDER[i + step]}`;
    if (TURNS[key]) path.push(key);
  }
  return path;
}

const turnLength = (turn: Turn) => turn.frames.length / (turn.fps ?? TURN_FPS);

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

  constructor(private bounds?: Bounds) {}

  get view(): View {
    if (this.straight) return this.faceY < 0 ? 'north' : 'south';
    if (this.faceY < 0) return 'back';
    return this.level ? 'front' : 'down';
  }

  get isMoving(): boolean { return this.moving; }
  get isAttacking(): boolean { return this.attack !== null; }

  update(dt: number, input: MachiInput): void {
    this.updateAttack(dt, input.attack);
    const { dx, dy } = input;
    const wasMoving = this.moving;
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving !== wasMoving) this.t = 0;
    this.t += dt;
    if (!this.moving) { this.turn = null; this.idle += dt; return; }

    // Releasing one key just before pressing the next leaves a few frames
    // with nothing held; that must not cancel the turn or its momentum.
    const coasting = wasMoving || this.idle < COAST_GRACE;
    this.idle = 0;
    const prevView = this.view, prevFaceX = this.faceX;

    this.straight = dx === 0;
    this.level = dy === 0;
    if (dx) this.faceX = dx;
    this.faceY = dy || 1;

    const view = this.view;
    if (view !== prevView || this.faceX !== prevFaceX) {
      // Leaving a straight view can turn to either side; between two diagonal
      // views a turn only makes sense if the side stays the same.
      const sameSide = this.faceX === prevFaceX || prevView === 'north' || prevView === 'south';
      const flip = `${prevView}:${prevFaceX}>${view}:${this.faceX}`;
      const path = TURNS[flip] ? [flip] : sameSide ? turnPath(prevView, view) : [];
      this.turn = path.length
        ? { key: path[0], rest: path.slice(1), t: 0, coasting, from: this.dir } : null;
    } else if (this.turn) {
      this.turn.t += dt;
      if (this.turn.t >= turnLength(TURNS[this.turn.key])) {
        this.turn = this.turn.rest.length
          ? { ...this.turn, key: this.turn.rest[0], rest: this.turn.rest.slice(1), t: 0 } : null;
      }
    }

    // During a pivot she drifts the old way while slowing down (or stands
    // still if she started from rest) only for the first PIVOT_STOP of the
    // turn, then already moves the new way, picking up speed quickly so the
    // middle of the turn is not static.
    const len = Math.hypot(dx, dy);
    let vx = dx / len, vy = dy / len;
    const pivot = this.turn && TURNS[this.turn.key];
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
  private updateAttack(dt: number, held: boolean): void {
    if (held) {
      this.attack = this.attack === null ? 0 : (this.attack + dt) % ATTACK_TIME;
    } else if (this.attack !== null) {
      const sheet: Sheet | undefined = SHEETS[`attack_${this.view}`];
      if (sheet && this.attack >= (sheet.cast ?? sheet.frames) / sheet.frames * ATTACK_TIME) {
        this.attack += dt;
        if (this.attack >= ATTACK_TIME) this.attack = null;
      } else {
        this.attack -= dt * ATTACK_UNWIND;
        if (this.attack <= 0) this.attack = null;
      }
    }
  }

  pose(): MachiPose {
    const turn = this.turn && TURNS[this.turn.key];
    const view = this.view;
    let name = turn ? turn.sheet : `${this.moving ? 'trot' : 'idle'}_${view}`;
    const casting = this.attack !== null && !turn && !!SHEETS[`attack_${view}`];
    if (casting) name = `attack_${view}`;
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
