import * as THREE from 'three';
import { soft } from './orbs';
import { glow } from './realista';
import { UPRIGHT } from './space';

// Inti's healing in 3D, while she stands rooted in it and as it ends (the 2D game's green motes, faint
// over the 3D world): a ring of green light opening on the ground about her, motes of it rising round
// her in a slow spiral, a soft column of it over her and a real light growing on her and the ground;
// when it is done, a flash, a ring thrown out and the motes flung up. One light, made once.

const GREEN = new THREE.Color('#7be36a'), PALE = new THREE.Color('#d8ffc8');
/** While she heals: the pool's widest, the column's size, the motes (how many a second, how far round, how high, how long), the light. */
const RITUAL = { pool: 130, column: [40, 110 * UPRIGHT], motes: 120, round: 22, high: 95 * UPRIGHT, moteLife: 0.9, light: 1600, reach: 220, over: 40 };
/** As it is done: how long, the ring's widest, how many motes flung up, the light's flare. */
const DONE = { life: 0.6, ring: 70, motes: 40, light: 3000 };

interface Mote { sprite: THREE.Sprite; t: number; life: number; a: number; r: number; spin: number; rise: number }

export class Healing3D {
  readonly group = new THREE.Group();
  private readonly light = new THREE.PointLight(GREEN, 0, RITUAL.reach, 1.2);
  private readonly pool: THREE.Mesh;
  private readonly column: THREE.Sprite;
  private readonly ring: THREE.Mesh;
  private motes: Mote[] = [];
  /** Seconds since it was done, while its flare lasts. */
  private done = Infinity;
  private time = 0;

  constructor() {
    const additive = (map: THREE.Texture | null, colour: THREE.Color) =>
      new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.light.castShadow = false;
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28).rotateX(-Math.PI / 2), additive(soft(), GREEN));
    this.column = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: GREEN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.column.center.set(0.5, 0.15);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), additive(null, PALE));
    for (const thing of [this.pool, this.column, this.ring]) thing.visible = false;
    this.group.add(this.light, this.pool, this.column, this.ring);
  }

  private mote(feet: THREE.Vector3, life: number, rise: number, r = RITUAL.round * (0.4 + Math.random() * 0.6)): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: Math.random() < 0.3 ? PALE : GREEN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sprite.scale.setScalar(4 + Math.random() * 3);
    this.group.add(sprite);
    this.motes.push({ sprite, t: 0, life, a: Math.random() * Math.PI * 2, r, spin: 1.5 + Math.random() * 1.5, rise });
    sprite.position.copy(feet);
  }

  /** Each step: `feet`, where she stands; `share`, how far into her healing (null when she is not). */
  update(dt: number, feet: THREE.Vector3, share: number | null): void {
    this.time += dt;
    const k = share ?? 0, on = share !== null;
    this.pool.visible = this.column.visible = on;
    if (on) {
      // Opening quickly, then breathing.
      const open = Math.min(1, k / 0.25), breath = 0.9 + 0.1 * Math.sin(this.time * 8);
      this.pool.position.copy(feet).y += 0.6;
      this.pool.scale.setScalar(RITUAL.pool * open * breath);
      (this.pool.material as THREE.MeshBasicMaterial).opacity = open;
      this.column.position.copy(feet);
      this.column.scale.set(RITUAL.column[0] * open, RITUAL.column[1], 1);
      this.column.material.opacity = 0.45 * open * breath;
      if (Math.random() < dt * RITUAL.motes) this.mote(feet, RITUAL.moteLife * (0.6 + Math.random() * 0.6), RITUAL.high);
    }
    // Done: a ring thrown out, the light flaring.
    this.done += dt;
    const d = this.done / DONE.life;
    this.ring.visible = d < 1;
    if (d < 1) {
      this.ring.position.copy(feet).y += 0.8;
      this.ring.scale.setScalar(DONE.ring * (0.3 + 0.7 * d));
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 1 - d;
    }
    this.light.position.copy(feet).y += RITUAL.over;
    this.light.intensity = Math.max(on ? RITUAL.light * Math.min(1, k * 1.5) : 0, d < 1 ? DONE.light * (1 - d) * (1 - d) : 0);
    // The motes spiralling up round her as she goes, thinning away.
    for (const m of this.motes) {
      m.t += dt;
      const u = m.t / m.life;
      m.a += m.spin * dt;
      m.sprite.position.set(feet.x + Math.cos(m.a) * m.r, feet.y + u * m.rise, feet.z + Math.sin(m.a) * m.r);
      m.sprite.material.opacity = Math.min(1, u * 8) * (1 - u * u);
    }
    for (const m of this.motes.filter(m => m.t >= m.life)) { this.group.remove(m.sprite); m.sprite.material.dispose(); }
    this.motes = this.motes.filter(m => m.t < m.life);
  }

  /** Her healing is done, at her feet: its flare. */
  healed(feet: THREE.Vector3): void {
    this.done = 0;
    for (let i = 0; i < DONE.motes; i++) this.mote(feet, 0.5 + Math.random() * 0.4, RITUAL.high * 1.3, RITUAL.round * (0.3 + Math.random()));
  }
}
