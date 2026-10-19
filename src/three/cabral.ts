import * as THREE from 'three';
import type { MachiController, Vec } from '../machi/controller';
import { ISO_Y, KITS } from '../machi/data';
import { MUSKET } from '../machi/musket';
import { CABRAL_DRESS, figure, flashes, model } from './figure';
import { Motion } from './motion';
import mixamoTravel from './rolls/rodada_mixamo.json';
import { ground, heading, UPRIGHT } from './space';
import { Trail } from './trail';

// Cabral in 3D, shown doing whatever his controller says he is doing: the clip for it, turned the
// way he goes or aims, the musket on his back or in his hands, the sabre's trail. Whoever moves him
// (the 3D demo, or the game itself) moves him by the same controller as the 2D game; this only
// shows it. A roll from motion capture is the one thing it moves: as its actor moved (`carry`).

/** Seconds to draw the musket from his back to the shoulder: longer than the 2D game's 0.25, chosen by the user. */
export const DRAW = 0.45;
/** Seconds from the shot until the musket is slung again: a big kick and a slow return, chosen by the user. */
export const SHOT = 0.8;
// The musket passes between his back and his hands where both hands hold it round in front of him
// (mosquete.py's ROUND): any later, the left hand had already let go of it.
/** The share of the draw at which the musket is in his hands (frame 4 of 6). */
const DRAWN = 0.67;
/** The share of the shot's clip at which the musket goes back to his back (frame 12 of 19). */
const SLUNG = 0.63;
/** The share of the grenade's coming up at which he has it in hand from his hip (granada.py: frame 4 of 11). */
const TAKEN = 0.36;
/** The share of the throw at which it leaves his hand (granada.py: frame 3 of 19). */
export const THROWN = 0.16;
/**
 * Seconds he takes over a drink from his flask, in the 3D game: Mixamo's Drinking (only the draught
 * itself, raised, drunk and lowered; the capture stood about for five seconds more) played quicker.
 * The 2D game's 0.8 rushed it.
 */
export const SIP = 1.4;
/** How fast he turns to face the way he goes, per second. */
const TURN = 14;
/** How quickly what he is taken to be going at follows how fast he really goes, per second. */
const SETTLE = 10;
/** The slowest his trot is played, as a share of its own speed: turning on the spot, he still steps. */
const LEAST_PACE = 0.35;
/** How long the musket is, butt to muzzle, in its own units (tools/blender/props.py). */
const MUSKET_LENGTH = 0.62;
/** The musket in someone's hands, while it is: its butt end, the way it points along the ground, and its muzzle. */
export function barrelOf(body: THREE.Object3D): { from: THREE.Vector3; way: THREE.Vector3; tip: THREE.Vector3 } | null {
  const gun = body.getObjectByName('mosquete_mano');
  if (!gun?.visible) return null;
  gun.updateWorldMatrix(true, false);
  const from = new THREE.Vector3().setFromMatrixPosition(gun.matrixWorld);
  const along = new THREE.Vector3(1, 0, 0).transformDirection(gun.matrixWorld);
  const tip = new THREE.Vector3(MUSKET_LENGTH, 0.02, 0).applyMatrix4(gun.matrixWorld);
  return { from, way: new THREE.Vector3(along.x, 0, along.z).normalize(), tip };
}
/** How long his blows take, for their clips to last as long. */
const SWING = KITS.cabral.melee?.time ?? 0.5;
/**
 * How he goes: Mixamo's Walking, the user's pick (it replaced CMU's 07_01, still in the model);
 * the library's run if it is missing.
 */
const GAIT = 'caminata_mixamo';
/**
 * His rolls, to be chosen between (C in the demo): Mixamo's "Stand To Roll", the user's pick; four
 * from CMU's motion capture (subjects 127 and 128, "run, dive over, roll, run"); his own keyed in
 * Blender; and the library's dive.
 */
export const ROLLS = ['rodada_mixamo', 'rodada_127_23', 'rodada_127_24', 'rodada_128_10', 'rodada_128_11', 'rodada', 'dive'];
/** For each roll put on from motion capture, how far its actor had come at each of its frames. */
const TRAVEL: Record<string, number[]> = { rodada_mixamo: mixamoTravel };
/**
 * A roll's moments, as shares of its clip and of the dash's time: he leaves the ground at the
 * first, lands at the second. Between them is the flight, given less of the dash than the capture
 * gave it, so he flies quicker; the takeoff and the roll and getting up keep their pace. The clip
 * is shown by this, and he is moved by it (as far as the actor had come at that moment), so
 * neither runs ahead of the other and he never slides.
 */
const ROLL_PHASES = { clip: [0.24, 0.53], time: [0.09, 0.33] };
function rollAt(t: number): number {
  const [ca, cb] = ROLL_PHASES.clip, [ta, tb] = ROLL_PHASES.time;
  t = Math.max(0, Math.min(1, t));
  if (t < ta) return (t / ta) * ca;
  if (t < tb) return ca + ((t - ta) / (tb - ta)) * (cb - ca);
  return cb + ((t - tb) / (1 - tb)) * (1 - cb);
}
/** How far along its way the actor had come at a share of the clip. */
function travelled(travel: number[], share: number): number {
  const at = Math.max(0, Math.min(1, share)) * (travel.length - 1), k = Math.floor(at);
  return k >= travel.length - 1 ? travel[travel.length - 1] : travel[k] + (travel[k + 1] - travel[k]) * (at - k);
}

/** What is not in his controller: where he aims, whether he is down, how long his dash is, the trail. */
export interface Doing {
  /** Where he stood before this step, to tell which way he went. */
  from: Vec;
  /** The spot of the 2D ground he aims at, while he has something up. */
  aimed: Vec | null;
  fallen: boolean;
  dashTime: number;
  /** Whether the sabre leaves its trail. */
  trail: boolean;
  /** How red he flashes, struck: 0 to 1. */
  hurt?: number;
}

export class CabralFigure {
  /** Everything of his in the scene: his body and the trail his sabre leaves. */
  readonly group = new THREE.Group();
  /** Which of ROLLS he rolls with. */
  roll = 0;
  private readonly blocks = figure(CABRAL_DRESS);
  private shaped: THREE.Group | null = null;
  private body: THREE.Object3D = this.blocks;
  private motion: Motion | null = null;
  private trail: Trail | null = null;
  private flash: (amount: number) => void = () => {};
  private gait = { name: 'run', reach: 0 };
  private facing = 0;
  private going = 0;
  private dashing = 0;
  private wasDashing = false;
  private wasSwinging = false;
  private wasChanneling = false;
  private swung = 0;
  private phaseWas: string | null = null;
  /** Where the dash set out from, and the way it goes on the 2D ground (screen units, per unit of its distance). */
  private dashFrom: Vec = { x: 0, y: 0 };
  private dashWay: Vec = { x: 0, y: 0 };

  constructor(url = 'cabral/3d/cabral_animado.glb') {
    this.group.add(this.body);
    // His model, once it has loaded; the figure of blocks until then.
    void model(url, CABRAL_DRESS.drawn).then(loaded => {
      this.shaped = loaded;
      this.motion = new Motion(loaded);
      this.flash = flashes(loaded);
      // The arc his sabre leaves as he cuts, from just past the guard to the point.
      const blade = loaded.getObjectByName('sable');
      if (blade) {
        this.trail = new Trail(blade, 0.06, 0.34);
        this.group.add(this.trail.mesh);
      }
      // Measured in his own units, which are grown to his height.
      const name = this.motion.has(GAIT) ? GAIT : 'run';
      this.gait = { name, reach: this.motion.reach(name, 'L_Foot') * loaded.scale.x };
      this.wear(loaded);
    });
  }

  /** His model, once loaded. */
  get model(): THREE.Group | null {
    return this.shaped;
  }

  get position(): THREE.Vector3 {
    return this.body.position;
  }

  /** Shows him as his model or as the figure of blocks, to compare. */
  toggleBlocks(): void {
    if (this.shaped) this.wear(this.body === this.shaped ? this.blocks : this.shaped);
  }

  private wear(next: THREE.Object3D): void {
    next.position.copy(this.body.position);
    next.rotation.copy(this.body.rotation);
    this.group.remove(this.body);
    this.body = next;
    this.group.add(next);
  }

  /** How long into the dash he is this step. */
  private into(c: MachiController, dt: number): number {
    return c.isDashing ? (this.wasDashing ? this.dashing + dt : dt) : 0;
  }

  /**
   * Called right after his controller has moved him: a roll from motion capture moves him as its
   * actor moved, not by the controller's own curve.
   */
  carry(c: MachiController, from: Vec, dash: { time: number; distance: number }, dt: number): void {
    const travel = TRAVEL[ROLLS[this.roll]];
    if (!c.isDashing || !travel) return;
    if (!this.wasDashing) {
      this.dashFrom = from;
      const dx = c.x - from.x, dy = (c.y - from.y) / ISO_Y, len = Math.hypot(dx, dy) || 1;
      this.dashWay = { x: dx / len, y: (dy / len) * ISO_Y };
    }
    const share = travelled(travel, rollAt(this.into(c, dt) / dash.time)) * dash.distance;
    c.x = this.dashFrom.x + this.dashWay.x * share;
    c.y = this.dashFrom.y + this.dashWay.y * share;
  }

  /** Shows what he is doing this step. */
  update(dt: number, c: MachiController, doing: Doing): void {
    const { from, aimed, fallen, dashTime } = doing;
    const arming = c.arming, musket = arming?.kind === 'musket';
    const moved = { x: c.x - from.x, y: c.y - from.y };
    // Cutting or aiming he faces where the controller turned him; walking, the way he goes.
    const fighting = c.isSwinging || c.isShouldering;
    // How fast he goes over the 3D ground, smoothed: a step held against a plant is still a step.
    const over = ground(moved.x, moved.y).length() / Math.max(dt, 1e-3);
    this.going += (over - this.going) * Math.min(1, dt * SETTLE);
    if (fighting || Math.hypot(moved.x, moved.y) > 0.01) {
      // Aiming at the pointer he turns to it at any angle, not only the eight ways.
      const want = aimed && c.isShouldering ? heading(aimed.x - c.x, aimed.y - c.y)
        : fighting ? Math.atan2(c.faces.x, c.faces.y) : heading(moved.x, moved.y);
      const turn = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      this.facing += turn * Math.min(1, dt * TURN);
    }
    const into = this.into(c, dt);
    // What he is doing, in the clip that shows it.
    const motion = this.motion;
    if (motion) {
      if (fallen) motion.play('defeat_02', { once: true });
      else if (c.isDashing) {
        // A roll from motion capture is shown by its phases (see ROLL_PHASES), which also move him;
        // any other is played by the clock.
        const name = ROLLS[this.roll];
        if (TRAVEL[name]) motion.hold(name, rollAt(into / dashTime), { afresh: !this.wasDashing, blend: 0.05 });
        else motion.play(name, { once: true, lasts: dashTime, afresh: !this.wasDashing, blend: 0.05 });
      }
      // His own cut, keyed in Blender to land when the game's blow does; the library's if it is missing.
      else if (c.isSwinging) motion.play(motion.has('tajo') ? 'tajo' : 'slash', { once: true, lasts: SWING, afresh: !this.wasSwinging, blend: 0.05 });
      // A drink from his flask, the one thing he stops for.
      else if (c.isChanneling && motion.has('tomar')) motion.play('tomar', { once: true, lasts: SIP, afresh: !this.wasChanneling, blend: 0.1 });
      else if (arming?.kind === 'grenade' && motion.has('granada_apuntar')) {
        // The grenade: taken from his hip and drawn back while it comes up, held back until the
        // click, then thrown; his feet stay where they are.
        if (arming.phase === 'fire') motion.play('granada_lanzar', { once: true, lasts: arming.shot, afresh: this.phaseWas !== 'fire', blend: 0.03 });
        else if (arming.phase === 'raise') motion.play('granada_sacar', { once: true, lasts: arming.shoulder, afresh: this.phaseWas !== 'raise', blend: 0.06 });
        else motion.play('granada_apuntar', { blend: 0.05 });
      } else if (arming?.kind === 'grenade') motion.play('pitch_baseball', { once: true });
      else if (arming && motion.has('mosquete_apuntar')) {
        // The musket: drawn from his back while it comes up, held aiming, then the shot and slinging it again.
        if (arming.phase === 'fire') motion.play('mosquete_disparo', { once: true, lasts: arming.shot, afresh: this.phaseWas !== 'fire', blend: 0.03 });
        else if (arming.phase === 'raise') motion.play('mosquete_sacar', { once: true, lasts: arming.shoulder, afresh: this.phaseWas !== 'raise', blend: 0.06 });
        else motion.play('mosquete_apuntar', { blend: 0.05 });
      } else if (arming) motion.play('shoot', { once: true });
      // His walk keeps step with the ground: played as fast as he goes, however fast that is.
      else if (c.isMoving) motion.play(this.gait.name, { pace: this.gait.reach ? Math.max(LEAST_PACE, this.going / this.gait.reach) : 1 });
      // Standing: Mixamo's Breathing Idle, the user's pick; his own keyed in Blender, or the library's, if missing.
      else motion.play(['reposo_mixamo', 'reposo', 'idle'].find(name => motion.has(name))!);
      motion.update(dt);
    }
    this.swung = c.isSwinging ? (this.wasSwinging ? this.swung + dt : 0) : 0;
    this.wasSwinging = c.isSwinging;
    this.wasChanneling = c.isChanneling;
    this.dashing = into;
    this.wasDashing = c.isDashing;
    this.phaseWas = arming?.phase ?? null;
    // Which musket is seen, the one on his back or the one in his hands, and the sabre put away
    // while he has the musket or a grenade up.
    if (this.shaped) {
      const inHand = musket && (arming.phase === 'raise' ? arming.t >= arming.shoulder * DRAWN
        : arming.phase === 'fire' ? arming.t < arming.shot * SLUNG : true);
      const back = this.shaped.getObjectByName('mosquete'), hand = this.shaped.getObjectByName('mosquete_mano'), sabre = this.shaped.getObjectByName('sable');
      if (back) back.visible = !inHand;
      if (hand) hand.visible = inHand;
      if (sabre) sabre.visible = !arming;
      // The grenade in his hand from when he takes it until it leaves it.
      const bomb = this.shaped.getObjectByName('granada');
      if (bomb) bomb.visible = arming?.kind === 'grenade' && (arming.phase === 'raise' ? arming.t >= arming.shoulder * TAKEN
        : arming.phase === 'fire' ? arming.t < arming.shot * THROWN : true);
    }
    this.flash(doing.hurt ?? 0);
    this.body.position.copy(ground(c.x, c.y));
    this.body.rotation.y = this.facing;
    // Aiming at the pointer, he is turned so the line of the barrel, not the middle of him, runs
    // through the spot: the musket lies against his right shoulder, beside his middle, and turned
    // only by his middle it ran alongside the pointer and missed it.
    const muzzle = aimed ? this.barrel() : null;
    if (muzzle && aimed) {
      const spot = ground(aimed.x, aimed.y);
      const want = Math.atan2(spot.x - muzzle.from.x, spot.z - muzzle.from.z), has = Math.atan2(muzzle.way.x, muzzle.way.z);
      this.facing += Math.atan2(Math.sin(want - has), Math.cos(want - has));
      this.body.rotation.y = this.facing;
    }
    // The cut's arc, from where his blade is now: only while it sweeps (frames 3 to 9 of 12), not as
    // he winds up or comes back to guard.
    this.body.updateMatrixWorld(true);
    this.trail?.update(doing.trail && this.swung > SWING * 3 / 12 && this.swung < SWING * 9 / 12);
  }

  /** Where the grenade in his hand is, as long as he has his model on. */
  grenade(): THREE.Vector3 | null {
    const bomb = this.shaped && this.body === this.shaped ? this.shaped.getObjectByName('granada') : null;
    return bomb ? bomb.getWorldPosition(new THREE.Vector3()) : null;
  }

  /** Where the musket in his hands is, while it is: its butt end, the way it points along the ground, and its muzzle. */
  barrel(): { from: THREE.Vector3; way: THREE.Vector3; tip: THREE.Vector3 } | null {
    return this.shaped && this.body === this.shaped ? barrelOf(this.shaped) : null;
  }

  /** Where the line of his shot starts: the muzzle once the musket is in his hands, his shoulder while he draws it. */
  aimFrom(c: Vec): THREE.Vector3 {
    return this.barrel()?.tip ?? ground(c.x, c.y, MUSKET.height * UPRIGHT);
  }
}
