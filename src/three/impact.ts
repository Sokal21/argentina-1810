import * as THREE from 'three';

// Where a blow lands: a thin red ring that opens out quickly and fades, with a soft glow round it
// that adds light, always turned to the camera so it reads the same from every side. Any number
// at once, each on its own.

/** How long a ring lasts, how wide it starts and ends (world units), and how thick its band is. */
const LIFE = 0.24, FROM = 2, TO = 14, BAND = 0.14;
const COLOUR = new THREE.Color('#ff2a1a');
/** The glow: a wider, fainter band of light about the ring. */
const GLOW = { colour: new THREE.Color('#ff5a30'), band: 0.5, opacity: 0.45, wider: 1.15 };

export class Impacts {
  readonly group = new THREE.Group();
  private readonly rings: { mesh: THREE.Mesh; glow: THREE.Mesh; t: number }[] = [];
  private readonly geometry = new THREE.RingGeometry(1 - BAND, 1, 24);
  private readonly glowing = new THREE.RingGeometry(1 - GLOW.band, 1, 24);

  constructor(private readonly camera: THREE.Camera) {}

  /** A ring opening where a blow lands. */
  spawn(at: THREE.Vector3): void {
    const material = new THREE.MeshBasicMaterial({ color: COLOUR, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.copy(at);
    mesh.renderOrder = 21;
    const glow = new THREE.Mesh(this.glowing, new THREE.MeshBasicMaterial({
      color: GLOW.colour, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    glow.position.copy(at);
    glow.renderOrder = 20;
    this.group.add(glow, mesh);
    this.rings.push({ mesh, glow, t: 0 });
  }

  update(dt: number): void {
    for (const ring of this.rings) {
      ring.t += dt;
      const k = Math.min(1, ring.t / LIFE);
      // Out fast, slowing as it goes; fading over the second half.
      const eased = 1 - (1 - k) * (1 - k);
      const size = FROM + (TO - FROM) * eased, fade = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      ring.mesh.scale.setScalar(size);
      ring.glow.scale.setScalar(size * GLOW.wider);
      ring.mesh.quaternion.copy(this.camera.quaternion);
      ring.glow.quaternion.copy(this.camera.quaternion);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
      (ring.glow.material as THREE.MeshBasicMaterial).opacity = fade * GLOW.opacity;
    }
    for (const ring of this.rings.filter(r => r.t >= LIFE)) {
      this.group.remove(ring.mesh, ring.glow);
      (ring.mesh.material as THREE.Material).dispose();
      (ring.glow.material as THREE.Material).dispose();
    }
    this.rings.splice(0, this.rings.length, ...this.rings.filter(r => r.t < LIFE));
  }
}
