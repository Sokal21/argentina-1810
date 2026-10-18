import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AIM, MUZZLE, SLASH_TIME, type Mode } from '../realista/brain';
import { barrelOf } from './cabral';
import { flashes, model } from './figure';
import { Motion } from './motion';
import { ground, heading, UPRIGHT } from './space';

// The royalist fusilier in 3D, shown doing whatever his brain is doing (realista/brain.ts): standing,
// marching, drawing the musket and aiming, the shot, the sabre, falling. His model is Cabral's
// clips put on the royalist's body (assets/realista/3d); it is loaded once and copied for each.

/** How tall he is drawn, beside Cabral's 82: a little smaller, as in the 2D game. */
const DRAWN = 78;
/** Seconds of his aim spent drawing the musket from his back; the rest he holds it levelled. */
const DRAW = Math.min(0.45, AIM * 0.55);
/** How long the shot's clip lasts, from the kick until he has slung the musket again. */
const SHOT = 0.8;
/** The shares of the draw and of the shot at which the musket is in his hands (as Cabral's, cabral.ts). */
const DRAWN_AT = 0.67, SLUNG = 0.63;
/** How fast he turns, per second; how quickly how fast he is taken to go follows how fast he goes. */
const TURN = 10, SETTLE = 10;
/** Seconds he lies once fallen before he is gone from the field. */
const LIES = 0.8;

/** What his figure needs to know of him: his brain's state, and how red he flashes. */
export interface Royalist {
  readonly mind: { readonly x: number; readonly y: number; readonly mode: Mode; readonly t: number; readonly dir: { x: number; y: number } };
  readonly hurt: number;
}

let loading: Promise<THREE.Group> | null = null;

class Figure {
  readonly body: THREE.Group;
  private readonly motion: Motion;
  private readonly flash: (amount: number) => void;
  private readonly reach: number;
  private facing = 0;
  private going = 0;
  private was = { x: 0, y: 0 };
  /** How long since his last shot, while its clip still plays. */
  private fired: number | null = null;
  private modeWas: Mode | null = null;

  constructor(shape: THREE.Group) {
    this.body = clone(shape) as THREE.Group;
    this.body.animations = shape.animations;
    this.motion = new Motion(this.body);
    this.flash = flashes(this.body);
    this.reach = this.motion.reach('caminata_mixamo', 'L_Foot') * shape.scale.x;
  }

  update(dt: number, who: Royalist): void {
    const { x, y, mode, t, dir } = who.mind;
    const moved = { x: x - this.was.x, y: y - this.was.y };
    this.was = { x, y };
    const over = ground(moved.x, moved.y).length() / Math.max(dt, 1e-3);
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
    if (mode === 'dying') m.play('muerte', { once: true, afresh, blend: 0.08 });
    else if (mode === 'gone') m.play('muerte', { once: true });
    else if (this.fired !== null) m.play('mosquete_disparo', { once: true, lasts: SHOT, afresh: this.fired === 0, blend: 0.03 });
    else if (mode === 'aim') {
      if (t < DRAW) m.play('mosquete_sacar', { once: true, lasts: DRAW, afresh, blend: 0.06 });
      else m.play('mosquete_apuntar', { blend: 0.05 });
    } else if (mode === 'slash') m.play('tajo', { once: true, lasts: SLASH_TIME, afresh, blend: 0.05 });
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
    this.body.visible = mode !== 'gone' || t < LIES;
    this.body.position.copy(ground(x, y));
    this.body.rotation.y = this.facing;
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
  private readonly figures = new Map<Royalist, Figure>();

  constructor() {
    loading ??= model('realista/3d/realista_animado.glb', DRAWN);
    void loading.then(shape => { this.shape = shape; });
  }

  /** Shows each as he is this step; any no longer on the field is taken away. */
  update(dt: number, everyone: readonly Royalist[]): void {
    if (!this.shape) return;
    for (const [who, figure] of this.figures) {
      if (everyone.includes(who)) continue;
      this.group.remove(figure.body);
      this.figures.delete(who);
    }
    for (const who of everyone) {
      let figure = this.figures.get(who);
      if (!figure) {
        figure = new Figure(this.shape);
        this.figures.set(who, figure);
        this.group.add(figure.body);
      }
      figure.update(dt, who);
    }
  }

  /** Where one's shot leaves from, and the way it goes. */
  muzzle(who: Royalist): { tip: THREE.Vector3; way: THREE.Vector3 } | null {
    return this.figures.get(who)?.muzzle(who) ?? null;
  }

  /** Where to show a blow landing on one: his chest, on the side it came from. */
  chest(who: Royalist, from: { x: number; y: number }): THREE.Vector3 {
    const { x, y } = who.mind, at = ground(x, y, DRAWN * 0.6 * UPRIGHT), toward = ground(from.x - x, from.y - y);
    toward.y = 0;
    return toward.lengthSq() > 0 ? at.addScaledVector(toward.normalize(), 8) : at;
  }
}
