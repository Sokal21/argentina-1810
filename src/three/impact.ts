import * as THREE from 'three';
import type { Look } from './look';
import { retire } from './paint';

// Where a blow lands: a thin ring that opens out quickly and fades, with a soft glow round it that
// adds light. It is turned to face whoever struck, so it is seen in perspective from wherever the
// blow came, and hidden by what stands in front of it; or, if the look says so, turned to the
// camera. Its numbers are the look's (the panel's "Impacto"), read as each ring is drawn.

export class Impacts {
  readonly group = new THREE.Group();
  private readonly rings: { mesh: THREE.Mesh; glow: THREE.Mesh; t: number; facing: THREE.Quaternion }[] = [];

  constructor(private readonly camera: THREE.Camera, private readonly look: () => Look) {}

  /** A ring opening at `at`, facing toward `from` (whoever struck). */
  spawn(at: THREE.Vector3, from: THREE.Vector3): void {
    const look = this.look();
    const ring = (band: number, colour: string, glow: boolean) => {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(1 - Math.min(0.95, band), 1, 28), new THREE.MeshBasicMaterial({
        color: colour, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      }));
      mesh.position.copy(at);
      mesh.renderOrder = glow ? 20 : 21;
      return mesh;
    };
    const glow = ring(look.impactGlowBand, look.impactGlowColour, true), mesh = ring(look.impactBand, look.impactColour, false);
    // A ring lies square to its +Z: turned so that points at whoever struck.
    const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), from.clone().sub(at).normalize());
    this.group.add(glow, mesh);
    this.rings.push({ mesh, glow, t: 0, facing });
  }

  update(dt: number): void {
    const look = this.look();
    for (const ring of this.rings) {
      ring.t += dt;
      const k = Math.min(1, ring.t / look.impactLife);
      // Out fast, slowing as it goes; fading over the second half.
      const eased = 1 - (1 - k) * (1 - k);
      const size = look.impactFrom + (look.impactTo - look.impactFrom) * eased, fade = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      const turn = look.impactFacesStriker ? ring.facing : this.camera.quaternion;
      ring.mesh.scale.setScalar(size);
      ring.glow.scale.setScalar(size * look.impactGlowWider);
      ring.mesh.quaternion.copy(turn);
      ring.glow.quaternion.copy(turn);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
      (ring.glow.material as THREE.MeshBasicMaterial).opacity = fade * look.impactGlow;
    }
    for (const ring of this.rings.filter(r => r.t >= look.impactLife)) {
      retire(this.group, [ring.mesh, ring.glow], true);
    }
    this.rings.splice(0, this.rings.length, ...this.rings.filter(r => r.t < look.impactLife));
  }
}
