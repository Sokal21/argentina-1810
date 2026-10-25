import * as THREE from 'three';
import { glow } from './realista';
import { ISO_Y } from '../machi/data';
import { ground, UPRIGHT } from './space';

// Inti's lights in 3D, as the 2D game reckons them: the orbs of her basic spell in flight, and the orbs
// her kills leave lying on the ground for her to gather. Each a bright heart in a halo of her cyan, a
// pool of its light on the ground under it, and (the nearest few) a real light on what is about it:
// the grass, the trees, her. An orb in flight leaves a trail of motes, and bursts where it ends.
// The lights are made once, a few of each, and only lent out: each light added to the scene rebuilds
// every shader, a stutter mid-fight.

const CYAN = new THREE.Color('#46e6fa'), HEART = new THREE.Color('#e8ffff');
/** In flight: the heart's and halo's sizes, the pool under it, its light, its trail. */
const FLYING = { heart: 7, halo: 26, pool: 110, poolBright: 0.55, light: 500, reach: 300, motes: 90, moteLife: 0.45, moteSize: 3, swirl: 10 };
/**
 * Gathering at her branch tip while she winds up (it popped out whole at the release: the user wanted
 * it to form): it grows from nothing to its full size, its light rising with it, and motes are drawn
 * in to it from about it, more and more.
 */
const FORMING = { from: 22, motes: 70, moteLife: 0.3, light: 0.6 };
/** Once loosed it is at full size; over this long its halo flares a little and settles. */
const FLARE = { time: 0.12, more: 0.35 };
/** Where it ends: how long its flash lasts, how big it grows, how many sparks fly and how fast. */
const BURST = { life: 0.28, size: 36, sparks: 10, speed: 70, sparkLife: 0.4 };
/** On the ground: sizes, how much higher than the 2D game's 12 it floats (seen from above it lay flat), its light. */
const SOUL = { heart: 6, halo: 20, pool: 90, poolBright: 0.5, higher: 1.6, light: 70, reach: 170 };
/**
 * The light on the ground, soft: falling away from its heart with no edge (with the glow's picture, bright
 * to a quarter of the way out, it lay on the ground as a hard round patch).
 */
let softened: THREE.Texture | null = null;
function soft(): THREE.Texture {
  if (softened) return softened;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, light = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    light.addColorStop(k, `rgba(255,255,255,${Math.exp(-k * k * 5) * (1 - k)})`);
  }
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  return softened = new THREE.CanvasTexture(canvas);
}
/**
 * How the light falls off (three's lights fall off as the world does: an orb in flight is over 100 up,
 * and at 14 with a reach of 150 it hardly reached the ground). How many real lights each has, lent to
 * the nearest.
 */
const DECAY = 1.2;
const LIGHTS = { flying: 3, souls: 3 };

export interface Flying { id: number; x: number; y: number; z: number }
export interface Soul { x: number; y: number; up: number; alpha: number; scale: number }

interface Shown { heart: THREE.Sprite; halo: THREE.Sprite; pool: THREE.Mesh }
interface Mote { sprite: THREE.Sprite; t: number; life: number; v: THREE.Vector3 }

export class Orbs {
  readonly group = new THREE.Group();
  private readonly poolShape = new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2);
  private readonly flyingLights: THREE.PointLight[] = [];
  private readonly soulLights: THREE.PointLight[] = [];
  private readonly flying = new Map<number, Shown & { at: THREE.Vector3; age: number }>();
  /** The orb gathering at her branch tip, while there is one. */
  private gathering: Shown | null = null;
  private souls: Shown[] = [];
  private motes: Mote[] = [];
  private bursts: { flash: THREE.Sprite; t: number }[] = [];
  private time = 0;

  constructor() {
    for (let i = 0; i < LIGHTS.flying; i++) this.flyingLights.push(this.light(FLYING.reach));
    for (let i = 0; i < LIGHTS.souls; i++) this.soulLights.push(this.light(SOUL.reach));
  }

  private light(reach: number): THREE.PointLight {
    const light = new THREE.PointLight(CYAN, 0, reach, DECAY);
    light.castShadow = false;
    this.group.add(light);
    return light;
  }

  private make(heart: number, halo: number, pool: number): Shown {
    const shown: Shown = {
      // Lights, not things: none writes depth (a solid heart took a dark outline from the pixel pass's
      // edges), and none is toned down with the scene.
      heart: new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: HEART, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
      halo: new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
      pool: new THREE.Mesh(this.poolShape, new THREE.MeshBasicMaterial({ map: soft(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
    };
    shown.heart.scale.setScalar(heart);
    shown.halo.scale.setScalar(halo);
    shown.pool.scale.setScalar(pool);
    this.group.add(shown.heart, shown.halo, shown.pool);
    return shown;
  }

  private drop(shown: Shown): void {
    this.group.remove(shown.heart, shown.halo, shown.pool);
    shown.heart.material.dispose();
    shown.halo.material.dispose();
    (shown.pool.material as THREE.Material).dispose();
  }

  private place(shown: Shown, x: number, y: number, height: number, bright: number, poolBright: number): THREE.Vector3 {
    const at = ground(x, y, height), under = ground(x, y, 0.6);
    shown.heart.position.copy(at);
    shown.heart.material.opacity = bright;
    shown.halo.position.copy(at);
    shown.halo.material.opacity = bright;
    shown.pool.position.copy(under);
    // The higher it is, the wider and fainter its pool.
    (shown.pool.material as THREE.MeshBasicMaterial).opacity = poolBright * bright;
    return at;
  }

  /** A spark off an orb: rising or flung, fading. */
  private mote(at: THREE.Vector3, v: THREE.Vector3, life: number, size: number): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sprite.position.copy(at);
    sprite.scale.setScalar(size);
    this.group.add(sprite);
    this.motes.push({ sprite, t: 0, life, v });
  }

  /** Every orb as the 2D game has it this step; `near` is where she stands, to lend the lights to those nearest. */
  update(dt: number, flying: readonly Flying[], souls: readonly Soul[], near: THREE.Vector3, forming: { at: THREE.Vector3; share: number } | null = null): void {
    this.time += dt;
    // Gathering at her branch tip: growing, motes drawn in to it.
    if (forming && !this.gathering) this.gathering = this.make(0, 0, FLYING.pool);
    if (!forming && this.gathering) { this.drop(this.gathering); this.gathering = null; }
    if (forming && this.gathering) {
      const k = forming.share, grown = k * k;
      this.gathering.heart.position.copy(forming.at);
      this.gathering.halo.position.copy(forming.at);
      this.gathering.heart.scale.setScalar(FLYING.heart * grown);
      this.gathering.halo.scale.setScalar(FLYING.halo * grown);
      this.gathering.heart.material.opacity = this.gathering.halo.material.opacity = 0.4 + 0.6 * k;
      this.gathering.pool.position.copy(ground(forming.at.x, forming.at.z * ISO_Y, 0.6));
      (this.gathering.pool.material as THREE.MeshBasicMaterial).opacity = FLYING.poolBright * grown;
      if (Math.random() < dt * FORMING.motes * (0.3 + k)) {
        const from = new THREE.Vector3().randomDirection().multiplyScalar(FORMING.from * (0.6 + Math.random() * 0.4));
        this.mote(forming.at.clone().add(from), from.clone().multiplyScalar(-1 / FORMING.moteLife), FORMING.moteLife, 2 + Math.random() * 2);
      }
    }
    // In flight: made as they leave, moved, trailing motes; burst as they end.
    const seen = new Set<number>();
    for (const f of flying) {
      seen.add(f.id);
      let shown = this.flying.get(f.id);
      if (!shown) this.flying.set(f.id, shown = { ...this.make(FLYING.heart, FLYING.halo, FLYING.pool), at: new THREE.Vector3(), age: 0 });
      shown.age += dt;
      const flicker = 0.85 + 0.15 * Math.sin(this.time * 40 + f.id);
      shown.at.copy(this.place(shown, f.x, f.y, f.z * UPRIGHT, flicker, FLYING.poolBright));
      // Just loosed, its halo flares and settles.
      const flare = Math.max(0, 1 - shown.age / FLARE.time);
      shown.halo.scale.setScalar(FLYING.halo * (1 + FLARE.more * flare));
      // Motes shed off it, swirling a little as they drift and fade.
      const motes = Math.floor(dt * FLYING.motes) + (Math.random() < (dt * FLYING.motes) % 1 ? 1 : 0);
      for (let i = 0; i < motes; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 3;
        const at = shown.at.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
        this.mote(at, new THREE.Vector3(Math.cos(a) * FLYING.swirl, 4 + Math.random() * 10, Math.sin(a) * FLYING.swirl), FLYING.moteLife * (0.6 + Math.random() * 0.6), FLYING.moteSize * (0.5 + Math.random()));
      }
    }
    for (const [id, shown] of this.flying) {
      if (seen.has(id)) continue;
      this.burst(shown.at);
      this.drop(shown);
      this.flying.delete(id);
    }
    // On the ground: as many as there are, each bobbing and blinking as the 2D game has it.
    while (this.souls.length < souls.length) this.souls.push(this.make(SOUL.heart, SOUL.halo, SOUL.pool));
    while (this.souls.length > souls.length) this.drop(this.souls.pop()!);
    souls.forEach((s, i) => {
      const shown = this.souls[i];
      this.place(shown, s.x, s.y, s.up * SOUL.higher * UPRIGHT, s.alpha, SOUL.poolBright);
      shown.heart.scale.setScalar(SOUL.heart * s.scale);
      shown.halo.scale.setScalar(SOUL.halo * s.scale);
    });
    // The real lights, to the nearest of each.
    const lend = (lights: THREE.PointLight[], spots: { at: THREE.Vector3; bright: number }[], strength: number) => {
      spots.sort((a, b) => a.at.distanceToSquared(near) - b.at.distanceToSquared(near));
      lights.forEach((light, i) => {
        const spot = spots[i];
        light.intensity = spot ? strength * spot.bright : 0;
        if (spot) light.position.copy(spot.at);
      });
    };
    lend(this.flyingLights, [...[...this.flying.values()].map(s => ({ at: s.at, bright: 1 })),
      ...(forming ? [{ at: forming.at, bright: FORMING.light * forming.share * forming.share }] : [])], FLYING.light);
    lend(this.soulLights, this.souls.map(s => ({ at: s.heart.position, bright: (s.halo.material.opacity) })), SOUL.light);
    // Bursts and motes, fading.
    for (const b of this.bursts) {
      b.t += dt;
      const k = Math.min(1, b.t / BURST.life);
      b.flash.scale.setScalar(BURST.size * (0.4 + 0.6 * k));
      b.flash.material.opacity = 1 - k;
    }
    for (const b of this.bursts.filter(b => b.t >= BURST.life)) {
      this.group.remove(b.flash);
      b.flash.material.dispose();
    }
    this.bursts = this.bursts.filter(b => b.t < BURST.life);
    for (const m of this.motes) {
      m.t += dt;
      m.sprite.position.addScaledVector(m.v, dt);
      m.sprite.material.opacity = Math.max(0, 1 - m.t / m.life);
    }
    for (const m of this.motes.filter(m => m.t >= m.life)) {
      this.group.remove(m.sprite);
      m.sprite.material.dispose();
    }
    this.motes = this.motes.filter(m => m.t < m.life);
  }

  /** An orb ends: a flash, and sparks flung out. */
  private burst(at: THREE.Vector3): void {
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: HEART, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flash.position.copy(at);
    this.group.add(flash);
    this.bursts.push({ flash, t: 0 });
    for (let i = 0; i < BURST.sparks; i++) {
      const a = Math.random() * Math.PI * 2, up = Math.random() * 0.8;
      this.mote(at, new THREE.Vector3(Math.cos(a), up, Math.sin(a)).multiplyScalar(BURST.speed * (0.5 + Math.random() * 0.5)), BURST.sparkLife, 3);
    }
  }
}
