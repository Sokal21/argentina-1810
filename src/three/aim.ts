import * as THREE from 'three';
import { BALL } from '../bolts';
import { MUSKET } from '../machi/musket';
import { ground } from './space';

// What the 2D game draws while the musket is up, stood in 3D: the line of the shot, from the
// barrel out as far as a ball carries, and the ring of the blast round the spot aimed at, a true
// circle on the ground (the 2D game's ellipse is that circle foreshortened). Amber when it can be
// fired, dull when it cannot.

const READY = new THREE.Color('#ffb45a'), SPENT = new THREE.Color('#8a8478');
/** How far above the ground the ring is drawn, so it lies over the ground's own pixels. */
const LIFT = 0.6;
const SEGMENTS = 48;

export class AimMarks {
  readonly group = new THREE.Group();
  private readonly line: THREE.Line;
  private readonly ring: THREE.LineLoop;

  constructor() {
    const lineMaterial = new THREE.LineBasicMaterial({ color: READY, transparent: true, opacity: 0.5, depthWrite: false });
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMaterial);
    const points = Array.from({ length: SEGMENTS }, (_, i) => {
      const a = (i / SEGMENTS) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * MUSKET.radius, 0, Math.sin(a) * MUSKET.radius);
    });
    this.ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: READY, transparent: true, opacity: 0.9, depthWrite: false }));
    this.line.frustumCulled = this.ring.frustumCulled = false;
    this.group.add(this.line, this.ring);
    this.group.visible = false;
  }

  /**
   * Shown while aiming: from the muzzle (in 3D), toward the spot aimed at on the 2D ground.
   * The line runs level from the muzzle as far as a ball carries; the ring lies round the spot.
   */
  show(muzzle: THREE.Vector3 | null, at: { x: number; y: number } | null, ready = true): void {
    this.group.visible = !!(muzzle && at);
    if (!muzzle || !at) return;
    const spot = ground(at.x, at.y, LIFT);
    const way = new THREE.Vector3(spot.x - muzzle.x, 0, spot.z - muzzle.z);
    if (way.lengthSq() < 1e-6) way.set(0, 0, 1);
    way.normalize();
    // The ball's reach is along the ground as it truly is, which the 3D ground is.
    const end = muzzle.clone().addScaledVector(way, BALL.range);
    const positions = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, muzzle.x, muzzle.y, muzzle.z);
    positions.setXYZ(1, end.x, muzzle.y, end.z);
    positions.needsUpdate = true;
    this.ring.position.copy(spot);
    const colour = ready ? READY : SPENT;
    (this.line.material as THREE.LineBasicMaterial).color.copy(colour);
    (this.ring.material as THREE.LineBasicMaterial).color.copy(colour);
  }
}
