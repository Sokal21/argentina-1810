import * as THREE from 'three';

/**
 * A musket held in both hands flung from them as he falls: thrown up and out to one side, a little
 * ahead (world units a second; thrown back it fell under him, who falls back), turning over as it
 * flies, pulled down so hard, and left lying on the ground where it lands.
 */
const FLING = { ahead: 15, side: 65, up: 150, spin: 10, fall: 420, lies: 1 };

/** One figure's musket, flung from his hands and put back in them; in the game and in the gallery alike. */
export class Fling {
  private flung: { gun: THREE.Object3D; held: THREE.Object3D; at: THREE.Matrix4; way: THREE.Vector3; spin: THREE.Vector3; lying: boolean } | null = null;

  /** `floor` is how high the ground stands under a spot of the 3D world. */
  constructor(private readonly floor: (at: THREE.Vector3) => number) {}

  /** The musket, while it is out of his hands. */
  get gun(): THREE.Object3D | null {
    return this.flung?.gun ?? null;
  }

  /** His musket let go of as he falls: out of his body into whatever he stands in, thrown up and to one side. */
  throw(body: THREE.Object3D, facing: number, name = 'mosquete_mano'): void {
    const gun = body.getObjectByName(name), field = body.parent;
    if (!gun?.parent || !field || this.flung) return;
    body.updateMatrixWorld(true);
    const held = gun.parent, at = gun.matrix.clone();
    field.attach(gun);
    const ahead = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)), side = new THREE.Vector3(ahead.z, 0, -ahead.x);
    const way = ahead.multiplyScalar(FLING.ahead).addScaledVector(side, (Math.random() < 0.5 ? -1 : 1) * FLING.side * (0.8 + Math.random() * 0.4)).setY(FLING.up);
    const spin = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(FLING.spin);
    this.flung = { gun, held, at, way, spin, lying: false };
  }

  /** Flying, until it lies flat on the ground where it came down. */
  update(dt: number): void {
    const f = this.flung;
    if (!f || f.lying) return;
    f.way.y -= FLING.fall * dt;
    f.gun.position.addScaledVector(f.way, dt);
    f.gun.rotation.x += f.spin.x * dt;
    f.gun.rotation.y += f.spin.y * dt;
    f.gun.rotation.z += f.spin.z * dt;
    const floor = this.floor(f.gun.position) + FLING.lies;
    if (f.way.y < 0 && f.gun.position.y <= floor) {
      f.lying = true;
      f.gun.position.y = floor;
      // Flat on the ground, its length level, lying whichever way it fell.
      f.gun.rotation.set(0, f.gun.rotation.y, 0);
    }
  }

  /** Back in his hands, as he is up again (or taken off the field, it with him). */
  back(): void {
    const f = this.flung;
    if (!f) return;
    f.held.add(f.gun);
    f.at.decompose(f.gun.position, f.gun.quaternion, f.gun.scale);
    this.flung = null;
  }
}
