import * as THREE from 'three';

// Where a blow lands: a pale ring that opens out quickly and fades, always turned to the camera so
// it reads the same from every side. Any number at once, each on its own.

/** How long a ring lasts, how wide it starts and ends (world units), and how thick its band is. */
const LIFE = 0.26, FROM = 4, TO = 26, BAND = 0.32;
const COLOUR = new THREE.Color('#fff4d6');

export class Impacts {
  readonly group = new THREE.Group();
  private readonly rings: { mesh: THREE.Mesh; t: number }[] = [];
  private readonly geometry = new THREE.RingGeometry(1 - BAND, 1, 24);

  constructor(private readonly camera: THREE.Camera) {}

  /** A ring opening where a blow lands. */
  spawn(at: THREE.Vector3): void {
    const material = new THREE.MeshBasicMaterial({ color: COLOUR, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.copy(at);
    mesh.renderOrder = 20;
    this.group.add(mesh);
    this.rings.push({ mesh, t: 0 });
  }

  update(dt: number): void {
    for (const ring of this.rings) {
      ring.t += dt;
      const k = Math.min(1, ring.t / LIFE);
      // Out fast, slowing as it goes; fading over the second half.
      const eased = 1 - (1 - k) * (1 - k);
      ring.mesh.scale.setScalar(FROM + (TO - FROM) * eased);
      ring.mesh.quaternion.copy(this.camera.quaternion);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
    }
    for (const ring of this.rings.filter(r => r.t >= LIFE)) {
      this.group.remove(ring.mesh);
      (ring.mesh.material as THREE.Material).dispose();
    }
    this.rings.splice(0, this.rings.length, ...this.rings.filter(r => r.t < LIFE));
  }
}
