import * as THREE from 'three';

// A sergeant's shout seen on the ground: rings of red flung out from his feet one after another as
// he roars, out to as far as his shout quickens his men (his `rally.reach`), thinning as they go. The
// rings are made once and kept, hidden between shouts: a material made and thrown away each time
// has its shader built anew, a stutter.

/** When into the shout each ring leaves (seconds, as his roar swells), how long it takes to reach the edge, how far over the ground it lies. */
const RINGS = { at: [0.35, 0.6, 0.85], lasts: 0.9, lift: 0.8, colour: '#ff2a1a', width: 0.07 };
/** How many shouts can be under way at once. */
const ROOM = 3;

interface Ring { mesh: THREE.Mesh; t: number; reach: number; wait: number }

export class Shouts {
  readonly group = new THREE.Group();
  private readonly rings: Ring[] = [];

  constructor() {
    const shape = new THREE.RingGeometry(1 - RINGS.width, 1, 64).rotateX(-Math.PI / 2);
    for (let i = 0; i < ROOM * RINGS.at.length; i++) {
      const mesh = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({
        color: RINGS.colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.rings.push({ mesh, t: Infinity, reach: 0, wait: 0 });
    }
  }

  /** A shout begins at a spot of the 3D ground, carrying `reach` along the 2D game's ground. */
  shout(at: THREE.Vector3, reach: number): void {
    for (const wait of RINGS.at) {
      const ring = this.rings.find(r => r.t === Infinity && r.wait <= 0) ?? this.rings[0];
      ring.mesh.position.copy(at).setY(at.y + RINGS.lift);
      // The 2D game's distances along its ground are true ones on the 3D ground: a circle.
      ring.reach = reach;
      ring.wait = wait;
      ring.t = 0;
    }
  }

  update(dt: number): void {
    for (const ring of this.rings) {
      if (ring.t === Infinity) continue;
      if (ring.wait > 0) { ring.wait -= dt; ring.mesh.visible = false; continue; }
      ring.t += dt;
      const k = Math.min(1, ring.t / RINGS.lasts), eased = 1 - (1 - k) * (1 - k);
      ring.mesh.visible = k < 1;
      ring.mesh.scale.set(ring.reach * eased, 1, ring.reach * eased);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k * k);
      if (k >= 1) ring.t = Infinity;
    }
  }
}
