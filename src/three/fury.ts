import * as THREE from 'three';
import type { Vec } from '../machi/controller';
import { RAGE } from '../machi/rage';
import { ground, UPRIGHT } from './space';

// Cabral's rage, seen (the 2D game shows it as a burning glow on him and embers shed upward): as it
// begins, a burst (a flash that lights the ground and a ring of heat flung out from his feet); while
// it lasts, tongues of fire licking up round him and embers rising off him, a flickering light of
// fire on him and the ground, and a faint ring on the ground as far as his heat scorches. His own
// glow and the picture's are the figure's and the finishing pass's (cabral.ts, look.ts).

const FIRE = { colours: ['#ffd36a', '#ff9a30', '#ff5a1a'], tongues: 26, round: 11, high: 46 * UPRIGHT, size: 3.2, life: 0.55 };
const EMBERS = { count: 40, colour: '#ffb050', round: 14, high: 110 * UPRIGHT, size: 1.8, life: 1.4 };
const LIGHT = { colour: '#ff7a2a', strength: 1400, burst: 9000, reach: 170 };
/** The ring flung out as it begins: how far, how fast it fades; the aura's ring, how strongly drawn. */
const BURST = { reach: 150, life: 0.5 }, AURA = 0.32;

/** A loop one unit across, laid on the ground. */
function loop(): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  }));
}

export class Fury {
  readonly group = new THREE.Group();
  /** Kept in the scene always, dark when he is himself: a light come and gone rebuilds every material. */
  private readonly light = new THREE.PointLight(LIGHT.colour, 0, LIGHT.reach, 1.4);
  private readonly fire: THREE.InstancedMesh;
  private readonly embers: THREE.InstancedMesh;
  private readonly aura: THREE.LineLoop;
  private readonly burst: THREE.LineLoop;
  /** Each tongue's and ember's own way round him and its own pace. */
  private readonly seeds = new Float32Array((FIRE.tongues + EMBERS.count) * 3).map(() => Math.random());
  private bursting = BURST.life;
  private was = 0;
  private time = 0;

  constructor() {
    const additive = (colour: string) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.fire = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), additive('#ffffff'), FIRE.tongues);
    const tint = new THREE.Color();
    for (let i = 0; i < FIRE.tongues; i++) this.fire.setColorAt(i, tint.set(FIRE.colours[i % FIRE.colours.length]));
    this.embers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), additive(EMBERS.colour), EMBERS.count);
    this.aura = new THREE.LineLoop(loop(), new THREE.LineBasicMaterial({ color: LIGHT.colour, transparent: true, depthWrite: false }));
    this.burst = new THREE.LineLoop(loop(), new THREE.LineBasicMaterial({ color: '#ffd36a', transparent: true, depthWrite: false }));
    for (const o of [this.fire, this.embers, this.aura, this.burst]) o.frustumCulled = false;
    this.group.add(this.light, this.fire, this.embers, this.aura, this.burst);
  }

  /** Shows it about him, as strong as `rage` (0 when he is himself, up to 1). */
  update(dt: number, at: Vec, rage: number): void {
    this.time += dt;
    if (rage > 0 && this.was === 0) this.bursting = 0;
    this.was = rage;
    this.bursting += dt;
    const feet = ground(at.x, at.y), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const shown = rage > 0;
    this.fire.visible = this.embers.visible = this.aura.visible = shown;
    // The burst: a ring flung out from his feet and a flash, as it begins.
    const flung = Math.min(1, this.bursting / BURST.life);
    this.burst.visible = flung < 1;
    this.burst.position.copy(feet).add(new THREE.Vector3(0, 1, 0));
    this.burst.scale.setScalar(Math.max(0.01, BURST.reach * (1 - (1 - flung) * (1 - flung))));
    (this.burst.material as THREE.LineBasicMaterial).opacity = 1 - flung;
    const flicker = 0.75 + 0.25 * Math.sin(this.time * 23) * Math.sin(this.time * 7.3);
    this.light.position.copy(feet).add(new THREE.Vector3(0, 30, 0));
    this.light.intensity = LIGHT.strength * rage * flicker + LIGHT.burst * Math.max(0, 1 - flung * 2.5);
    if (!shown) return;
    // Tongues of fire, each licking up from about his feet and dying away as it rises, again and again.
    for (let i = 0; i < FIRE.tongues; i++) {
      const a = this.seeds[i * 3] * Math.PI * 2 + this.time * 0.6, pace = 0.7 + 0.6 * this.seeds[i * 3 + 1];
      const age = (this.time * pace / FIRE.life + this.seeds[i * 3 + 2]) % 1, r = FIRE.round * (0.5 + 0.5 * this.seeds[i * 3 + 1]);
      p.set(feet.x + Math.cos(a) * r, feet.y + age * FIRE.high, feet.z + Math.sin(a) * r);
      const size = FIRE.size * (1 - age) * rage;
      this.fire.setMatrixAt(i, m.compose(p, q, s.set(size, size * 1.8, size)));
    }
    this.fire.instanceMatrix.needsUpdate = true;
    // Embers rising off him, higher and slower, winking out.
    for (let i = 0; i < EMBERS.count; i++) {
      const k = (FIRE.tongues + i) * 3, a = this.seeds[k] * Math.PI * 2;
      const age = (this.time / EMBERS.life * (0.6 + 0.6 * this.seeds[k + 1]) + this.seeds[k + 2]) % 1;
      const r = EMBERS.round * this.seeds[k + 1] + age * 8;
      p.set(feet.x + Math.cos(a + age * 2) * r, feet.y + age * EMBERS.high, feet.z + Math.sin(a + age * 2) * r);
      const size = EMBERS.size * (age < 0.85 ? 1 : (1 - age) / 0.15) * rage;
      this.embers.setMatrixAt(i, m.compose(p, q, s.setScalar(size)));
    }
    this.embers.instanceMatrix.needsUpdate = true;
    // As far as his heat scorches, faintly, flickering.
    this.aura.position.copy(feet).add(new THREE.Vector3(0, 0.8, 0));
    this.aura.scale.setScalar(RAGE.aura);
    (this.aura.material as THREE.LineBasicMaterial).opacity = AURA * rage * flicker;
  }
}
