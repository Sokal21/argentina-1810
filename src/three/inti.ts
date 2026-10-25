import * as THREE from 'three';
import type { MachiController, Vec } from '../machi/controller';
import { HEAL } from '../machi/abilities';
import { NAHUEL } from '../nahuel/brain';
import { flashes, model } from './figure';
import { Motion } from './motion';
import { along, ground, heading } from './space';
import { seenThrough } from './xray';
import type { Doing } from './cabral';

// Inti in 3D, doing whatever her controller says, as CabralFigure shows him: the clips the user chose
// from the Pro Magic Pack (docs/personajes/inti.md). Standing, idle_02; going, run_forward, played as
// fast as she goes; casting her orbs, 1h_magic_attack_02 standing and her four walks moving, turned to
// where she casts; the lightning, 1h_magic_attack_03; the healing, 2h_cast_spell_01; calling her
// nahuel, 2h_magic_area_attack_02; the dash, Mixamo's running slide; dying, react_death_forward. She
// does not react to blows (the user's choice): she only flashes red.

const CLIPS = {
  idle: 'idle_02', run: 'run_forward', cast: '1h_magic_attack_02', strike: '1h_magic_attack_03',
  heal: '2h_cast_spell_01', call: '2h_magic_area_attack_02', dash: 'derrape', death: 'react_death_forward',
  walk: { ahead: 'walk_forward', back: 'walk_back', left: 'walk_left', right: 'walk_right' },
};
/** How tall she is drawn, in sprite pixels: as in the gallery. */
const DRAWN = 81;
/**
 * The share of 1h_magic_attack_02 at which the light leaves her branch, and of 1h_magic_attack_03 at
 * which she brings the lightning down: the clip is held there when the controller's cast goes off.
 */
const RELEASE = { cast: 0.42, strike: 0.45 };
/** How long her call to the lightning is shown, in seconds. */
const STRIKE_TIME = 0.9;
/** How fast she turns, per second; how quickly what she is taken to go at follows how fast she goes. */
const TURN = 14, SETTLE = 10;
/** The slowest her run or walks are played, as a share of their own pace. */
const LEAST_PACE = 0.35;

export class IntiFigure {
  readonly group = new THREE.Group();
  private shaped: THREE.Group | null = null;
  private motion: Motion | null = null;
  private flash: (amount: number) => void = () => {};
  private reach: Record<string, number> = {};
  private facing = 0;
  private going = 0;
  private wasDashing = false;
  private wasChanneling = false;
  private wasFallen = false;
  /** Seconds left of her call to the lightning, once cast. */
  private striking = 0;

  constructor() {
    void model('machi/3d/inti_animado.glb', DRAWN).then(loaded => {
      this.shaped = loaded;
      this.motion = new Motion(loaded);
      this.flash = flashes(loaded);
      seenThrough(loaded);
      for (const name of [CLIPS.run, ...Object.values(CLIPS.walk)]) this.reach[name] = this.motion.reach(name, 'L_Foot') * loaded.scale.x;
      this.group.add(loaded);
    });
  }

  get model(): THREE.Group | null {
    return this.shaped;
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** She calls the lightning down on a patch: turned to it, her arm brought down. */
  strike(c: Vec, at: Vec): void {
    this.striking = STRIKE_TIME;
    this.facing = heading(at.x - c.x, at.y - c.y);
  }

  update(dt: number, c: MachiController, doing: Doing): void {
    const { from, fallen, dashTime } = doing;
    const moved = { x: c.x - from.x, y: c.y - from.y };
    const over = along(moved.x, moved.y).length() / Math.max(dt, 1e-3);
    this.going += (over - this.going) * Math.min(1, dt * SETTLE);
    const walking = Math.hypot(moved.x, moved.y) > 0.01;
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    this.striking = Math.max(0, this.striking - dt);
    // Casting she faces where she casts; otherwise, the way she goes. Rooted in a ritual she keeps her way.
    const casting = c.isAttacking;
    const look = c.steer ? Math.atan2(c.steer.x, c.steer.y) : Math.atan2(c.faces.x, c.faces.y);
    if (!fallen && !c.isChanneling && this.striking === 0) {
      const want = casting ? look : walking ? heading(moved.x, moved.y) : null;
      if (want !== null) this.facing += wrap(want - this.facing) * Math.min(1, dt * TURN);
    }
    const motion = this.motion;
    if (motion) {
      const paced = (name: string) => ({ pace: this.reach[name] ? Math.max(LEAST_PACE, this.going / this.reach[name]) : 1 });
      if (fallen) motion.play(CLIPS.death, { once: true, afresh: !this.wasFallen });
      else if (c.isDashing) motion.play(CLIPS.dash, { once: true, lasts: dashTime, afresh: !this.wasDashing, blend: 0.05 });
      else if (c.channelling === 'call') motion.play(CLIPS.call, { once: true, lasts: NAHUEL.call, afresh: !this.wasChanneling, blend: 0.08 });
      else if (c.isChanneling) motion.play(CLIPS.heal, { once: true, lasts: HEAL.time, afresh: !this.wasChanneling, blend: 0.08 });
      else if (this.striking > 0) motion.play(CLIPS.strike, { once: true, lasts: STRIKE_TIME, afresh: this.striking > STRIKE_TIME - dt, blend: 0.05 });
      else if (casting && walking) {
        // Her legs walk whichever of her four ways is nearest the way she goes, turned to where she casts.
        const off = wrap(heading(moved.x, moved.y) - this.facing), q = Math.round(off / (Math.PI / 2));
        const name = q === 0 ? CLIPS.walk.ahead : Math.abs(q) === 2 ? CLIPS.walk.back : q === 1 ? CLIPS.walk.left : CLIPS.walk.right;
        motion.play(name, paced(name));
      } else if (casting) {
        // Each orb leaves her branch the moment the controller looses it.
        const share = c.attackShare ?? 0, at = c.castShare ?? 0.75;
        const k = ((share - at + RELEASE.cast) % 1 + 1) % 1;
        motion.hold(CLIPS.cast, k, { blend: 0.08 });
      } else if (c.isMoving) motion.play(CLIPS.run, paced(CLIPS.run));
      else motion.play(CLIPS.idle);
      motion.update(dt);
    }
    this.wasFallen = fallen;
    this.wasDashing = c.isDashing;
    this.wasChanneling = c.isChanneling;
    this.flash(doing.hurt ?? 0);
    this.group.position.copy(ground(c.x, c.y));
    this.group.rotation.y = this.facing;
  }

  /** Where the tip of her branch is, once she has her model: where her orbs leave from. */
  tip(): THREE.Vector3 | null {
    const branch = this.shaped?.getObjectByName('canelo');
    if (!branch) return null;
    const box = new THREE.Box3().setFromObject(branch);
    return box.getCenter(new THREE.Vector3()).setY(box.max.y);
  }
}
