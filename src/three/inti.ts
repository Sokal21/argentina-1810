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
  walk: { ahead: 'walk_forward', back: 'walk_back' },
};
/**
 * How fast her legs turn to where they should go, per second. The pack's walks and run go at a slant
 * (measured: forward 27° to her left, back 40° to her right, the run 22°; its walk right goes nearly
 * ahead), so her legs are turned from her pelvis for each step to go where she really goes, and her
 * walks left and right are not used: walking while she casts she walks ahead or back, whichever turns
 * her legs least from her body, as Cabral does.
 */
const LEG_TURN = 12;
/** How much less one way of walking must turn her legs than the other before she changes to it. */
const LEG_SWAP = 0.3;
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
// (The upper list is in the clip's order, parents first, so a shoulder is turned after the waist above
// which it stands has been: its parent's way in the world is then as it will be drawn.)
/** Seconds the cast takes to come over her, and to leave her. */
const EASE = 0.12;
/**
 * How much of the clip's turn of her hips (84° into the thrust) her body takes: the clip thrusts side-on,
 * her chest a right angle off the orb's way (the user wanted her hips with the orb, 25/10/2026; at 0.3
 * her chest was still 45° to 69° off, at none 15° to 67°, what her idle sways). The rest of the turn
 * is laid on her branch shoulder, so her arm still points where the orb goes.
 */
const HIP_SHARE = 0;
/**
 * How much of her running slide her dash shows: it slides to its lowest by 0.25 and is back up by 0.83,
 * but from about 0.6 its feet already run, and at the dash's end (all but still by then) she ran on the
 * spot. It is shown up to as she is nearly up, then blends over this long into whatever she does next;
 * for its first moments it is held, until her controller says whether she goes on or stands (at once it
 * said neither, and she blended into standing and at once into running, a jolt).
 */
const SLIDE = { until: 0.7, blendOut: 0.25, settle: 0.08 };
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
  /** Which way each walk and the run really go, from her front. */
  private ways: Record<string, number> = {};
  /** How far her legs are turned from her body, and whether she walks back. */
  private legTurn = 0;
  private backing = false;
  /**
   * The bones turned here after the clips (her pelvis, her cast over her body), as the clips left them.
   * The mixer writes a bone only when its clip's value changes, and the walks hold her pelvis still:
   * turned on top of itself every frame, her legs spun round like a helicopter's blades (the user,
   * 25/10/2026). They are put back before each step.
   */
  private asLeft = new Map<THREE.Object3D, THREE.Quaternion>();
  private facing = 0;
  private going = 0;
  private wasDashing = false;
  /** Which of her controller's dashes the last step showed: one slid straight from another starts afresh. */
  private dashSeen = 0;
  /** Seconds into her dash, and since it ended. */
  private dashed = 0;
  private sinceDash = Infinity;
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
  /** Locked onto someone (the gamepad's R3): she faces them all the while, walking round them. */
  locked = false;
  /** How much the cast is over her (0 to 1), and where in it she was last. */
  private over = 0;
  private castK = 0;
  /** Whether she is winding up a cast this step, for her orb to gather at her branch tip. */
  private winding = false;

  constructor() {
    void model('machi/3d/inti_animado.glb', DRAWN).then(loaded => {
      this.shaped = loaded;
      this.motion = new Motion(loaded);
      this.flash = flashes(loaded);
      seenThrough(loaded);
      for (const name of [CLIPS.run, ...Object.values(CLIPS.walk)]) {
        const left = this.motion.stride(name, 'L_Foot'), right = this.motion.stride(name, 'R_Foot');
        this.reach[name] = ((left.reach + right.reach) / 2) * loaded.scale.x;
        this.ways[name] = Math.atan2(Math.sin(left.way) + Math.sin(right.way), Math.cos(left.way) + Math.cos(right.way));
      }
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
      const want = casting || (this.locked && this.aim) ? look : walking ? heading(moved.x, moved.y) : null;
      if (want !== null) this.facing += wrap(want - this.facing) * Math.min(1, dt * TURN);
    }
    const motion = this.motion;
    if (motion) {
      let legs = 0;
      // Just up from her slide, whatever comes next blends in slowly from it.
      const out = this.sinceDash < SLIDE.blendOut ? { blend: SLIDE.blendOut } : {};
      const paced = (name: string) => ({ pace: this.reach[name] ? Math.max(LEAST_PACE, this.going / this.reach[name]) : 1, ...out });
      if (fallen) motion.play(CLIPS.death, { once: true, afresh: !this.wasFallen });
      else if (c.isDashing) motion.hold(CLIPS.dash, Math.min(1, this.dashed / dashTime) * SLIDE.until, { afresh: !(this.wasDashing && this.dashSeen === c.dashes), blend: 0.05 });
      else if (this.sinceDash < SLIDE.settle && !c.isAttacking) motion.hold(CLIPS.dash, SLIDE.until);
      else if (c.channelling === 'call') motion.play(CLIPS.call, { once: true, lasts: NAHUEL.call, afresh: !this.wasChanneling, blend: 0.08 });
      else if (c.isChanneling) motion.play(CLIPS.heal, { once: true, lasts: HEAL.time, afresh: !this.wasChanneling, blend: 0.08 });
      else if (this.striking > 0) motion.play(CLIPS.strike, { once: true, lasts: STRIKE_TIME, afresh: this.striking > STRIKE_TIME - dt, blend: 0.05 });
      else if ((casting || this.locked) && walking) {
        // Turned to where she casts, her legs walk ahead or back, turned to go where she goes.
        const off = wrap(heading(moved.x, moved.y) - this.facing);
        const ahead = wrap(off - (this.ways[CLIPS.walk.ahead] ?? 0)), back = wrap(off - (this.ways[CLIPS.walk.back] ?? Math.PI));
        this.backing = this.backing ? Math.abs(back) < Math.abs(ahead) + LEG_SWAP : Math.abs(back) + LEG_SWAP < Math.abs(ahead);
        const name = this.backing ? CLIPS.walk.back : CLIPS.walk.ahead;
        legs = this.backing ? back : ahead;
        motion.play(name, paced(name));
      } else if (c.isMoving && !casting) {
        legs = -(this.ways[CLIPS.run] ?? 0);
        motion.play(CLIPS.run, paced(CLIPS.run));
      } else motion.play(CLIPS.idle, out);
      const pelvis = this.shaped?.getObjectByName('Pelvis');
      for (const [bone, was] of this.asLeft) bone.quaternion.copy(was);
      motion.update(dt);
      for (const bone of [pelvis, ...this.upper.map(u => u.bone)]) if (bone) this.asLeft.set(bone, bone.quaternion.clone());
      // Her legs turned from her pelvis, about the upright.
      this.legTurn += wrap(legs - this.legTurn) * Math.min(1, dt * LEG_TURN);
      if (pelvis?.parent && Math.abs(this.legTurn) > 1e-3) {
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(pelvis.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
        pelvis.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, this.legTurn));
      }
      // Her chest and branch arm cast over her idle or her walk, coming over her and leaving her smoothly.
      const free = !fallen && !c.isDashing && !c.isChanneling && this.striking === 0;
      this.over = free ? Math.max(0, Math.min(1, this.over + (casting ? dt : -dt) / EASE)) : 0;
      if (casting) this.castK = this.castAt(c);
      this.winding = casting && free && this.castK < RELEASE.cast;
      if (this.over > 0) {
        // Winding up, the clip as it is; after the orb has gone, from the thrust straight back to rest,
        // easing: the clip's own way back swept the branch round behind her, a lash at this pace.
        const k = this.castK, back = k > RELEASE.cast ? (k - RELEASE.cast) / (1 - RELEASE.cast) : 0;
        const ease = back * back * (3 - 2 * back), q = new THREE.Quaternion(), rest = new THREE.Quaternion();
        const pose = (into: THREE.Quaternion, bone: THREE.Object3D, at: THREE.Interpolant, t: number) => {
          into.fromArray(at.evaluate(t) as unknown as number[]);
          // Her legs keep to her idle or her walk, so the clip's turn of her hips is laid on her waist:
          // her body above them is turned as the clip turns it.
          if ((bone.name === 'Waist' || bone.name === 'R_Clavicle') && this.hip) {
            const turned = new THREE.Quaternion().fromArray(this.hip.at.evaluate(t) as unknown as number[]);
            const turn = this.hip.bone.quaternion.clone().invert().multiply(turned);
            if (bone.name === 'Waist') into.premultiply(new THREE.Quaternion().slerp(turn, HIP_SHARE));
            else {
              // The rest of the turn, about the upright through her shoulder.
              const hipWorld = this.hip.bone.getWorldQuaternion(new THREE.Quaternion());
              const ahead = new THREE.Vector3(0, 0, 1), turnedAhead = ahead.clone().applyQuaternion(hipWorld.clone().multiply(turn).multiply(hipWorld.clone().invert()));
              const yaw = Math.atan2(turnedAhead.x, turnedAhead.z) * (1 - HIP_SHARE);
              const parent = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
              const up = new THREE.Vector3(0, 1, 0).applyQuaternion(parent.invert());
              into.premultiply(new THREE.Quaternion().setFromAxisAngle(up, yaw));
            }
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
    this.dashed = c.isDashing ? (this.wasDashing && this.dashSeen === c.dashes ? this.dashed + dt : dt) : 0;
    this.sinceDash = c.isDashing ? 0 : this.sinceDash + dt;
    this.wasDashing = c.isDashing;
    this.dashSeen = c.dashes;
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

  /** The orb gathering at her branch tip while she winds up: where, and how far along (0 to 1, loosed at 1). */
  forming(): { at: THREE.Vector3; share: number } | null {
    const at = this.winding ? this.tip() : null;
    return at ? { at, share: this.castK / RELEASE.cast } : null;
  }

  /** Where the tip of her branch is, once she has her model: where her orbs leave from. */
  tip(): THREE.Vector3 | null {
    const branch = this.shaped?.getObjectByName('rama');
    if (!branch || !this.tipAt) return null;
    this.group.updateMatrixWorld(true);
    return this.tipAt.clone().applyMatrix4(branch.matrixWorld);
  }
}
