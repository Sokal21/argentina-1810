import * as THREE from 'three';
import type { Footprint } from '../world/footprint';
import { flat, joined, part, placed } from './paint';
import { along, ground, UPRIGHT } from './space';

// A practice dummy: a post with a crosspiece for arms, a sacking body stuffed with straw, a sacking
// head tied off, straw sticking out at the ends. Struck, it flashes red (as the 2D game's HitFX
// flashes a hurt sprite), rocks away from the blow and springs back, and straw flies the way the
// blade went. It never falls.

/** How tall it stands, as a figure would be drawn; and the ground it takes up. */
const DRAWN = 76;
const FOOT = { hw: 7, hh: 3.5 };
/** How wide it is to a blow (the 2D game's girth). */
export const GIRTH = 10;
/** How far it rocks from a blow, how stiff its post is, and how soon it stops. */
const ROCK = 0.32, STIFF = 90, DAMP = 7;
/** The flash: its colour, and how fast it fades, per second. */
const FLASH = new THREE.Color('#ff2a1a'), FADE = 7;
const STRAW = { count: 14, speed: 120, rise: 70, fall: 260, life: 0.55 };

export class Dummy {
  readonly group = new THREE.Group();
  readonly footprint: Footprint;
  private readonly body: THREE.Mesh;
  private readonly material = flat();
  /** Its lean, and how fast it is leaning, about the two ground axes. */
  private readonly lean = new THREE.Vector2();
  private readonly swing = new THREE.Vector2();
  private flash = 0;
  private readonly straw: THREE.InstancedMesh;
  private bits: { at: THREE.Vector3; v: THREE.Vector3; spin: number; life: number }[] = [];

  constructor(readonly x: number, readonly y: number) {
    const post = '#6b5238', sack = '#b39a6a', tie = '#5a4630', straw = '#e0c45c';
    const h = 1;
    const shape = joined([
      part(placed(new THREE.CylinderGeometry(0.035, 0.045, h * 0.62, 6), [0, h * 0.31, 0]), post),
      part(placed(new THREE.BoxGeometry(0.62, 0.05, 0.05), [0, h * 0.7, 0]), post),
      part(placed(new THREE.CylinderGeometry(0.13, 0.11, h * 0.36, 7), [0, h * 0.58, 0]), sack),
      part(placed(new THREE.BoxGeometry(0.28, 0.035, 0.24), [0, h * 0.42, 0]), tie),
      part(placed(new THREE.IcosahedronGeometry(0.1, 1), [0, h * 0.87, 0], [0, 0, 0], [1, 1.1, 1]), sack),
      part(placed(new THREE.CylinderGeometry(0.035, 0.05, 0.05, 6), [0, h * 0.77, 0]), tie),
      // Straw out of the sleeves, the neck and the hem.
      ...[-1, 1].map(side => part(placed(new THREE.ConeGeometry(0.045, 0.12, 5), [side * 0.36, h * 0.7, 0], [0, 0, side * Math.PI / 2]), straw)),
      part(placed(new THREE.ConeGeometry(0.11, 0.1, 6), [0, h * 0.38, 0], [Math.PI, 0, 0]), straw),
      part(placed(new THREE.ConeGeometry(0.04, 0.06, 5), [0, h * 0.97, 0]), straw),
    ]);
    this.body = new THREE.Mesh(shape, this.material);
    this.body.castShadow = this.body.receiveShadow = true;
    this.body.scale.setScalar(DRAWN * UPRIGHT);
    this.group.add(this.body);
    this.group.position.copy(ground(x, y));
    this.footprint = { x, y: y - FOOT.hh, ...FOOT };

    this.straw = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.8, 0.8), flat(straw), STRAW.count);
    this.straw.frustumCulled = false;
    this.straw.count = 0;
  }

  /** Where it stands on the 2D ground. */
  get spot(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** What flies off it, to be added to the scene beside it. */
  get debris(): THREE.Object3D {
    return this.straw;
  }

  /** Where a blade going (dx, dy) along the 2D ground meets it: its chest, on the near side. */
  struckAt(dx: number, dy: number): THREE.Vector3 {
    const way = along(dx, dy).normalize();
    return this.group.position.clone().add(new THREE.Vector3(0, DRAWN * UPRIGHT * 0.6, 0)).addScaledVector(way, -GIRTH);
  }

  /** Struck, by a blow going (dx, dy) along the 2D ground. */
  hit(dx: number, dy: number): void {
    this.flash = 1;
    // Knocked over the way the blow went: a lean toward +X is a turn about -Z, toward +Z about +X.
    const way = along(dx, dy).normalize();
    this.swing.x += way.z * ROCK * STIFF * 0.12;
    this.swing.y += -way.x * ROCK * STIFF * 0.12;
    const from = this.group.position.clone().add(new THREE.Vector3(0, DRAWN * UPRIGHT * 0.6, 0));
    for (let i = 0; i < STRAW.count; i++) {
      const spread = new THREE.Vector3((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9);
      const v = way.clone().add(spread).normalize().multiplyScalar(STRAW.speed * (0.5 + Math.random()));
      v.y = STRAW.rise * (0.4 + Math.random());
      this.bits.push({ at: from.clone(), v, spin: (Math.random() - 0.5) * 20, life: STRAW.life * (0.6 + Math.random() * 0.6) });
    }
    if (this.bits.length > STRAW.count) this.bits.splice(0, this.bits.length - STRAW.count);
  }

  update(dt: number): void {
    // The post springs back upright, a little less each time it passes.
    this.swing.x += (-this.lean.x * STIFF - this.swing.x * DAMP) * dt;
    this.swing.y += (-this.lean.y * STIFF - this.swing.y * DAMP) * dt;
    this.lean.addScaledVector(this.swing, dt);
    this.body.rotation.set(this.lean.x, 0, this.lean.y);

    this.flash = Math.max(0, this.flash - FADE * dt);
    this.material.emissive.copy(FLASH).multiplyScalar(this.flash);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    this.bits = this.bits.filter(b => (b.life -= dt) > 0);
    this.bits.forEach((b, i) => {
      b.v.y -= STRAW.fall * dt;
      b.at.addScaledVector(b.v, dt);
      if (b.at.y < 0) { b.at.y = 0; b.v.set(0, 0, 0); }
      q.setFromEuler(new THREE.Euler(0, b.spin * b.life, b.spin * b.life * 0.5));
      this.straw.setMatrixAt(i, m.compose(b.at, q, one));
    });
    this.straw.count = this.bits.length;
    this.straw.instanceMatrix.needsUpdate = true;
  }
}
