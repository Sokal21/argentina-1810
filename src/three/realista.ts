import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AIM, MUZZLE, SLASH_TIME, type Mode as RealistaMode } from '../realista/brain';
import { KINDS, type Mode as TroopMode } from '../tropa/brain';
import { Blood } from './blood';
import { Dust } from './dust';
import { Shouts } from './shout';
import { barrelOf } from './cabral';
import { flashes, model } from './figure';
import { Fling } from './fling';
import { seenThrough } from './xray';
import { Motion } from './motion';
import { ISO_Y } from '../machi/data';
import { along, ground, heading, heightAt, UPRIGHT } from './space';

// The royalist fusilier in 3D, shown doing whatever his brain is doing (realista/brain.ts): standing,
// marching, drawing the musket and aiming, the shot, the sabre, falling. His model is Cabral's
// clips put on the royalist's body (assets/realista/3d); it is loaded once and copied for each.
// Fallen, he lies where he fell, in his blood, until he is up again or taken off the field.

type Mode = RealistaMode | TroopMode;

/** How red one quickened by a sergeant's shout throbs, at its faintest and its strongest (a blow is 1), and how fast (radians a second). */
const HASTE = { low: 0.08, high: 0.38, beat: 9 };

/** How tall he is drawn, beside Cabral's 82: a little smaller, as in the 2D game. */
export const DRAWN = 78;
/**
 * The other kinds drawn in 3D, by their kind: their model and how tall it is drawn; for one who
 * strikes, the clip of his blow and how far into it (a share) the blow lands, so it is played at
 * the pace that lands it when his brain does.
 */
export const LOOKS: Record<string, { url: string; drawn: number; blow?: { clip: string; lands: number; hit: number }; rally?: { clip: string; time: number; reach: number }; run?: string; kneels?: { clip: string; shot: number; aim: number; stand: string }; pistol?: { clip: string; shot: number; aim: number; after: number }; lunge?: { clip: string; wind: number; lands: number; point: number; charge: number; hit: number; dash: number; time: number }; call?: { clip: string; time: number } }> = {
  // Lean and quick, a little under the fusiliers (Tripo from turnaround A, 23 October 2026).
  // His two cuts at the pace that lands the first when his brain does (frame 18 of 52); his run.
  sableador: { url: 'tropa/sableador3d/sableador_animado.glb', drawn: 76, blow: { clip: 'tajo', lands: 18 / 52, hit: KINDS.sableador.blow.hit }, run: 'carrera' },
  // A rifleman (Tripo from turnaround B, 23 October 2026); in 3D without the basket of earth of his 2D drawing.
  // His musket always in both hands (fusil_en_manos.py): standing with it held low until he has
  // anyone in his shot, walking up with it at the ready; once he has aimed, down on one knee until he
  // walks again. His shot (tiro_arrodillado.py) goes off at frame 27 of 50, played so it does when
  // his brain shoots.
  tirador: { url: 'tropa/tirador3d/tirador_animado.glb', drawn: 78, run: 'caminata_fusil', kneels: { clip: 'tiro', shot: 27 / 50, aim: KINDS.tirador.shot.aim, stand: 'reposo_fusil' } },
  // A head over his men. His blow lands at frame 12 of 58, the halberd's head straight before him (golpe_pesado.py).
  sargento: { url: 'tropa/sargento3d/sargento_animado.glb', drawn: 90, blow: { clip: 'barrido', lands: 12 / 58, hit: KINDS.sargento.blow.hit },
    // His shout, played over as long as it takes him (grito_sargento.py, Mixamo's battlecry).
    rally: { clip: 'grito', time: KINDS.sargento.rally.time, reach: KINDS.sargento.rally.reach } },
  // Whoever commands the column, his long cape behind him (Tripo from turnaround C, 23 October 2026);
  // his plume over the sergeant's head. His sabre in his right hand, his pistol in his left. Each
  // pointing straight before him where it counts (al_frente.py): his thrust (Mixamo's Stabbing) lands
  // at frame 9 of 41, his shot (Mixamo's Handgun, mirrored for his left hand) goes off at frame 14 of
  // 49, each played so it does when his brain has it. His lunge is the thrust held drawn back (frame
  // 4) while he gathers himself, his point put out (frame 9) in the last `point` seconds of it, so he
  // slides in with it already straight before him. His shout is
  // Mixamo's battlecry as it comes, his pistol and sabre flung up with his arms; so is his calling up
  // of his men, without the shout's rings (until a clip of its own is found).
  capitan: { url: 'tropa/capitan3d/capitan_animado.glb', drawn: 96, blow: { clip: 'estocada', lands: 9 / 41, hit: KINDS.capitan.blow.hit },
    pistol: { clip: 'tiro', shot: 14 / 49, aim: KINDS.capitan.shot.aim, after: KINDS.capitan.shot.after! },
    lunge: { clip: 'estocada', wind: 4 / 41, lands: 9 / 41, point: 0.15, ...KINDS.capitan.lunge },
    rally: { clip: 'grito', time: KINDS.capitan.rally.time, reach: KINDS.capitan.rally.reach },
    call: { clip: 'grito', time: KINDS.capitan.call.time } },
  // The frontier soldier of 1879 (Tripo from turnaround A, 27 October 2026), as tall as the fusiliers:
  // the fusilier's musket clips, and his bayonet thrust landing at frame 22 of 62 (Mixamo's Bayonet Stab).
  frontera: { url: 'frontera/3d/soldado_animado.glb', drawn: 78, blow: { clip: 'bayoneta', lands: 22 / 62, hit: KINDS.frontera.blow.hit } },
};
/** Seconds of his aim spent drawing the musket from his back; the rest he holds it levelled. */
const DRAW = Math.min(0.45, AIM * 0.55);
/** How long the shot's clip lasts, from the kick until he has slung the musket again. */
const SHOT = 0.8;
/** The shares of the draw and of the shot at which the musket is in his hands (as Cabral's, cabral.ts). */
const DRAWN_AT = 0.67, SLUNG = 0.63;
/** How fast he turns, per second; how quickly how fast he is taken to go follows how fast he goes. */
const TURN = 10, SETTLE = 10;
/**
 * The warning at his muzzle, to dodge by: a faint red glow that grows a little while he aims, and
 * just before the shot a glint, a red star of four rays along the diagonals, that swells to its
 * height a little before the shot (after his aim stops following, 0.25 s before it: stepping
 * aside then makes him miss) and is gone as he fires. The glow's size in world units and opacity,
 * from the first of the aim to the glint; the glint's size and its halo's, the seconds before the
 * shot it begins and is at its height, and how far it turns (radians). Its rays must stay about a
 * pixel of the picture wide (1.8 units): thinner the pixels ate them, twice that was too thick.
 */
const WARN = { colour: '#ff3424', from: 1.5, to: 3.5, faint: 0.12, full: 0.45, star: 30, halo: 38, begins: 0.4, height: 0.15, turn: 0.25 };

/** The glow's picture: a soft round light, white at the heart. */
let glowing: THREE.Texture | null = null;
export function glow(): THREE.Texture {
  if (glowing) return glowing;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, light = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  light.addColorStop(0, 'rgba(255,255,255,1)');
  light.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  return glowing = new THREE.CanvasTexture(canvas);
}

/** The glint's picture: four thin rays along the diagonals, tapering from a white heart. */
let starred: THREE.Texture | null = null;
function star(): THREE.Texture {
  if (starred) return starred;
  const size = 64, half = size / 2, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.translate(half, half);
  g.rotate(Math.PI / 4);
  for (let ray = 0; ray < 4; ray++) {
    g.rotate(Math.PI / 2);
    g.fillStyle = 'rgba(255,255,255,1)';
    g.beginPath();
    g.moveTo(0, -2.8);
    g.lineTo(half * 1.35, 0);
    g.lineTo(0, 2.8);
    g.fill();
  }
  const heart = g.createRadialGradient(0, 0, 0, 0, 0, 10);
  heart.addColorStop(0, 'rgba(255,255,255,1)');
  heart.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = heart;
  g.fillRect(-10, -10, 20, 20);
  return starred = new THREE.CanvasTexture(canvas);
}

/** What his figure needs to know of him: his brain's state, and how red he flashes. */
export interface Royalist {
  readonly mind: { readonly x: number; readonly y: number; readonly mode: Mode; readonly t: number; readonly dir: { x: number; y: number } };
  readonly hurt: number;
  /** Another kind than the fusilier, drawn as LOOKS has him. */
  readonly look3d?: string;
  /** Quickened by a sergeant's shout just now: he throbs red while it lasts. */
  readonly hasted?: boolean;
}

let loading: Promise<THREE.Group> | null = null;

class Figure {
  readonly body: THREE.Group;
  private readonly motion: Motion;
  private readonly flash: (amount: number) => void;
  private readonly reach: number;
  /** How far a stride of his run carries him, played at its own pace: his run is paced by it, so his feet do not slide. */
  private readonly runReach: number;
  /** The warning at his muzzle while he aims, glow and glint: seen through him too, aiming away, since it is there to be dodged by. */
  readonly warning = new THREE.Group();
  private readonly glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow(), color: WARN.colour, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  private readonly halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: star(), color: '#c80e04', transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  private readonly star = new THREE.Sprite(new THREE.SpriteMaterial({
    map: star(), color: '#ff4a30', transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  private facing = 0;
  private going = 0;
  private was = { x: 0, y: 0 };
  /** How long since his last shot, while its clip still plays. */
  private fired: number | null = null;
  private modeWas: Mode | null = null;
  private resting = false;
  /** One who kneels to shoot (his look's `kneels`): down on his knee, from his first aim until he walks. */
  private down = false;
  /** How far into his lunge he was last frame: to see the moment he pushes off. */
  private lungedAt = Infinity;
  /** Seconds since his pistol went off, while its clip plays out (one with a pistol, his look's `pistol`). */
  private smoking: number | null = null;
  /** His musket flung from his hands as he falls, for one who holds it in both. */
  private readonly flung = new Fling(at => heightAt(at.x, at.z * ISO_Y));
  /** Seconds he has been drawn, for his throbbing while quickened. */
  private clock = Math.random() * 10;
  /** Taken off the field, fallen: not drawn, nor his blood, until he is up again. */
  private buried = false;
  /** Which he is, to his blood. */
  private static count = 0;
  private readonly id = Figure.count++;

  constructor(shape: THREE.Group, private readonly blood: Blood, private readonly look?: (typeof LOOKS)[string], private readonly shouts?: Shouts, private readonly dust?: Dust) {
    this.body = clone(shape) as THREE.Group;
    this.body.animations = shape.animations;
    this.motion = new Motion(this.body);
    this.flash = flashes(this.body);
    // Seen through whatever hides him, in red: behind a tree or a house he is not to be lost.
    seenThrough(this.body);
    this.reach = this.motion.reach('caminata_mixamo', 'L_Foot') * shape.scale.x;
    this.runReach = look?.run ? this.motion.reach(look.run, 'L_Foot') * shape.scale.x : 0;
    this.warning.add(this.glow, this.halo, this.star);
    this.warning.visible = false;
  }

  /**
   * Out of sight: not drawn, and taken up again where he is when he comes back into it. Up again
   * out of sight, at his post, his blood is gone from where he fell, which may well be in sight.
   */
  rest(who: Royalist): void {
    this.body.visible = this.warning.visible = false;
    if (this.flung.gun) this.flung.gun.visible = false;
    this.resting = true;
    if (alive(who.mind.mode) && this.modeWas && !alive(this.modeWas)) {
      this.blood.clear(this.id);
      this.buried = false;
      this.modeWas = who.mind.mode;
    }
  }

  update(dt: number, who: Royalist): void {
    const { x, y, mode, t, dir } = who.mind;
    if (this.resting) { this.was = { x, y }; this.resting = false; }
    const moved = { x: x - this.was.x, y: y - this.was.y };
    this.was = { x, y };
    const over = along(moved.x, moved.y).length() / Math.max(dt, 1e-3);
    this.going += (Math.min(over, 200) - this.going) * Math.min(1, dt * SETTLE);
    // Marching he faces the way he goes; otherwise the way his brain faces him (at the hero, down his aim).
    const want = mode === 'walk' && Math.hypot(moved.x, moved.y) > 0.01 ? heading(moved.x, moved.y) : Math.atan2(dir.x, dir.y);
    if (mode !== 'dying' && mode !== 'gone') {
      const turn = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      this.facing += turn * Math.min(1, dt * TURN);
    }
    const pistol = this.look?.pistol;
    if (pistol && this.modeWas === 'aim' && mode !== 'aim' && alive(mode)) this.smoking = 0;
    else if (this.smoking !== null) this.smoking += dt;
    if (pistol && this.smoking !== null && (this.smoking >= pistol.after || mode === 'aim' || mode === 'blow' || !alive(mode))) this.smoking = null;
    if (mode === 'lower' && this.modeWas === 'aim') this.fired = 0;
    else if (this.fired !== null) this.fired += dt;
    if (this.fired !== null && (this.fired >= SHOT || mode === 'slash' || mode === 'aim' || !alive(mode))) this.fired = null;
    const m = this.motion, afresh = mode !== this.modeWas;
    // Falling, his blood flung from his chest; down, pooling under him. Come upon already down
    // (first seen so, or seen again), he is lying there, his blood spread.
    if (mode === 'dying' && afresh) this.blood.splash(this.id, ground(x, y, DRAWN * 0.62 * UPRIGHT));
    if (mode === 'dying' && afresh && this.look?.kneels) this.flung.throw(this.body);
    // One with a bayonet has his rifle in his fists as he falls, and lets it fly as the rifleman does.
    if (mode === 'dying' && afresh && this.body.getObjectByName('fusil_bayoneta')) this.flung.throw(this.body, 'fusil_bayoneta');
    if (alive(mode) || this.buried) this.flung.back();
    this.flung.update(dt);
    if (mode === 'gone' && afresh && this.modeWas !== 'dying') m.hold('muerte', 1);
    if (mode === 'gone' && afresh && !this.buried) {
      m.update(0);
      this.body.position.copy(ground(x, y));
      this.body.rotation.y = this.facing;
      this.blood.pool(this.id, this.hips(), this.modeWas === 'dying' ? 0 : 1);
    }
    if (alive(mode) && !alive(this.modeWas ?? 'stand')) { this.blood.clear(this.id); this.buried = false; }
    if (mode === 'aim') this.down = true;
    else if (mode === 'walk') this.down = false;
    // Keeping after her as he swings, his feet run under his blow rather than slide.
    if (mode === 'blow' && this.look?.run && this.going > 20) m.legs(this.look.run, this.runReach ? Math.max(0.35, this.going / this.runReach) : 1);
    else m.legs(null);
    if (mode === 'dying') m.play('muerte', { once: true, afresh, blend: 0.08 });
    else if (mode === 'gone') m.play('muerte', { once: true });
    else if (this.look?.kneels && this.down) {
      // On one knee: aiming, his shot played so it goes off when his brain fires; else on guard,
      // the shot played out to its end (its last frame his guard).
      const { clip, shot, aim } = this.look.kneels;
      if (mode === 'aim') m.play(clip, { once: true, pace: (shot * m.seconds(clip)) / aim, afresh, blend: 0.15 });
      else m.play(clip, { once: true });
    } else if (this.look?.kneels && mode === 'stand') m.play(this.look.kneels.stand, { blend: 0.3 });
    else if (pistol && (mode === 'aim' || this.smoking !== null)) {
      // Raising his pistol, played so it goes off when his brain fires; after, played out (drawn up by
      // his face, lowered) over as long as his brain has him stand after the shot.
      const rest = (1 - pistol.shot) * m.seconds(pistol.clip);
      if (mode === 'aim') m.play(pistol.clip, { once: true, pace: (pistol.shot * m.seconds(pistol.clip)) / pistol.aim, afresh, blend: 0.15 });
      else m.play(pistol.clip, { once: true, pace: rest / pistol.after });
    } else if (this.fired !== null) m.play('mosquete_disparo', { once: true, lasts: SHOT, afresh: this.fired === 0, blend: 0.03 });
    else if (mode === 'aim') {
      if (t < DRAW) m.play('mosquete_sacar', { once: true, lasts: DRAW, afresh, blend: 0.06 });
      else m.play('mosquete_apuntar', { blend: 0.05 });
    } else if (mode === 'slash') m.play('tajo', { once: true, lasts: SLASH_TIME, afresh, blend: 0.05 });
    else if (mode === 'blow' && this.look?.blow) {
      // At the pace that lands his blow when his brain does.
      const { clip, lands, hit } = this.look.blow;
      // Eased in from his guard: the clip begins with the weapon already dropped back to be swung.
      m.play(clip, { once: true, pace: (lands * m.seconds(clip)) / hit, afresh, blend: 0.2 });
    } else if (mode === 'lunge' && this.look?.lunge) {
      // Held drawn back while he gathers himself, his point put out as he is about to go, held out as he
      // slides in, and the thrust played out from there once he has reached her.
      const { clip, wind, lands, point, charge, hit } = this.look.lunge;
      if (t < hit) m.hold(clip, wind + (lands - wind) * Math.min(1, Math.max(0, (t - charge + point) / point)), { blend: 0.2 });
      else m.play(clip, { once: true });
      // A cloud as he pushes off; sliding in, each boot tears up the ground behind him; a last burst
      // from each as he stops to thrust.
      if (t >= charge && this.lungedAt < charge) this.dust?.cloud(ground(x, y));
      this.lungedAt = t;
      if (t >= charge && t < hit + 0.08 && this.going > 20) {
        const back = new THREE.Vector3(-Math.sin(this.facing), 0, -Math.cos(this.facing));
        for (const foot of this.feet()) this.dust?.kick(foot, back, t >= hit ? 1.2 : 0.6);
      }
    } else if (mode === 'call' && this.look?.call) m.play(this.look.call.clip, { once: true, lasts: this.look.call.time, afresh, blend: 0.2 });
    else if (mode === 'rally' && this.look?.rally) {
      const { clip, time, reach } = this.look.rally;
      m.play(clip, { once: true, lasts: time, afresh, blend: 0.2 });
      // Rings of red flung out over the ground as he roars, as far as his shout carries.
      if (afresh) this.shouts?.shout(ground(x, y), reach);
    }
    else if (mode === 'walk' && this.look?.run) m.play(this.look.run, { pace: this.runReach ? Math.max(0.35, this.going / this.runReach) : 1 });
    else if (mode === 'walk') m.play('caminata_mixamo', { pace: this.reach ? Math.max(0.35, this.going / this.reach) : 1 });
    else m.play('reposo_mixamo');
    m.update(dt);
    this.modeWas = mode;
    // The musket on his back or in his hands, and the sabre put away while he has it up.
    const musket = mode === 'aim' || this.fired !== null || !!this.look?.kneels;
    // One who kneels to shoot never puts his musket away: he falls with it.
    const inHand = this.look?.kneels ? true : mode === 'aim' ? t >= DRAW * DRAWN_AT : this.fired !== null && this.fired < SHOT * SLUNG;
    const back = this.body.getObjectByName('mosquete'), hand = this.body.getObjectByName('mosquete_mano'), sabre = this.body.getObjectByName('sable');
    // One with a bayonet thrusts with his rifle in both fists, a rifle of its own.
    const fixed = this.body.getObjectByName('fusil_bayoneta'), stabbing = !!fixed && (mode === 'blow' || !alive(mode));
    if (back) back.visible = !inHand && !stabbing;
    if (hand) hand.visible = inHand;
    if (fixed) fixed.visible = stabbing;
    if (sabre) sabre.visible = !musket;
    // One with a pistol has it in his left hand and his sabre in his right, both always: the sabre
    // as it hangs, or as his thrust holds it (by the little finger's side), while he thrusts.
    const thrust = this.body.getObjectByName('sable_estocada'), thrusting = mode === 'blow' || mode === 'lunge';
    if (pistol && sabre) sabre.visible = !thrusting || !thrust;
    if (pistol && thrust) thrust.visible = thrusting;
    // Struck, he flashes red; quickened by a shout, he throbs a fainter red while it lasts.
    this.clock += dt;
    const throb = who.hasted && alive(mode) ? HASTE.low + (HASTE.high - HASTE.low) * (0.5 + 0.5 * Math.sin(this.clock * HASTE.beat)) : 0;
    this.flash(Math.max(who.hurt, throb));
    this.body.visible = !this.buried;
    if (this.flung.gun) this.flung.gun.visible = true;
    this.body.position.copy(ground(x, y));
    this.body.rotation.y = this.facing;
    this.warn(who, mode, t);
  }

  /** Taken off the field where he lies: he and his blood are gone, until he is up again. */
  bury(): void {
    this.buried = true;
    this.body.visible = false;
    this.blood.clear(this.id);
    this.flung.back();
  }

  /** Where his boots are, on the ground under them. */
  private feet(): THREE.Vector3[] {
    this.body.updateMatrixWorld(true);
    return ['L_Foot', 'R_Foot'].flatMap(name => {
      const bone = this.body.getObjectByName(name);
      if (!bone) return [];
      const at = bone.getWorldPosition(new THREE.Vector3());
      return [at.setY(this.body.position.y)];
    });
  }

  /** Where his hips are, as he lies: his blood pools there, not at his feet. */
  private hips(): THREE.Vector3 {
    this.body.updateMatrixWorld(true);
    let found: THREE.Object3D | null = null;
    this.body.traverse(o => { if (!found && o instanceof THREE.Bone && /hip|pelvis/i.test(o.name)) found = o; });
    return found ? (found as THREE.Object3D).getWorldPosition(new THREE.Vector3()) : this.body.position.clone();
  }

  /** The glow at his muzzle while he aims, growing a little until his aim is fixed; then the glint, until the shot. */
  private warn(who: Royalist, mode: Mode, t: number): void {
    // Or, gathering himself to lunge, at his sabre's point until he throws himself on.
    const lunge = this.look?.lunge, lunging = mode === 'lunge' && !!lunge && t < lunge.charge;
    this.warning.visible = mode === 'aim' || lunging;
    if (!this.warning.visible) return;
    const aim = lunging && lunge ? lunge.charge : this.look?.kneels?.aim ?? this.look?.pistol?.aim ?? AIM;
    const k = Math.min(1, t / (aim - WARN.begins)), left = aim - t;
    this.glow.scale.setScalar(WARN.from + (WARN.to - WARN.from) * k);
    this.glow.material.opacity = WARN.faint + (WARN.full - WARN.faint) * k * k;
    // Swelling to its height a little before the shot, then gone by it.
    const out = left > WARN.begins ? 0 : left > WARN.height ? 1 - (left - WARN.height) / (WARN.begins - WARN.height) : left / WARN.height;
    const eased = out * out * (3 - 2 * out);
    for (const [ray, size] of [[this.halo, WARN.halo], [this.star, WARN.star]] as const) {
      ray.visible = out > 0;
      ray.scale.setScalar(size * (0.35 + 0.65 * eased));
      ray.material.opacity = eased;
      ray.material.rotation = (WARN.begins - left) * WARN.turn / WARN.begins;
    }
    this.warning.position.copy(lunging ? this.point() ?? this.muzzle(who).tip : this.muzzle(who).tip);
  }

  /** Where his sabre's point is, as he holds it to thrust (props.py: its blade 0.31 along it). */
  private point(): THREE.Vector3 | null {
    const blade = this.body.getObjectByName('sable_estocada');
    if (!blade) return null;
    blade.updateWorldMatrix(true, false);
    return new THREE.Vector3(0.31, 0, 0).applyMatrix4(blade.matrixWorld);
  }

  /** Where his shot leaves from and the way it goes: down his barrel, or from his shoulder the way he faces. */
  muzzle(who: Royalist): { tip: THREE.Vector3; way: THREE.Vector3 } {
    this.body.updateMatrixWorld(true);
    const barrel = barrelOf(this.body) ?? pistolOf(this.body);
    if (barrel) return barrel;
    const { x, y, dir } = who.mind;
    return { tip: ground(x, y, MUZZLE * UPRIGHT), way: new THREE.Vector3(dir.x, 0, dir.y).normalize() };
  }
}

/** Where a pistol's muzzle is, in its own units (props.py's PISTOL_MUZZLE), and the way it points, levelled. */
const PISTOL_MUZZLE = new THREE.Vector3(0.13, 0, 0.032);
function pistolOf(body: THREE.Object3D): { tip: THREE.Vector3; way: THREE.Vector3 } | null {
  const gun = body.getObjectByName('pistola');
  if (!gun?.visible) return null;
  gun.updateWorldMatrix(true, false);
  const along = new THREE.Vector3(1, 0, 0).transformDirection(gun.matrixWorld);
  return { tip: PISTOL_MUZZLE.clone().applyMatrix4(gun.matrixWorld), way: new THREE.Vector3(along.x, 0, along.z).normalize() };
}

function alive(mode: Mode): boolean {
  return mode !== 'dying' && mode !== 'gone';
}

/** Every royalist on the field in 3D, each made the first time he is seen. */
export class Royalists {
  readonly group = new THREE.Group();
  private shape: THREE.Group | null = null;
  /** The other kinds' models, by their kind, once loaded. */
  private readonly shapes = new Map<string, THREE.Group>();
  private readonly figures = new Map<Royalist, Figure>();
  /** The blood of those fallen. */
  private readonly blood = new Blood();
  /** A sergeant's shout, on the ground; and felt, as it is loudest (the camera shaken). */
  private readonly shouts = new Shouts();
  /** Dust kicked up off the ground. */
  private readonly dust = new Dust();
  set shoutFelt(felt: (at: THREE.Vector3) => void) { this.shouts.felt = felt; }

  constructor() {
    this.group.add(this.blood.group, this.shouts.group, this.dust.group);
    loading ??= model('realista/3d/realista_animado.glb', DRAWN);
    void loading.then(shape => { this.shape = shape; });
    for (const [kind, look] of Object.entries(LOOKS)) void model(look.url, look.drawn).then(shape => { this.shapes.set(kind, shape); });
  }

  /** Shows each as he is this step; any no longer on the field is taken away. */
  /**
   * Shows each as he is this step; any no longer on the field is taken away. Those too far off to be
   * seen (`seen` says) are neither drawn nor moved: there were dozens over the map, every one drawn
   * and his clips played each frame, three times over (the shadows, the edges, the picture).
   */
  update(dt: number, everyone: readonly Royalist[], seen: (x: number, y: number) => boolean = () => true): void {
    this.blood.update(dt);
    this.shouts.update(dt);
    this.dust.update(dt);
    if (!this.shape) return;
    for (const [who, figure] of this.figures) {
      if (everyone.includes(who)) continue;
      figure.bury();
      this.group.remove(figure.body, figure.warning);
      this.figures.delete(who);
    }
    for (const who of everyone) {
      let figure = this.figures.get(who);
      if (!figure) {
        const kind = who.look3d && LOOKS[who.look3d] ? who.look3d : null;
        const shape = kind ? this.shapes.get(kind) : this.shape;
        // Not loaded yet: drawn once it is.
        if (!shape) continue;
        figure = new Figure(shape, this.blood, kind ? LOOKS[kind] : undefined, this.shouts, this.dust);
        this.figures.set(who, figure);
        this.group.add(figure.body, figure.warning);
      }
      if (seen(who.mind.x, who.mind.y)) figure.update(dt, who);
      else figure.rest(who);
    }
  }

  /** One fallen is taken off the field where he lies, he and his blood. */
  bury(who: Royalist): void {
    this.figures.get(who)?.bury();
  }

  /** Where one's shot leaves from, and the way it goes. */
  muzzle(who: Royalist): { tip: THREE.Vector3; way: THREE.Vector3 } | null {
    return this.figures.get(who)?.muzzle(who) ?? null;
  }

  /** Where to show a blow landing on one: his chest, on the side it came from. */
  chest(who: Royalist, from: { x: number; y: number }): THREE.Vector3 {
    const { x, y } = who.mind, at = ground(x, y, DRAWN * 0.6 * UPRIGHT), toward = along(from.x - x, from.y - y);
    toward.y = 0;
    return toward.lengthSq() > 0 ? at.addScaledVector(toward.normalize(), 8) : at;
  }
}
