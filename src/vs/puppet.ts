// The other player of a versus, as this side sees them: not played here, only shown. Their own game
// runs them; many times a second it sends how they stand (`poseOf`), and here a puppet takes that
// pose, offering the 3D figures the same face a controller does (what cabral.ts and inti.ts read).
import type { Arm, MachiController, Vec } from '../machi/controller';
import type { Flying } from '../three/orbs';
import type { Pose } from './link';

/** What of a controller the 3D figures read. */
export type Posed = Pick<MachiController,
  'x' | 'y' | 'isMoving' | 'isAttacking' | 'attackShare' | 'castShare' | 'isDashing' | 'isChanneling' | 'channelling'
  | 'channelShare' | 'isSwinging' | 'isShouldering' | 'arming' | 'faces' | 'steer' | 'dashes' | 'haste'>;

/** What else is not in the controller: how they are hurt, raging, aiming; and her lights. */
export interface Besides {
  fallen: boolean;
  hurt: number;
  rage: number;
  sick: number;
  scorched: number;
  aimed: Vec | null;
  dashTime: number;
  /** Life left, as a share. */
  life: number;
  /** The way she casts, and whether locked on. */
  castWay: Vec | null;
  locked: boolean;
  /** Her orbs in flight, her lightning about to fall, her healing, her calling. */
  flying: readonly Flying[];
  waiting: readonly { x: number; y: number; share: number }[];
  healing: number | null;
  calling: number | null;
  /** Her nahuel, while it is out: as its brain has it (what three/nahuel.ts reads). */
  nahuel: Beast | null;
}

/** The nahuel as its figure reads it. */
export interface Beast { x: number; y: number; mode: string; t: number; faceX: number; back: boolean; present: boolean }

const round = (n: number) => Math.round(n * 100) / 100;

/** How one stands, to be sent: kept short, as it goes many times a second. */
export function poseOf(c: Posed, b: Besides): Pose {
  const arming = c.arming;
  return {
    x: round(c.x), y: round(c.y),
    mv: c.isMoving, at: c.isAttacking, as: c.attackShare === null ? null : round(c.attackShare), cs: c.castShare,
    da: c.isDashing, dn: c.dashes, ch: c.channelling, chs: c.channelShare === null ? null : round(c.channelShare),
    sw: c.isSwinging, sh: c.isShouldering,
    ak: arming?.kind ?? null, ap: arming?.phase ?? null, aT: arming ? round(arming.t) : 0, aS: arming?.shoulder ?? 0, aF: arming?.shot ?? 0,
    f: [round(c.faces.x), round(c.faces.y)], st: c.steer ? [round(c.steer.x), round(c.steer.y)] : null, ha: c.haste,
    fa: b.fallen, hu: round(b.hurt), ra: round(b.rage), si: round(b.sick), sc: round(b.scorched),
    am: b.aimed ? [round(b.aimed.x), round(b.aimed.y)] : null, dt: b.dashTime, li: round(b.life),
    cw: b.castWay ? [round(b.castWay.x), round(b.castWay.y)] : null, lk: b.locked,
    fl: b.flying.flatMap(o => [o.id, round(o.x), round(o.y), round(o.z)]),
    wa: b.waiting.flatMap(w => [round(w.x), round(w.y), round(w.share)]),
    he: b.healing === null ? null : round(b.healing), ca: b.calling === null ? null : round(b.calling),
    nh: b.nahuel ? [round(b.nahuel.x), round(b.nahuel.y), round(b.nahuel.t), b.nahuel.faceX, b.nahuel.back ? 1 : 0] : null,
    nm: b.nahuel?.mode ?? null,
  };
}

/** Further than this between two poses (a fall and a rise, far off) and they are put there, not slid. */
const JUMP = 160;
/** How quickly the drawn spot catches up with the last one sent, a share a second. */
const FOLLOW = 18;

export class Puppet implements Posed {
  x = 0;
  y = 0;
  /** Where the last pose had them: the drawn spot slides after it. */
  private to: Vec = { x: 0, y: 0 };
  private seen = false;
  isMoving = false;
  isAttacking = false;
  attackShare: number | null = null;
  castShare: number | null = null;
  isDashing = false;
  dashes = 0;
  channelling: string | null = null;
  channelShare: number | null = null;
  isSwinging = false;
  isShouldering = false;
  arming: MachiController['arming'] = null;
  faces: Vec = { x: 0, y: 1 };
  steer: Vec | null = null;
  haste = 1;
  besides: Besides = {
    fallen: false, hurt: 0, rage: 0, sick: 0, scorched: 0, aimed: null, dashTime: 0.5, life: 1,
    castWay: null, locked: false, flying: [], waiting: [], healing: null, calling: null, nahuel: null,
  };

  get isChanneling(): boolean { return this.channelling !== null; }

  /** Takes a pose as it came. */
  take(p: Pose): void {
    const n = (v: unknown, or = 0) => typeof v === 'number' ? v : or;
    const v = (v: unknown): Vec | null => Array.isArray(v) ? { x: v[0], y: v[1] } : null;
    this.to = { x: n(p.x), y: n(p.y) };
    if (!this.seen || Math.hypot(this.to.x - this.x, this.to.y - this.y) > JUMP) { this.x = this.to.x; this.y = this.to.y; }
    this.seen = true;
    this.isMoving = !!p.mv;
    this.isAttacking = !!p.at;
    this.attackShare = typeof p.as === 'number' ? p.as : null;
    this.castShare = typeof p.cs === 'number' ? p.cs : null;
    this.isDashing = !!p.da;
    this.dashes = n(p.dn);
    this.channelling = typeof p.ch === 'string' ? p.ch : null;
    this.channelShare = typeof p.chs === 'number' ? p.chs : null;
    this.isSwinging = !!p.sw;
    this.isShouldering = !!p.sh;
    this.arming = typeof p.ak === 'string' && typeof p.ap === 'string'
      ? { kind: p.ak as Arm, phase: p.ap as 'raise' | 'aim' | 'fire', t: n(p.aT), shoulder: n(p.aS, 0.5), shot: n(p.aF, 0.5) } : null;
    this.faces = v(p.f) ?? this.faces;
    this.steer = v(p.st);
    this.haste = n(p.ha, 1);
    const fl = Array.isArray(p.fl) ? p.fl : [], wa = Array.isArray(p.wa) ? p.wa : [];
    const flying: Flying[] = [];
    for (let i = 0; i + 3 < fl.length; i += 4) flying.push({ id: fl[i], x: fl[i + 1], y: fl[i + 2], z: fl[i + 3] });
    const waiting: { x: number; y: number; share: number }[] = [];
    for (let i = 0; i + 2 < wa.length; i += 3) waiting.push({ x: wa[i], y: wa[i + 1], share: wa[i + 2] });
    this.besides = {
      fallen: !!p.fa, hurt: n(p.hu), rage: n(p.ra), sick: n(p.si), scorched: n(p.sc), aimed: v(p.am), dashTime: n(p.dt, 0.5), life: n(p.li, 1),
      castWay: v(p.cw), locked: !!p.lk, flying, waiting,
      healing: typeof p.he === 'number' ? p.he : null, calling: typeof p.ca === 'number' ? p.ca : null,
      nahuel: Array.isArray(p.nh) && typeof p.nm === 'string'
        ? { x: p.nh[0], y: p.nh[1], t: p.nh[2], faceX: p.nh[3], back: !!p.nh[4], mode: p.nm, present: p.nm !== 'gone' } : null,
    };
  }

  /** Whether any pose has come yet. */
  get there(): boolean { return this.seen; }

  /** The drawn spot slides toward the last one sent. */
  step(dt: number): void {
    const k = Math.min(1, dt * FOLLOW);
    this.x += (this.to.x - this.x) * k;
    this.y += (this.to.y - this.y) * k;
  }
}
