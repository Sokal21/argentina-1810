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
// Measured on the model: at 0.25 her branch is thrust straight ahead (its tip 38 in front of her); after
// it the arm sweeps right and behind her, where at 0.42 the orb left from behind her back.
const RELEASE = { cast: 0.25, strike: 0.45 };
/**
 * What of her casts, over whatever her legs do: her waist, chest, neck and head, and the arm with the branch.
 * The clip swings the other hand right across her body and back, as if it were free; it holds her
 * kultrun, and flailed (the user, 25/10/2026): it is left to the idle or the walk under the cast.
 */
const UPPER = /^(Waist|Spine0[12]|NeckTwist0[12]|Head|R_(Clavicle|Upperarm|Forearm|Hand)\w*)$/;
/** Seconds the cast takes to come over her, and to leave her. */
const EASE = 0.12;
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
  /** Her cast, for her upper body only: each bone, and how it turns along the clip. */
  private upper: { bone: THREE.Object3D; at: THREE.Interpolant }[] = [];
  /** Her hips in the cast, and the bone itself: the clip turns her whole body 84° into the thrust. */
  private hip: { bone: THREE.Object3D; at: THREE.Interpolant } | null = null;
  private castSeconds = 1;
  /** The tip of her branch: which point of it, in its own frame. */
  private tipAt: THREE.Vector3 | null = null;
  /** The way along the ground (not foreshortened) she casts, while she does; set by the game each step. */
  aim: Vec | null = null;
  /** How much the cast is over her (0 to 1), and where in it she was last. */
  private over = 0;
  private castK = 0;

  constructor() {
    void model('machi/3d/inti_animado.glb', DRAWN).then(loaded => {
      this.shaped = loaded;
      this.motion = new Motion(loaded);
      this.flash = flashes(loaded);
      seenThrough(loaded);
      for (const name of [CLIPS.run, ...Object.values(CLIPS.walk)]) this.reach[name] = this.motion.reach(name, 'L_Foot') * loaded.scale.x;
      const cast = loaded.animations.find(a => a.name === CLIPS.cast);
      if (cast) {
        this.castSeconds = cast.duration;
        for (const track of cast.tracks) {
          const [name, what] = track.name.split('.');
          const bone = loaded.getObjectByName(name);
          const at = () => (track as THREE.KeyframeTrack & { createInterpolant(): THREE.Interpolant }).createInterpolant();
          if (bone && what === 'quaternion' && UPPER.test(name)) this.upper.push({ bone, at: at() });
          if (bone && what === 'quaternion' && name === 'Hip') this.hip = { bone, at: at() };
        }
      }
      // The point of the branch furthest from the hand that holds it.
      const branch = loaded.getObjectByName('rama');
      if (branch instanceof THREE.Mesh && branch.parent) {
        const points = branch.geometry.attributes.position as THREE.BufferAttribute, p = new THREE.Vector3();
        const hand = branch.worldToLocal(branch.parent.getWorldPosition(new THREE.Vector3()));
        let far = -1;
        for (let i = 0; i < points.count; i++) {
          const d = p.fromBufferAttribute(points, i).distanceTo(hand);
          if (d > far) { far = d; this.tipAt = p.clone(); }
        }
      }
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
    // Turned the way her orbs fly: where the game aims them.
    const look = this.aim ? Math.atan2(this.aim.x, this.aim.y) : c.steer ? Math.atan2(c.steer.x, c.steer.y) : Math.atan2(c.faces.x, c.faces.y);
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
      } else if (c.isMoving && !casting) motion.play(CLIPS.run, paced(CLIPS.run));
      else motion.play(CLIPS.idle);
      motion.update(dt);
      // Her chest and branch arm cast over her idle or her walk, coming over her and leaving her smoothly.
      const free = !fallen && !c.isDashing && !c.isChanneling && this.striking === 0;
      this.over = free ? Math.max(0, Math.min(1, this.over + (casting ? dt : -dt) / EASE)) : 0;
      if (casting) this.castK = this.castAt(c);
      if (this.over > 0) {
        // Winding up, the clip as it is; after the orb has gone, from the thrust straight back to rest,
        // easing: the clip's own way back swept the branch round behind her, a lash at this pace.
        const k = this.castK, back = k > RELEASE.cast ? (k - RELEASE.cast) / (1 - RELEASE.cast) : 0;
        const ease = back * back * (3 - 2 * back), q = new THREE.Quaternion(), rest = new THREE.Quaternion();
        const pose = (into: THREE.Quaternion, bone: THREE.Object3D, at: THREE.Interpolant, t: number) => {
          into.fromArray(at.evaluate(t) as unknown as number[]);
          // Her legs keep to her idle or her walk, so the clip's turn of her hips is laid on her waist:
          // her body above them is turned as the clip turns it.
          if (bone.name === 'Waist' && this.hip) {
            const turned = new THREE.Quaternion().fromArray(this.hip.at.evaluate(t) as unknown as number[]);
            into.premultiply(this.hip.bone.quaternion.clone().invert().multiply(turned));
          }
          return into;
        };
        for (const { bone, at } of this.upper) {
          pose(q, bone, at, Math.min(k, RELEASE.cast) * this.castSeconds);
          if (ease > 0) q.slerp(pose(rest, bone, at, 0), ease);
          bone.quaternion.slerp(q, this.over);
        }
      }
    }
    this.wasFallen = fallen;
    this.wasDashing = c.isDashing;
    this.wasChanneling = c.isChanneling;
    this.flash(doing.hurt ?? 0);
    this.group.position.copy(ground(c.x, c.y));
    this.group.rotation.y = this.facing;
  }

  /**
   * How far into her cast she is shown. Each cast starts from rest, at the clip's start; its wind-up
   * takes until the controller looses the orb, which is the moment her branch is thrust ahead, and
   * the rest of the clip, back to rest, takes what is left.
   */
  private castAt(c: MachiController): number {
    const s = c.attackShare ?? 0, at = c.castShare ?? 0.75;
    return s < at ? (s / at) * RELEASE.cast : RELEASE.cast + ((s - at) / (1 - at)) * (1 - RELEASE.cast);
  }

  /** Where the tip of her branch is, once she has her model: where her orbs leave from. */
  tip(): THREE.Vector3 | null {
    const branch = this.shaped?.getObjectByName('rama');
    if (!branch || !this.tipAt) return null;
    this.group.updateMatrixWorld(true);
    return this.tipAt.clone().applyMatrix4(branch.matrixWorld);
  }
}
