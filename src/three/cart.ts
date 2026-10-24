import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { model } from './figure';
import { flat, joined, part, placed } from './paint';
import { Motion } from './motion';
import { UPRIGHT } from './space';

// An ox cart as the 3D game draws it: the cart (Tripo from turnaround C, 24 October 2026; its wheels
// taken off and its pole drawn out to the yoke by tools/blender/cart_wheels.py), wheels of its own
// built here that turn on their hubs (Tripo's were all one piece with the cart), with two oxen
// under its yoke (Tripo's ox on Quaternius's bull's skeleton, its own walk: tools/blender/fit_to_bull.py).
// It is drawn from its middle, cart and oxen together, looking along its +Z; its wheels roll as far
// as it goes, its oxen walk as fast as it goes (their stride measured off their walk), and stand,
// breathing, and graze now and then, when it stands.

/** How tall the cart stands, to the top of its hide (Cabral is 82), and each ox, to its horns' tips. */
const CART = { url: 'cosas/3d/carreta/carreta_sin_ruedas.glb', drawn: 110 };
const OX = { url: 'cosas/3d/buey/buey_animado.glb', drawn: 72 };
/**
 * Where things are on the cart's model, as shares of its height (cart_wheels.py measures them): its
 * wheels' radius; its yoke, how far ahead of its middle. And on the ox's, as shares of its: how far
 * ahead of its middle its neck is, where the yoke lies. The oxen stand so far to either side of the
 * pole (shares of the cart's height), and the whole is drawn from `middle` ahead of the cart's.
 */
const ON = { wheel: 0.278, hub: { along: -0.322, up: 0.272, out: 0.29 }, yoke: 1.13, neck: 0.39, apart: 0.21, middle: 0.27 };
/** The wheels' wood and iron, as the cart's; how thick their rim, how many spokes. */
const WHEEL = { wood: '#5e4630', hub: '#46352a', iron: '#3a3430', spokes: 12 };
/** The bell it may carry: how tall, as a share of the cart's height; where it lies in the bed (along it, up): at its tail, where it shows past the hide (under it, it was not seen from above). */
const BELL = { tall: 0.24, along: -0.9, up: 0.33, bronze: '#a8783a', dark: '#5e4220' };
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
  private walking = false;
  /** Each ox's grazing, its own: seconds left of it, and until the next. */
  private grazing: number[] = [];
  private next: number[] = [];
  private readonly at = new THREE.Vector3();
  private readonly loading: Promise<void>;

  /** `bell`: it carries the chapel's bell in its bed; `yoked`: its oxen are under its yoke (a cart left standing has none). */
  constructor(private readonly bell = false, private readonly yoked = true) {
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
    // Its wheels, on its hubs (the model turned half round twice over: glTF and here, its along is ours).
    this.wheels = [-1, 1].map(side => {
      const one = wheel(ON.wheel * h);
      one.position.set(side * ON.hub.out * h, ON.hub.up * h, (ON.hub.along - ON.middle) * h);
      this.group.add(one);
      return one;
    });
    for (const side of this.yoked ? [-1, 1] : []) {
      const one = clone(ox) as THREE.Group;
      one.animations = ox.animations;
      one.scale.copy(ox.scale);
      one.position.set(side * ON.apart * h, 0, (ON.yoke - ON.middle) * h - ON.neck * OX.drawn * UPRIGHT);
      this.group.add(one);
      const motion = new Motion(one);
      motion.play('Idle', { afresh: true });
      // Each breathing at a moment of its own.
      motion.shift(Math.random() * motion.seconds('Idle'));
      this.oxen.push(motion);
      this.grazing.push(0);
      this.next.push(GRAZE.least + Math.random() * GRAZE.more);
    }
    this.stride = this.oxen[0]?.reach('Walk', 'FrontLowerLeg.L') * ox.scale.x || 1;
    if (this.bell) this.group.add(bell(h));
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
    // Rolling forward (+Z): its top goes ahead, a turn about +X.
    for (const one of this.wheels) one.rotation.x += moved / (ON.wheel * CART.drawn * UPRIGHT);
    const walking = this.going > 4;
    this.oxen.forEach((ox, n) => {
      // The second half a stride behind the first: in step, side by side, they read as one ox and its ghost.
      if (walking) {
        ox.play('Walk', { pace: Math.max(0.3, this.going / this.stride), blend: 0.25 });
        if (!this.walking && n === 1) ox.shift(ox.seconds('Walk') * 0.45);
        this.grazing[n] = 0;
        this.next[n] = GRAZE.least + Math.random() * GRAZE.more;
      } else {
        // Standing, each grazes now and then, when it will.
        if (this.grazing[n] > 0) this.grazing[n] -= dt;
        else if ((this.next[n] -= dt) <= 0) {
          this.grazing[n] = ox.seconds('Eating');
          this.next[n] = this.grazing[n] + GRAZE.least + Math.random() * GRAZE.more;
          ox.play('Eating', { once: true, afresh: true, blend: 0.4 });
        }
        if (this.grazing[n] <= 0) ox.play('Idle', { blend: 0.4 });
      }
      ox.update(dt);
    });
    this.walking = walking;
  }
}

/** A church bell lying in a cart's bed, mouth back: turned bronze, a dark lip and its crown's loop. */
function bell(h: number): THREE.Object3D {
  const t = BELL.tall * h;
  const profile = [[0, 0], [0.5, 0.02], [0.52, 0.1], [0.42, 0.25], [0.33, 0.6], [0.3, 0.85], [0.2, 0.97], [0, 1]]
    .map(([r, y]) => new THREE.Vector2(r * t, y * t));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 12), flat(BELL.bronze));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5 * t, 0.05 * t, 4, 12).rotateX(Math.PI / 2), flat(BELL.dark));
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.12 * t, 0.04 * t, 4, 8), flat(BELL.dark));
  loop.position.y = t * 1.05;
  const it = new THREE.Group();
  it.add(body, lip, loop);
  // Lying on its side in the bed, its mouth toward the back.
  it.rotation.x = -Math.PI / 2;
  it.position.set(0, BELL.up * h, BELL.along * h);
  return it;
}

/** A cart wheel turning about its own X: an iron tyre over a wooden rim, spokes from a thick hub. */
function wheel(r: number): THREE.Mesh {
  const pieces: THREE.BufferGeometry[] = [];
  const ring = (radius: number, thick: number, colour: string) =>
    pieces.push(part(new THREE.TorusGeometry(radius, thick, 4, 24).rotateY(Math.PI / 2), colour));
  ring(r * 0.92, r * 0.07, WHEEL.wood);
  ring(r * 0.99, r * 0.035, WHEEL.iron);
  pieces.push(part(placed(new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 0.34, 8), [0, 0, 0], [0, 0, Math.PI / 2]), WHEEL.hub));
  for (let i = 0; i < WHEEL.spokes; i++) {
    const a = (i / WHEEL.spokes) * Math.PI * 2, long = r * 0.78;
    pieces.push(part(placed(new THREE.BoxGeometry(r * 0.05, long, r * 0.06), [0, Math.cos(a) * (r * 0.14 + long / 2), Math.sin(a) * (r * 0.14 + long / 2)], [a, 0, 0]), WHEEL.wood));
  }
  const mesh = new THREE.Mesh(joined(pieces), flat());
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
