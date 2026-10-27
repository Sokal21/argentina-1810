import * as THREE from 'three';
import { chance } from '../world/chance';
import { middle, type WorldMap } from '../world/zones';
import { flat, joined, part, placed } from './paint';
import { glow } from './realista';
import { ground } from './space';
import { brokenWheel } from './wheel';

// What the story has one do about the map, drawn in 3D as the 2D game draws it: a ring of stones on
// the ground where something can be done (a stand made, a bell lowered, a fire built) while it can be;
// a bonfire standing where one was built, its sticks leant together over straw as the 2D drawing has
// them; and fire on it once it is lit, flames and a glow (no light of its own: a light added to the
// scene has every shader built anew, a stutter). And what makes some places, made by hand: the
// village's well, the cannon overturned where the boy fell.

/** The ring: how wide, how many stones, their sizes and greys. */
const RING = { radius: 20, stones: 10, size: [4, 6.5], greys: ['#b4aea2', '#8a8478', '#cfc9bc'] };
/** The bonfire, as tall and wide as its 2D drawing (52 by 66): its sticks, their colours, the straw round its foot. */
const FIRE = { tall: 60, wide: 22, sticks: 14, thick: [1.1, 2.2], woods: ['#5a4632', '#3e3022', '#74593c', '#2e241a'], straw: '#c8a464', strawWide: 30 };
/** Its flames: how many tongues, how tall, their colours; the glow round them; how fast they leap. */
const FLAME = { tongues: 6, tall: [26, 44], wide: [5, 9], colours: ['#ff8a1e', '#ffc23a', '#ff5a14'], glow: 90, glowColour: '#ff9a3a', beat: 9 };

interface Place { x: number; y: number; ring: THREE.Group; built?: THREE.Group; flames?: { group: THREE.Group; tongues: THREE.Mesh[]; halo: THREE.Sprite } }

export class Errands {
  readonly group = new THREE.Group();
  private readonly places = new Map<string, Place>();
  private clock = 0;

  constructor(map: WorldMap) {
    for (const { plot, thing } of map.objectives) {
      if (!thing) continue;
      const made = thing === 'pozo' ? well() : cannon();
      // The well a little bigger than built: beside Cabral it read as a pot.
      if (thing === 'pozo') made.scale.setScalar(1.3);
      const { x, y } = middle(plot);
      made.position.copy(ground(x, y));
      this.group.add(made);
    }
    for (const spot of map.spots ?? []) {
      const { x, y } = middle(spot.plot);
      // Two spots at one place (the ford, alone and with the village) share it: each its own ring.
      const ring = stones(spot.id);
      ring.position.copy(ground(x, y));
      ring.visible = false;
      this.group.add(ring);
      this.places.set(spot.id, { x, y, ring });
    }
  }

  /** Whether the ring of a place is shown: while what is done there can be. */
  open(id: string, on: boolean): void {
    const place = this.places.get(id);
    if (place) place.ring.visible = on;
  }

  /** A bonfire built at a place: it stands there from now on. */
  build(id: string): void {
    const place = this.places.get(id);
    if (!place || place.built) return;
    // Another place where it stands already has one (a fire lit where it was built): that one.
    const there = [...this.places.values()].find(p => p.built && p.x === place.x && p.y === place.y);
    if (there) { place.built = there.built; return; }
    place.built = bonfire(id);
    place.built.position.copy(ground(place.x, place.y));
    this.group.add(place.built);
  }

  /** Fire at a place: a bonfire there, lit. */
  light(id: string): void {
    this.build(id);
    const place = this.places.get(id);
    if (!place || place.flames) return;
    place.flames = flames(id);
    place.flames.group.position.copy(ground(place.x, place.y));
    this.group.add(place.flames.group);
  }

  update(dt: number): void {
    this.clock += dt;
    for (const [id, place] of this.places) {
      const f = place.flames;
      if (!f) continue;
      // Each tongue leaps at a beat of its own; the glow breathes with them.
      f.tongues.forEach((tongue, i) => {
        const leap = 0.75 + 0.25 * Math.sin(this.clock * FLAME.beat * (0.8 + chance(i, id.length, 3) * 0.6) + i * 1.7);
        tongue.scale.set(1, leap, 1);
      });
      f.halo.material.opacity = 0.42 + 0.1 * Math.sin(this.clock * FLAME.beat * 0.5);
    }
  }
}

/** A ring of stones lying on the ground, each its own size and grey. */
function stones(seed: string): THREE.Group {
  const ring = new THREE.Group(), shape = new THREE.IcosahedronGeometry(1, 0);
  for (let n = 0; n < RING.stones; n++) {
    const r = (k: number) => chance(n, seed.length + k, 13);
    const stone = new THREE.Mesh(shape, flat(RING.greys[n % RING.greys.length]));
    const a = (n / RING.stones) * Math.PI * 2 + r(1) * 0.3, size = RING.size[0] + r(2) * (RING.size[1] - RING.size[0]);
    stone.position.set(Math.cos(a) * RING.radius, size * 0.45, Math.sin(a) * RING.radius);
    stone.scale.set(size, size * 0.75, size * (0.8 + r(3) * 0.4));
    stone.rotation.set(r(4) * 3, r(5) * 3, 0);
    stone.castShadow = stone.receiveShadow = true;
    ring.add(stone);
  }
  return ring;
}

/** A bonfire: sticks leant together to a point over a skirt of straw. */
function bonfire(seed: string): THREE.Group {
  const fire = new THREE.Group();
  for (let n = 0; n < FIRE.sticks; n++) {
    const r = (k: number) => chance(n, seed.length + k, 17);
    const a = (n / FIRE.sticks) * Math.PI * 2 + r(1) * 0.4, out = FIRE.wide * (0.75 + r(2) * 0.35), top = FIRE.tall * (0.8 + r(3) * 0.3);
    const foot = new THREE.Vector3(Math.cos(a) * out, 0, Math.sin(a) * out), tip = new THREE.Vector3((r(4) - 0.5) * 3, top, (r(5) - 0.5) * 3);
    const length = foot.distanceTo(tip), thick = FIRE.thick[0] + r(6) * (FIRE.thick[1] - FIRE.thick[0]);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.6, thick, length, 5), flat(FIRE.woods[n % FIRE.woods.length]));
    stick.position.copy(foot).lerp(tip, 0.5);
    stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(foot).normalize());
    stick.castShadow = true;
    fire.add(stick);
  }
  const straw = new THREE.Mesh(new THREE.CircleGeometry(FIRE.strawWide, 9).rotateX(-Math.PI / 2), flat(FIRE.straw));
  straw.position.y = 0.4;
  straw.receiveShadow = true;
  fire.add(straw);
  return fire;
}

/** Flames on a bonfire: tongues of fire leaping up through its sticks, and a glow about them. */
function flames(seed: string): NonNullable<Place['flames']> {
  const group = new THREE.Group(), tongues: THREE.Mesh[] = [];
  for (let n = 0; n < FLAME.tongues; n++) {
    const r = (k: number) => chance(n, seed.length + k, 19);
    const tall = FLAME.tall[0] + r(1) * (FLAME.tall[1] - FLAME.tall[0]), wide = FLAME.wide[0] + r(2) * (FLAME.wide[1] - FLAME.wide[0]);
    // Its foot at the ground, so it leaps upward from there.
    const shape = new THREE.ConeGeometry(wide, tall, 6).translate(0, tall / 2, 0);
    const tongue = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color: FLAME.colours[n % FLAME.colours.length], transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    const a = r(3) * Math.PI * 2, out = r(4) * 8;
    tongue.position.set(Math.cos(a) * out, 2, Math.sin(a) * out);
    tongues.push(tongue);
    group.add(tongue);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: FLAME.glowColour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(FLAME.glow);
  halo.position.y = 24;
  group.add(halo);
  return { group, tongues, halo };
}

/** The village's well: a low round curb of stones, two posts and a crossbar over it, a rope down to a bucket on its edge. */
function well(): THREE.Object3D {
  const stone = ['#9a9488', '#7e786c', '#b0aa9c'], pieces: THREE.BufferGeometry[] = [];
  // The curb, in courses of blocks round its mouth.
  for (let course = 0; course < 3; course++) {
    for (let n = 0; n < 12; n++) {
      const a = (n + course * 0.5) / 12 * Math.PI * 2;
      pieces.push(part(placed(new THREE.BoxGeometry(8, 5, 6), [Math.cos(a) * 15, 2.5 + course * 5, Math.sin(a) * 15], [0, -a, 0]), stone[(n + course) % 3]));
    }
  }
  // Its mouth, dark.
  pieces.push(part(placed(new THREE.CylinderGeometry(12, 12, 1, 12), [0, 12, 0]), '#14110e'));
  // Two posts, the crossbar, the rope, the bucket hung on the edge.
  for (const side of [-1, 1]) pieces.push(part(placed(new THREE.BoxGeometry(3, 34, 3), [side * 17, 17, 0]), '#4a3a28'));
  pieces.push(part(placed(new THREE.CylinderGeometry(1.6, 1.6, 38, 6), [0, 32, 0], [0, 0, Math.PI / 2]), '#5e4a32'));
  pieces.push(part(placed(new THREE.CylinderGeometry(0.4, 0.4, 14, 4), [3, 25, 0]), '#b09a6a'));
  pieces.push(part(placed(new THREE.CylinderGeometry(3.2, 2.6, 5, 8), [3, 16, 0]), '#5a4630'));
  const mesh = new THREE.Mesh(joined(pieces), flat());
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A field gun overturned: its barrel fallen on the ground, its carriage on its side, a wheel come off beside it. */
function cannon(): THREE.Object3D {
  const pieces: THREE.BufferGeometry[] = [];
  // The barrel, thick at its breech, lying across; a ring at its muzzle.
  pieces.push(part(placed(new THREE.CylinderGeometry(4, 6, 52, 10), [0, 5.5, 0], [0, 0.4, Math.PI / 2]), '#2e3236'));
  pieces.push(part(placed(new THREE.CylinderGeometry(5, 5, 3, 10), [-24, 5, -10], [0, 0.4, Math.PI / 2]), '#262a2e'));
  // The carriage, its two cheeks and the trail, on its side behind.
  pieces.push(part(placed(new THREE.BoxGeometry(46, 12, 4), [8, 6, 16], [0.2, -0.3, Math.PI / 2 - 0.2]), '#5a4630'));
  pieces.push(part(placed(new THREE.BoxGeometry(40, 4, 14), [12, 2, 18], [0, -0.3, 0]), '#4a3a28'));
  const mesh = new THREE.Mesh(joined(pieces), flat());
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group(), wheel = brokenWheel(18, 1.35);
  wheel.position.set(-14, 0, 22);
  wheel.rotation.y = 0.9;
  group.add(mesh, wheel);
  return group;
}
