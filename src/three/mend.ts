import * as THREE from 'three';
import type { Vec } from '../machi/controller';
import { ground, UPRIGHT } from './space';

// Life or mana coming back, in 3D, as the 2D game's (fx/mend.ts): for a moment a soft light stands
// round him and specks of it rise through and past him, in the colour of what was given back, and
// a faint ring widens on the ground from his feet. Here the light is a real one too, on him and the
// ground about him. It goes with him while it lasts, and nothing of it is left once over.

/** Seconds it lasts; how far round him the specks rise (world units) and how high. */
const LASTS = 1.1, ROUND = 16, HIGH = 90 * UPRIGHT;
/** How many specks; their size; the light's strength and reach; how wide the ring opens. */
const SPECKS = 60, SPECK = 3.4, LIGHT = { strength: 1800, reach: 120 }, RING = 34;

interface One { t: number; specks: THREE.InstancedMesh; ring: THREE.LineLoop; colour: THREE.Color; seeds: Float32Array }

export class Mendings {
  readonly group = new THREE.Group();
  private under: One[] = [];
  /** One light for them all, kept in the scene: a light come and gone made every material be built anew, a stutter at every draught. */
  private readonly light = new THREE.PointLight('#ffffff', 0, LIGHT.reach, 1.5);
  private readonly speck = new THREE.BoxGeometry(SPECK, SPECK, SPECK);
  private readonly loop = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  }));

  constructor() {
    this.group.add(this.light);
  }

  /** Begins it, in a colour, about whoever stands at a spot of the 2D ground. */
  begin(colour: number): void {
    const material = new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const specks = new THREE.InstancedMesh(this.speck, material, SPECKS);
    specks.frustumCulled = false;
    const ring = new THREE.LineLoop(this.loop, new THREE.LineBasicMaterial({ color: colour, transparent: true, depthWrite: false }));
    ring.frustumCulled = false;
    // Each speck: where round him it rises, how fast, and how far it goes before it thins away.
    const seeds = new Float32Array(SPECKS * 4).map(() => Math.random());
    this.group.add(specks, ring);
    this.under.push({ t: 0, specks, ring, colour: new THREE.Color(colour), seeds });
  }

  /** Moves them along, about whoever they are for. */
  update(dt: number, at: Vec): void {
    const feet = ground(at.x, at.y), m = new THREE.Matrix4(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), q = new THREE.Quaternion();
    this.light.intensity = 0;
    this.light.position.copy(feet).add(new THREE.Vector3(0, HIGH * 0.35, 0));
    for (const it of this.under) {
      it.t += dt;
      const age = Math.min(1, it.t / LASTS);
      // Up quickly, out slowly.
      const life = Math.min(1, age / 0.15) * (1 - Math.max(0, (age - 0.45) / 0.55));
      for (let i = 0; i < SPECKS; i++) {
        const a = it.seeds[i * 4] * Math.PI * 2, r = ROUND * Math.sqrt(it.seeds[i * 4 + 1]);
        const pace = 0.8 + 0.6 * it.seeds[i * 4 + 2], goes = 0.5 + 0.5 * it.seeds[i * 4 + 3];
        const up = Math.min(1, age * pace) / goes;
        // Gone once past its own height, fewer higher up, as the 2D game's thin away.
        const shown = up < 1 ? 1 - up * up : 0;
        p.set(feet.x + Math.cos(a) * r, feet.y + up * goes * HIGH, feet.z + Math.sin(a) * r);
        it.specks.setMatrixAt(i, m.compose(p, q, one.setScalar(shown * life)));
      }
      it.specks.instanceMatrix.needsUpdate = true;
      (it.specks.material as THREE.MeshBasicMaterial).opacity = life;
      it.ring.position.copy(feet).add(new THREE.Vector3(0, 0.8, 0));
      it.ring.scale.setScalar(Math.max(0.01, RING * age * 1.6));
      (it.ring.material as THREE.LineBasicMaterial).opacity = 0.5 * (1 - Math.min(1, age / 0.7));
      if (LIGHT.strength * life > this.light.intensity) {
        this.light.intensity = LIGHT.strength * life;
        this.light.color.copy(it.colour);
      }
    }
    for (const it of this.under.filter(one => one.t >= LASTS)) {
      this.group.remove(it.specks, it.ring);
      (it.specks.material as THREE.Material).dispose();
      (it.ring.material as THREE.Material).dispose();
      it.specks.dispose();
    }
    this.under = this.under.filter(one => one.t < LASTS);
  }
}
