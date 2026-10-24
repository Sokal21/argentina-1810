import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { model } from './figure';
import { Motion } from './motion';
import { UPRIGHT } from './space';

// An ox cart as the 3D game draws it: the cart (Tripo from turnaround C, 24 October 2026; its wheels
// taken off to turn and its pole drawn out to the yoke by tools/blender/cart_wheels.py) with two oxen
// under its yoke (Tripo's ox on Quaternius's bull's skeleton, its own walk: tools/blender/fit_to_bull.py).
// It is drawn from its middle, cart and oxen together, looking along its +Z; its wheels roll as far
// as it goes, its oxen walk as fast as it goes (their stride measured off their walk), and stand,
// breathing, and graze now and then, when it stands.

/** How tall the cart stands, to the top of its hide (Cabral is 82), and each ox, to its horns' tips. */
const CART = { url: 'cosas/3d/carreta/carreta_ruedas.glb', drawn: 110 };
const OX = { url: 'cosas/3d/buey/buey_animado.glb', drawn: 72 };
/**
 * Where things are on the cart's model, as shares of its height (cart_wheels.py measures them): its
 * wheels' radius; its yoke, how far ahead of its middle. And on the ox's, as shares of its: how far
 * ahead of its middle its neck is, where the yoke lies. The oxen stand so far to either side of the
 * pole (shares of the cart's height), and the whole is drawn from `middle` ahead of the cart's.
 */
const ON = { wheel: 0.348, yoke: 1.13, neck: 0.39, apart: 0.21, middle: 0.27 };
/** Seconds between grazing and the next, the least and how much more at random, while it stands. */
const GRAZE = { least: 5, more: 8 };

export class Cart {
  readonly group = new THREE.Group();
  /** Whether everything is loaded and in it. */
  ready = false;
  private wheels: THREE.Object3D[] = [];
  private oxen: Motion[] = [];
  /** How far one stride of the oxen's walk carries them, in world units. */
  private stride = 1;
  private going = 0;
  private grazing = 0;
  private next = GRAZE.least;
  private readonly at = new THREE.Vector3();
  private readonly loading: Promise<void>;

  constructor() {
    this.loading = this.load();
  }

  /** Once it is all loaded. */
  get loaded(): Promise<void> {
    return this.loading;
  }

  private async load(): Promise<void> {
    const [cart, ox] = await Promise.all([model(CART.url, CART.drawn), model(OX.url, OX.drawn)]);
    const h = CART.drawn * UPRIGHT;
    // The cart's model looks along -Z: turned to look along +Z, as the oxen do.
    cart.rotation.y = Math.PI;
    cart.position.z = -ON.middle * h;
    this.group.add(cart);
    this.wheels = ['rueda_izquierda', 'rueda_derecha'].flatMap(name => cart.getObjectByName(name) ?? []);
    for (const side of [-1, 1]) {
      const one = clone(ox) as THREE.Group;
      one.animations = ox.animations;
      one.scale.copy(ox.scale);
      one.position.set(side * ON.apart * h, 0, (ON.yoke - ON.middle) * h - ON.neck * OX.drawn * UPRIGHT);
      this.group.add(one);
      const motion = new Motion(one);
      motion.play('Idle', { afresh: true });
      this.oxen.push(motion);
    }
    this.stride = this.oxen[0].reach('Walk', 'FrontLowerLeg.L') * ox.scale.x || 1;
    this.group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true; });
    this.ready = true;
  }

  /**
   * Where it is and which way it looks, this step: it rolls its wheels as far as it has come and its
   * oxen walk as fast; standing, they breathe, and graze now and then.
   */
  update(dt: number, at: THREE.Vector3, facing: number): void {
    const moved = this.ready ? Math.hypot(at.x - this.at.x, at.z - this.at.z) : 0;
    this.at.copy(at);
    this.group.position.copy(at);
    this.group.rotation.y = facing;
    if (!this.ready) return;
    this.going += (Math.min(moved / Math.max(dt, 1e-3), 200) - this.going) * Math.min(1, dt * 8);
    // Rolling forward: the cart is turned half round, so its wheels' own X is backward to it.
    for (const wheel of this.wheels) wheel.rotation.x -= moved / (ON.wheel * CART.drawn * UPRIGHT);
    const walking = this.going > 4;
    for (const ox of this.oxen) {
      if (walking) ox.play('Walk', { pace: Math.max(0.3, this.going / this.stride), blend: 0.25 });
      else if (this.grazing > 0) ox.play('Eating', { once: true, blend: 0.4 });
      else ox.play('Idle', { blend: 0.4 });
      ox.update(dt);
    }
    if (walking) { this.grazing = 0; this.next = GRAZE.least + Math.random() * GRAZE.more; return; }
    if (this.grazing > 0) this.grazing -= dt;
    else if ((this.next -= dt) <= 0) {
      this.grazing = this.oxen[0].seconds('Eating');
      this.next = this.grazing + GRAZE.least + Math.random() * GRAZE.more;
    }
  }
}
