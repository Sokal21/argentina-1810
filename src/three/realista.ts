import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AIM, MUZZLE, SLASH_TIME, type Mode as RealistaMode } from '../realista/brain';
import { KINDS, type Mode as TroopMode } from '../tropa/brain';
import { Blood } from './blood';
import { barrelOf } from './cabral';
import { flashes, model } from './figure';
import { Motion } from './motion';
import { along, ground, heading, UPRIGHT } from './space';

// The royalist fusilier in 3D, shown doing whatever his brain is doing (realista/brain.ts): standing,
// marching, drawing the musket and aiming, the shot, the sabre, falling. His model is Cabral's
// clips put on the royalist's body (assets/realista/3d); it is loaded once and copied for each.
// Fallen, he lies where he fell, in his blood, until he is up again or taken off the field.

type Mode = RealistaMode | TroopMode;

/** How tall he is drawn, beside Cabral's 82: a little smaller, as in the 2D game. */
const DRAWN = 78;
/**
 * The other kinds drawn in 3D, by their kind: their model and how tall it is drawn; for one who
 * strikes, the clip of his blow and how far into it (a share) the blow lands, so it is played at
 * the pace that lands it when his brain does.
 */
const LOOKS: Record<string, { url: string; drawn: number; blow?: { clip: string; lands: number; hit: number } }> = {
  // A head over his men. His blow lands at frame 34 of 76 (golpe_pesado.py).
  sargento: { url: 'tropa/sargento3d/sargento_animado.glb', drawn: 90, blow: { clip: 'barrido', lands: 34 / 76, hit: KINDS.sargento.blow.hit } },
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
function glow(): THREE.Texture {
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
}

let loading: Promise<THREE.Group> | null = null;

class Figure {
  readonly body: THREE.Group;
  private readonly motion: Motion;
  private readonly flash: (amount: number) => void;
  private readonly reach: number;
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
  /** Taken off the field, fallen: not drawn, nor his blood, until he is up again. */
  private buried = false;
  /** Which he is, to his blood. */
  private static count = 0;
  private readonly id = Figure.count++;

  constructor(shape: THREE.Group, private readonly blood: Blood, private readonly look?: (typeof LOOKS)[string]) {
    this.body = clone(shape) as THREE.Group;
    this.body.animations = shape.animations;
    this.motion = new Motion(this.body);
    this.flash = flashes(this.body);
    this.reach = this.motion.reach('caminata_mixamo', 'L_Foot') * shape.scale.x;
    this.warning.add(this.glow, this.halo, this.star);
    this.warning.visible = false;
  }

  /**
   * Out of sight: not drawn, and taken up again where he is when he comes back into it. Up again
   * out of sight, at his post, his blood is gone from where he fell, which may well be in sight.
   */
  rest(who: Royalist): void {
    this.body.visible = this.warning.visible = false;
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
    if (mode === 'lower' && this.modeWas === 'aim') this.fired = 0;
    else if (this.fired !== null) this.fired += dt;
    if (this.fired !== null && (this.fired >= SHOT || mode === 'slash' || mode === 'aim' || !alive(mode))) this.fired = null;
    const m = this.motion, afresh = mode !== this.modeWas;
    // Falling, his blood flung from his chest; down, pooling under him. Come upon already down
    // (first seen so, or seen again), he is lying there, his blood spread.
    if (mode === 'dying' && afresh) this.blood.splash(this.id, ground(x, y, DRAWN * 0.62 * UPRIGHT));
    if (mode === 'gone' && afresh && this.modeWas !== 'dying') m.hold('muerte', 1);
    if (mode === 'gone' && afresh && !this.buried) {
      m.update(0);
      this.body.position.copy(ground(x, y));
      this.body.rotation.y = this.facing;
      this.blood.pool(this.id, this.hips(), this.modeWas === 'dying' ? 0 : 1);
    }
    if (alive(mode) && !alive(this.modeWas ?? 'stand')) { this.blood.clear(this.id); this.buried = false; }
    if (mode === 'dying') m.play('muerte', { once: true, afresh, blend: 0.08 });
    else if (mode === 'gone') m.play('muerte', { once: true });
    else if (this.fired !== null) m.play('mosquete_disparo', { once: true, lasts: SHOT, afresh: this.fired === 0, blend: 0.03 });
    else if (mode === 'aim') {
      if (t < DRAW) m.play('mosquete_sacar', { once: true, lasts: DRAW, afresh, blend: 0.06 });
      else m.play('mosquete_apuntar', { blend: 0.05 });
    } else if (mode === 'slash') m.play('tajo', { once: true, lasts: SLASH_TIME, afresh, blend: 0.05 });
    else if (mode === 'blow' && this.look?.blow) {
      // At the pace that lands his blow when his brain does.
      const { clip, lands, hit } = this.look.blow;
      m.play(clip, { once: true, pace: (lands * m.seconds(clip)) / hit, afresh, blend: 0.1 });
    }
    else if (mode === 'walk') m.play('caminata_mixamo', { pace: this.reach ? Math.max(0.35, this.going / this.reach) : 1 });
    else m.play('reposo_mixamo');
    m.update(dt);
    this.modeWas = mode;
    // The musket on his back or in his hands, and the sabre put away while he has it up.
    const musket = mode === 'aim' || this.fired !== null;
    const inHand = mode === 'aim' ? t >= DRAW * DRAWN_AT : this.fired !== null && this.fired < SHOT * SLUNG;
    const back = this.body.getObjectByName('mosquete'), hand = this.body.getObjectByName('mosquete_mano'), sabre = this.body.getObjectByName('sable');
    if (back) back.visible = !inHand;
    if (hand) hand.visible = inHand;
    if (sabre) sabre.visible = !musket;
    this.flash(who.hurt);
    this.body.visible = !this.buried;
    this.body.position.copy(ground(x, y));
    this.body.rotation.y = this.facing;
    this.warn(who, mode, t);
  }

  /** Taken off the field where he lies: he and his blood are gone, until he is up again. */
  bury(): void {
    this.buried = true;
    this.body.visible = false;
    this.blood.clear(this.id);
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
    this.warning.visible = mode === 'aim';
    if (mode !== 'aim') return;
    const k = Math.min(1, t / (AIM - WARN.begins)), left = AIM - t;
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
    this.warning.position.copy(this.muzzle(who).tip);
  }

  /** Where his shot leaves from and the way it goes: down his barrel, or from his shoulder the way he faces. */
  muzzle(who: Royalist): { tip: THREE.Vector3; way: THREE.Vector3 } {
    this.body.updateMatrixWorld(true);
    const barrel = barrelOf(this.body);
    if (barrel) return barrel;
    const { x, y, dir } = who.mind;
    return { tip: ground(x, y, MUZZLE * UPRIGHT), way: new THREE.Vector3(dir.x, 0, dir.y).normalize() };
  }
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

  constructor() {
    this.group.add(this.blood.group);
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
        figure = new Figure(shape, this.blood, kind ? LOOKS[kind] : undefined);
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
