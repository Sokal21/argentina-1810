import * as THREE from 'three';
import { ground as along } from '../machi/abilities';
import type { Vec } from '../machi/controller';
import { GRENADE } from '../machi/grenade';
import { READY, SPENT } from './aim';
import { retire } from './paint';
import { ground, UPRIGHT } from './space';

// Cabral's grenade in 3D, as the 2D game reckons it (src/scenes/GameScene.ts: lob, updateGrenades,
// kindle): while it is drawn back, how far he can throw round him and the patch it would land on;
// thrown, a ball of black iron with its fuse alight, out of his hand along the 2D game's arc and
// down on the spot as the 2D game's lands; and there a blast (a flash that lights the ground, a
// fireball, a ring as wide as the blast hurts, earth flung up and smoke) and a patch of ground
// left burning as long as the 2D game's burns. What it hurts is the 2D game's to say.

/** How far above the ground what lies on it is drawn, so it lies over the ground's own pixels. */
const LIFT = 0.6;
const BALL = { radius: 3.2, colour: '#1e1c1c', spark: '#ffcf6a', sparkSize: 2.4 };
const FLASH = { colour: '#ffb35a', light: 16, reach: 280, life: 0.22 };
const FIREBALL = { colour: '#ffd27a', outer: '#ff7a2a', grow: 0.16, life: 0.36, size: 0.75 };
const RING = { colour: '#ffb45a', life: 0.4 };
const SMOKE = { puffs: 14, life: 1.8, colour: '#4a4440', rise: 30 };
const CLODS = { count: 16, colour: '#5a4630', speed: 110, up: 150, fall: 420, life: 1.1 };
const FIRE = {
  tongues: 18, low: 7, high: 20, colours: ['#ffd06a', '#ff9a3a', '#ff6a2a'], light: 3, reach: 140,
  embers: 26, emberColour: '#ffb060', scorch: '#2a2018', fadeOut: 1,
};

/** The marks of the throw: the reach round him, faint, and the patch it would land on, filled. Drawn
 * over everything: flat at the ground's lie where each stands, a rise under it cut it off. */
export class GrenadeMarks {
  readonly group = new THREE.Group();
  private readonly reach: THREE.LineLoop;
  private readonly edge: THREE.LineLoop;
  private readonly patch: THREE.Mesh;

  constructor() {
    const loop = (radius: number, opacity: number) => {
      const points = Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      });
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: READY, transparent: true, opacity, depthWrite: false, depthTest: false }));
      line.frustumCulled = false;
      return line;
    };
    this.reach = loop(GRENADE.range, 0.35);
    this.edge = loop(GRENADE.radius, 0.9);
    this.patch = new THREE.Mesh(new THREE.CircleGeometry(GRENADE.radius, 40),
      new THREE.MeshBasicMaterial({ color: READY, transparent: true, opacity: 0.14, depthWrite: false, depthTest: false }));
    this.patch.rotation.x = -Math.PI / 2;
    this.group.add(this.reach, this.edge, this.patch);
    this.group.visible = false;
  }

  /** Shown while it is drawn back: round where he stands, and on the spot aimed at, pulled in to his reach. */
  show(from: Vec | null, at: Vec | null, ready = true): void {
    this.group.visible = !!(from && at);
    if (!from || !at) return;
    const to = within(from, at, GRENADE.range);
    this.reach.position.copy(ground(from.x, from.y, LIFT));
    this.edge.position.copy(ground(to.x, to.y, LIFT));
    this.patch.position.copy(ground(to.x, to.y, LIFT * 0.5));
    const colour = ready ? READY : SPENT;
    for (const thing of [this.reach, this.edge, this.patch]) ((thing.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial).color.copy(colour));
  }
}

/** A spot on the ground, pulled in to a reach round another if it is beyond it (as GameScene's `within`). */
export function within(from: Vec, spot: Vec, reach: number): Vec {
  const far = along(from, spot);
  if (far <= reach) return { ...spot };
  return { x: from.x + ((spot.x - from.x) * reach) / far, y: from.y + ((spot.y - from.y) * reach) / far };
}

interface Flying {
  to: Vec;
  /** Seconds until it leaves his hand, then in the air, and how long it is in the air. */
  wait: number;
  t: number;
  time: number;
  arc: number;
  from: THREE.Vector3;
  hand: () => THREE.Vector3 | null;
  ball: THREE.Group;
}
interface Bit { mesh: THREE.Mesh; t: number; life: number; v: THREE.Vector3; grow: [number, number]; fall?: number; fade: number }
interface Burning { at: THREE.Vector3; t: number; tongues: { mesh: THREE.Mesh; height: number; rate: number; phase: number }[]; scorch: THREE.Mesh }

export class Grenades {
  readonly group = new THREE.Group();
  private flying: Flying[] = [];
  private bits: Bit[] = [];
  private fires: Burning[] = [];
  private blasts: { ball: THREE.Mesh; outer: THREE.Mesh; ring: THREE.LineLoop; t: number }[] = [];
  /**
   * The lights of the flash and of the fire, kept in the scene and dark between: a light come and
   * gone had every lit material built anew, a freeze of most of a second at each grenade. One of
   * each (one fire burns at a time, the cooldown being longer); the latest blast or fire has it.
   */
  private readonly flash = new THREE.PointLight(FLASH.colour, 0, FLASH.reach, 1.5);
  private readonly fireLight = new THREE.PointLight(FIRE.colours[1], 0, FIRE.reach, 1.5);
  private readonly round = new THREE.IcosahedronGeometry(1, 1);
  private readonly rough = new THREE.IcosahedronGeometry(1, 0);
  private readonly clod = new THREE.BoxGeometry(1, 1, 1);
  private readonly tongue = new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0);

  /** `landed`: called where each one goes off, for the camera's jolt. */
  constructor(private readonly camera: THREE.Camera, private readonly landed: (at: Vec) => void = () => {}) {
    this.group.add(this.flash, this.fireLight);
  }

  /**
   * Thrown from `from` to `to` on the 2D ground, as the 2D game lobs it: as long in the air and as
   * high, landing when that one does. It leaves his hand `wait` seconds into the throw, from
   * wherever `hand` says his hand is then, and makes up the time in the air.
   */
  lob(from: Vec, to: Vec, wait = 0, hand: () => THREE.Vector3 | null = () => null): void {
    const share = Math.min(1, along(from, to) / GRENADE.range);
    const time = GRENADE.flight[0] + (GRENADE.flight[1] - GRENADE.flight[0]) * share;
    const ball = new THREE.Group();
    const iron = new THREE.Mesh(this.round, new THREE.MeshLambertMaterial({ color: BALL.colour }));
    iron.scale.setScalar(BALL.radius);
    iron.castShadow = true;
    const spark = new THREE.Mesh(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicMaterial({
      color: BALL.spark, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    spark.name = 'mecha';
    ball.add(iron, spark);
    ball.visible = false;
    this.group.add(ball);
    this.flying.push({
      to, wait: Math.min(wait, time * 0.5), t: 0, time, arc: GRENADE.arc * (0.35 + 0.65 * share) * UPRIGHT,
      from: ground(from.x, from.y, GRENADE.hand * UPRIGHT), hand, ball,
    });
  }

  /** One thrown and gone off at a spot out of sight, all at once, for its materials to be compiled before play. */
  warm(at: Vec): void {
    this.lob(at, at);
    for (const g of this.flying) g.ball.visible = true;
    this.burst(at);
  }

  update(dt: number): void {
    for (const g of this.flying) {
      if (g.wait > 0) {
        g.wait -= dt;
        g.time -= dt;
        if (g.wait > 0) continue;
        // It leaves his hand from wherever his hand is.
        g.from = g.hand() ?? g.from;
        g.ball.visible = true;
      }
      g.t += dt;
      const p = Math.min(1, g.t / Math.max(0.05, g.time));
      const end = ground(g.to.x, g.to.y, BALL.radius);
      const at = g.from.clone().lerp(end, p);
      at.y += g.arc * Math.sin(Math.PI * p);
      g.ball.position.copy(at);
      g.ball.rotation.set(g.t * 9, g.t * 5, 0);
      // The fuse sputters, turned to the camera, a little above the ball.
      const spark = g.ball.getObjectByName('mecha')!;
      spark.position.set(0, BALL.radius * 1.2, 0);
      spark.quaternion.copy(g.ball.quaternion.clone().invert().multiply(this.camera.quaternion));
      spark.scale.setScalar(BALL.sparkSize * (0.6 + Math.random() * 0.8));
      if (p >= 1) this.burst(g.to);
    }
    for (const g of this.flying.filter(f => f.wait <= 0 && f.t >= f.time)) {
      retire(this.group, [g.ball]);
    }
    this.flying = this.flying.filter(f => f.wait > 0 || f.t < f.time);

    for (const b of this.blasts) {
      b.t += dt;
      const k = Math.max(0, 1 - b.t / FLASH.life);
      if (b === this.blasts[this.blasts.length - 1]) this.flash.intensity = FLASH.light * k * k * 1000;
      // The fireball swells fast and then thins out where it stands.
      const s = Math.min(1, b.t / FIREBALL.grow), fade = Math.max(0, 1 - b.t / FIREBALL.life);
      const size = GRENADE.radius * FIREBALL.size * (1 - (1 - s) * (1 - s));
      b.ball.scale.setScalar(Math.max(1, size * 0.7));
      b.outer.scale.setScalar(Math.max(1, size));
      (b.ball.material as THREE.MeshBasicMaterial).opacity = fade;
      (b.outer.material as THREE.MeshBasicMaterial).opacity = fade * 0.7;
      const r = Math.min(1, b.t / RING.life);
      b.ring.scale.setScalar(GRENADE.radius * (1 - (1 - r) * (1 - r)));
      (b.ring.material as THREE.LineBasicMaterial).opacity = 1 - r;
    }
    for (const b of this.blasts.filter(x => x.t >= Math.max(FLASH.life, FIREBALL.life, RING.life))) {
      retire(this.group, [b.ball, b.outer]);
      retire(this.group, [b.ring], true);
    }
    this.blasts = this.blasts.filter(b => b.t < Math.max(FLASH.life, FIREBALL.life, RING.life));
    if (!this.blasts.length) this.flash.intensity = 0;

    for (const fire of this.fires) this.burn(fire, dt);
    for (const fire of this.fires.filter(f => f.t >= GRENADE.burns + FIRE.fadeOut)) {
      retire(this.group, fire.tongues.map(t => t.mesh));
      retire(this.group, [fire.scorch], true);
    }
    this.fires = this.fires.filter(f => f.t < GRENADE.burns + FIRE.fadeOut);
    if (!this.fires.length) this.fireLight.intensity = 0;

    for (const bit of this.bits) {
      bit.t += dt;
      const s = bit.t / bit.life;
      bit.mesh.position.addScaledVector(bit.v, dt);
      if (bit.fall) {
        // Earth flies up and comes down again, and stays where it falls.
        bit.v.y -= bit.fall * dt;
        if (bit.mesh.position.y < 1) {
          bit.mesh.position.y = 1;
          bit.v.set(0, 0, 0);
        }
      } else {
        bit.v.multiplyScalar(Math.max(0, 1 - dt * 3));
      }
      bit.mesh.scale.setScalar(bit.grow[0] + (bit.grow[1] - bit.grow[0]) * (1 - (1 - s) * (1 - s)));
      (bit.mesh.material as THREE.MeshBasicMaterial).opacity = bit.fade * (1 - s);
    }
    for (const bit of this.bits.filter(b => b.t >= b.life)) {
      retire(this.group, [bit.mesh]);
    }
    this.bits = this.bits.filter(b => b.t < b.life);
  }

  /** It goes off on a spot of the 2D ground, and leaves the ground there burning. */
  private burst(to: Vec): void {
    const at = ground(to.x, to.y);
    this.flash.position.copy(at).setY(at.y + 14);
    const glow = (colour: string) => {
      const mesh = new THREE.Mesh(this.round, new THREE.MeshBasicMaterial({
        color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      mesh.position.copy(at).setY(GRENADE.radius * 0.25);
      return mesh;
    };
    const points = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    });
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: RING.colour, transparent: true, depthWrite: false }));
    ring.position.copy(at).setY(LIFT);
    ring.frustumCulled = false;
    const blast = { ball: glow(FIREBALL.colour), outer: glow(FIREBALL.outer), ring, t: 0 };
    this.group.add(blast.ball, blast.outer, ring);
    this.blasts.push(blast);

    for (let i = 0; i < SMOKE.puffs; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * GRENADE.radius * 0.5;
      const v = new THREE.Vector3(Math.cos(a) * 30, SMOKE.rise * (0.5 + Math.random()), Math.sin(a) * 30);
      this.bit(this.rough, SMOKE.colour, at.clone().add(new THREE.Vector3(Math.cos(a) * r, 4 + Math.random() * 8, Math.sin(a) * r)),
        v, SMOKE.life * (0.7 + Math.random() * 0.6), [4, 13 + Math.random() * 8], 0.8, false);
    }
    for (let i = 0; i < CLODS.count; i++) {
      const a = Math.random() * Math.PI * 2, speed = CLODS.speed * (0.4 + Math.random() * 0.8);
      const v = new THREE.Vector3(Math.cos(a) * speed, CLODS.up * (0.5 + Math.random() * 0.7), Math.sin(a) * speed);
      const size = 1.5 + Math.random() * 1.8;
      this.bit(this.clod, CLODS.colour, at.clone().setY(3), v, CLODS.life * (0.8 + Math.random() * 0.5), [size, size], 1, true);
    }
    this.kindle(at);
    this.landed(to);
  }

  private bit(shape: THREE.BufferGeometry, colour: string, at: THREE.Vector3, v: THREE.Vector3, life: number, grow: [number, number], fade: number, falls: boolean): void {
    const mesh = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthWrite: false }));
    mesh.position.copy(at);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    this.group.add(mesh);
    this.bits.push({ mesh, t: 0, life, v, grow, fall: falls ? CLODS.fall : undefined, fade });
  }

  /** The patch left burning: ground blackened, tongues of flame that flicker, a light that wavers. */
  private kindle(at: THREE.Vector3): void {
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(GRENADE.radius * 1.05, 32),
      new THREE.MeshBasicMaterial({ color: FIRE.scorch, transparent: true, opacity: 0.75, depthWrite: false }));
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.copy(at).setY(LIFT * 0.4);
    this.fireLight.position.copy(at).setY(at.y + 10);
    const tongues = Array.from({ length: FIRE.tongues }, (_, i) => {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * GRENADE.radius * 0.85;
      const mesh = new THREE.Mesh(this.tongue, new THREE.MeshBasicMaterial({
        color: FIRE.colours[i % FIRE.colours.length], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      mesh.position.copy(at).add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      // Taller in the middle of the patch, low at its edge.
      const height = FIRE.low + (FIRE.high - FIRE.low) * (1 - r / GRENADE.radius) * (0.6 + Math.random() * 0.4);
      return { mesh, height, rate: 9 + Math.random() * 8, phase: Math.random() * 10 };
    });
    this.group.add(scorch, ...tongues.map(t => t.mesh));
    this.fires.push({ at, t: 0, tongues, scorch });
  }

  private burn(fire: Burning, dt: number): void {
    fire.t += dt;
    // Up at once, burning down over the last of its time, then the black fading off the ground.
    const life = Math.min(1, fire.t / 0.15) * Math.max(0, Math.min(1, (GRENADE.burns - fire.t) / FIRE.fadeOut + 0.3));
    for (const { mesh, height, rate, phase } of fire.tongues) {
      const flicker = 0.65 + 0.35 * Math.sin(fire.t * rate + phase) * Math.sin(fire.t * rate * 0.37 + phase * 2);
      const h = height * flicker * life;
      mesh.visible = h > 0.5;
      mesh.scale.set(2.2 + h * 0.12, h, 2.2 + h * 0.12);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.min(1, life * 1.5);
    }
    if (fire === this.fires[this.fires.length - 1]) this.fireLight.intensity = FIRE.light * 1000 * life * (0.75 + Math.random() * 0.35);
    const gone = Math.max(0, fire.t - GRENADE.burns) / FIRE.fadeOut;
    (fire.scorch.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - gone);
    if (fire.t < GRENADE.burns && Math.random() < dt * FIRE.embers) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * GRENADE.radius;
      const from = fire.at.clone().add(new THREE.Vector3(Math.cos(a) * r, 4, Math.sin(a) * r));
      this.bit(this.clod, FIRE.emberColour, from, new THREE.Vector3((Math.random() - 0.5) * 10, 30 + Math.random() * 25, (Math.random() - 0.5) * 10),
        0.8 + Math.random() * 0.6, [1.2, 0.6], 1, false);
    }
  }
}
