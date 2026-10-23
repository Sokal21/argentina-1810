import * as THREE from 'three';
import { ISO_Y } from '../machi/data';
import { heightAt } from './space';

// A sergeant's shout seen on the ground: rings of red flung out from his feet as he roars, out to
// as far as his shout quickens his men (his `rally.reach`). First a burst, thick and bright and quick,
// the roar's blow; then two echoes after it, thin and slower. Each is born thick and bright red and
// thins as it goes, darkening to a dull red; its edge is never round, but in peaks and dips that
// tremble as it spreads, as a sound shakes, different every shout. Laid over the ground's rise and
// fall, each corner on the ground under it (flat at his feet, a rise hid all of them but an arc).
// The rings are made once and kept, hidden between shouts: a material made and thrown away each time
// has its shader built anew, a stutter.

/**
 * The rings of a shout, each: when it leaves (seconds into the shout, as the roar swells), how long
 * it takes to reach the edge, how thick it is born and dies (shares of how far it has gone), how
 * bright it is, and how much its edge trembles (a share of its reach).
 */
const RINGS = [
  { at: 0.33, lasts: 0.34, born: 0.2, dies: 0.05, bright: 1, tremble: 0.07 },
  { at: 0.5, lasts: 0.95, born: 0.09, dies: 0.035, bright: 0.85, tremble: 0.045 },
  { at: 0.78, lasts: 1.1, born: 0.08, dies: 0.03, bright: 0.75, tremble: 0.04 },
];
/** How far over the ground they lie; their red as born and as they die. */
const LIFT = 0.8, HOT = new THREE.Color('#ff3a1a'), DULL = new THREE.Color('#a8160c');
/** How many shouts can be under way at once; each ring's corners around. */
const ROOM = 3, SEGMENTS = 72;

interface Ring {
  mesh: THREE.Mesh;
  kind: (typeof RINGS)[number];
  t: number;
  reach: number;
  wait: number;
  at: THREE.Vector3;
  first: boolean;
  /** Its edge's peaks: how many round, where they start and how fast they turn. */
  waves: { n: number; phase: number; speed: number }[];
}

export class Shouts {
  readonly group = new THREE.Group();
  private readonly rings: Ring[] = [];
  /** Felt as the first ring leaves, his roar at its loudest: whoever plays the camera shakes it. */
  felt: (at: THREE.Vector3) => void = () => {};

  constructor() {
    for (let i = 0; i < ROOM * RINGS.length; i++) {
      // Its own corners, set every frame: where its edge is, on the ground under it.
      const shape = new THREE.RingGeometry(0.9, 1, SEGMENTS, 1);
      const mesh = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({
        color: HOT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.rings.push({ mesh, kind: RINGS[0], t: Infinity, reach: 0, wait: 0, at: new THREE.Vector3(), first: false, waves: [] });
    }
  }

  /** A shout begins at a spot of the 3D ground, carrying `reach` along the 2D game's ground. */
  shout(at: THREE.Vector3, reach: number): void {
    for (const [n, kind] of RINGS.entries()) {
      const ring = this.rings.find(r => r.t === Infinity && r.wait <= 0) ?? this.rings[n];
      ring.kind = kind;
      ring.at.copy(at);
      ring.mesh.position.set(at.x, 0, at.z);
      // The 2D game's distances along its ground are true ones on the 3D ground: a circle.
      ring.reach = reach;
      ring.wait = kind.at;
      ring.first = n === 0;
      ring.t = 0;
      // Its own peaks, every shout anew.
      ring.waves = [3, 5, 9].map(k => ({ n: k + Math.floor(Math.random() * 3), phase: Math.random() * 6.28, speed: (Math.random() - 0.5) * 8 }));
    }
  }

  update(dt: number): void {
    for (const ring of this.rings) {
      if (ring.t === Infinity) continue;
      if (ring.wait > 0) { ring.wait -= dt; ring.mesh.visible = false; continue; }
      if (ring.t === 0 && ring.first) this.felt(ring.at);
      ring.t += dt;
      const { lasts, born, dies, bright, tremble } = ring.kind;
      const k = Math.min(1, ring.t / lasts), eased = 1 - (1 - k) * (1 - k) * (1 - k);
      ring.mesh.visible = k < 1;
      if (k >= 1) { ring.t = Infinity; continue; }
      const r = ring.reach * eased, thick = born + (dies - born) * k;
      // Its edge in peaks and dips that tremble, each corner on the ground under it.
      const corners = ring.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let j = 0; j <= 1; j++) {
        for (let i = 0; i <= SEGMENTS; i++) {
          const a = (i / SEGMENTS) * Math.PI * 2;
          let wave = 0;
          for (const w of ring.waves) wave += Math.sin(a * w.n + w.phase + ring.t * w.speed) / ring.waves.length;
          const out = r * (1 + tremble * wave * 1.6), radius = j === 0 ? out * (1 - thick) : out;
          const x = Math.cos(a) * radius, z = Math.sin(a) * radius, v = j * (SEGMENTS + 1) + i;
          corners.setXYZ(v, x, heightAt(ring.at.x + x, (ring.at.z + z) * ISO_Y) + LIFT, z);
        }
      }
      corners.needsUpdate = true;
      // Born bright red, darkening to a dull red as it thins; fading at the last.
      const material = ring.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(HOT).lerp(DULL, k);
      material.opacity = bright * (1 - k * k * k * k);
    }
  }
}
