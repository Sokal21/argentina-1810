import * as THREE from 'three';

/**
 * A musket (or anything long held, a flag) let go of as he falls, as a stick of two ends (butt and muzzle) held their length apart:
 * kept in his hands a moment as he starts to fall, then let go going the way his hands went, pulled
 * down (world units a second squared: a man is 78 tall), each end bouncing off the ground on its own,
 * so it tips and clatters over before it lies still.
 * `hold`: seconds before it leaves his hands; `bounce`: share of its speed an end keeps off the ground;
 * `rub`: share of its speed along the ground an end keeps at each touch; `rest`: under this speed
 * (units a second) on the ground it lies still; `lies`: how far over the ground its ends lie;
 * `length`: from butt to muzzle, in the musket's own units (props.py).
 */
const DROP = { hold: 0.18, fall: 420, bounce: 0.45, rub: 0.6, rest: 4, lies: 1.5, steps: 4, length: 0.62 };

interface Stick {
  gun: THREE.Object3D;
  /** Where it was held, to put it back; and what he stands in, where it falls. */
  held: THREE.Object3D;
  at: THREE.Matrix4;
  field: THREE.Object3D;
  /** How long it is, in its own units: from where it is held to its far end along its +X. */
  long: number;
  /** Its ends now and a step ago, in the field's space. */
  ends: [THREE.Vector3, THREE.Vector3];
  was: [THREE.Vector3, THREE.Vector3];
  length: number;
  scale: THREE.Vector3;
  /** Its top, kept as it turns. */
  up: THREE.Vector3;
  /** Seconds since he began to fall; it is out of his hands once past `hold`. */
  t: number;
  lying: boolean;
}

/**
 * What one figure holds, let fall from his hands and put back in them: his musket, or a spotter's two
 * flags, each falling on its own; in the game and in the gallery alike.
 */
export class Fling {
  private sticks: Stick[] = [];

  /** `floor` is how high the ground stands under a spot of the field. */
  constructor(private readonly floor: (at: THREE.Vector3) => number) {}

  /** What has been let go of, once out of his hands. */
  get guns(): THREE.Object3D[] {
    return this.sticks.filter(s => s.gun.parent === s.field).map(s => s.gun);
  }

  /** He begins to fall: what he holds by that name (`long` in its own units) is let go of in a moment. */
  throw(body: THREE.Object3D, name = 'mosquete_mano', long = DROP.length): void {
    const gun = body.getObjectByName(name), field = body.parent;
    if (!gun?.parent || !field || this.sticks.some(s => s.gun === gun)) return;
    const ends = endsOf(gun, field, long);
    this.sticks.push({
      gun, held: gun.parent, at: gun.matrix.clone(), field, long, ends, was: [ends[0].clone(), ends[1].clone()],
      length: ends[0].distanceTo(ends[1]), scale: new THREE.Vector3(), up: new THREE.Vector3(), t: 0, lying: false,
    });
  }

  update(dt: number): void {
    for (const s of this.sticks) this.fall(s, dt);
  }

  private fall(s: Stick, dt: number): void {
    if (s.lying || dt <= 0) return;
    s.t += dt;
    if (s.t < DROP.hold) {
      // Still in his hands: its ends followed, so it leaves them going as they went.
      s.was = s.ends;
      s.ends = endsOf(s.gun, s.field, s.long);
      return;
    }
    if (s.gun.parent !== s.field) this.free(s, dt);
    const h = dt / DROP.steps;
    for (let i = 0; i < DROP.steps; i++) this.step(s, h);
    this.place(s);
  }

  /** Back in his hands, as he is up again (or taken off the field, it with him). */
  back(): void {
    for (const s of this.sticks) {
      s.held.add(s.gun);
      s.at.decompose(s.gun.position, s.gun.quaternion, s.gun.scale);
    }
    this.sticks = [];
  }

  /** Out of his hands into the field, going as his hands went over the last frame. */
  private free(s: Stick, dt: number): void {
    const ends = endsOf(s.gun, s.field, s.long);
    // The last frame's way, as a step's: what an end went in `dt`, over the steps `dt` is now taken in.
    const h = dt / DROP.steps;
    s.was = [0, 1].map(i => ends[i].clone().sub(ends[i].clone().sub(s.ends[i]).multiplyScalar(h / dt))) as Stick['was'];
    s.ends = ends;
    s.length = ends[0].distanceTo(ends[1]);
    s.field.attach(s.gun);
    const q = new THREE.Quaternion();
    s.gun.matrix.decompose(new THREE.Vector3(), q, s.scale);
    s.up.set(0, 0, 1).applyQuaternion(q);
  }

  /** One step: each end goes on as it went, pulled down; held their length apart; bounced off the ground. */
  private step(s: Stick, h: number): void {
    for (let i = 0; i < 2; i++) {
      const p = s.ends[i], went = p.clone().sub(s.was[i]);
      s.was[i].copy(p);
      p.add(went).y -= DROP.fall * h * h;
    }
    const [a, b] = s.ends, apart = b.clone().sub(a), off = (apart.length() - s.length) / 2;
    apart.normalize().multiplyScalar(off);
    a.add(apart);
    b.sub(apart);
    let still = true;
    for (let i = 0; i < 2; i++) {
      const p = s.ends[i], w = s.was[i], floor = this.floor(p) + DROP.lies;
      if (p.y < floor) {
        const down = p.y - w.y;
        p.y = floor;
        w.y = floor + down * DROP.bounce;
        w.x = p.x - (p.x - w.x) * DROP.rub;
        w.z = p.z - (p.z - w.z) * DROP.rub;
      }
      if (p.y > floor + 0.5 || p.distanceTo(w) / h > DROP.rest) still = false;
    }
    if (still) s.lying = true;
  }

  /** The musket laid along its ends, its top kept as near as it was. */
  private place(s: Stick): void {
    const [a, b] = s.ends, x = b.clone().sub(a).normalize();
    const z = s.up.clone().addScaledVector(x, -s.up.dot(x));
    if (z.lengthSq() < 1e-6) z.set(0, 1, 0).addScaledVector(x, -x.y);
    z.normalize();
    s.up.copy(z);
    const turn = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, z.clone().cross(x), z));
    s.gun.position.copy(a);
    s.gun.quaternion.copy(turn);
    s.gun.scale.copy(s.scale);
  }
}

/** A musket's butt and muzzle (or a flag's foot and tip, `long` apart in its own units), in `field`'s space. */
function endsOf(gun: THREE.Object3D, field: THREE.Object3D, long: number): [THREE.Vector3, THREE.Vector3] {
  gun.updateWorldMatrix(true, false);
  field.updateWorldMatrix(true, false);
  const toField = field.matrixWorld.clone().invert().multiply(gun.matrixWorld);
  return [new THREE.Vector3(0, 0, 0).applyMatrix4(toField), new THREE.Vector3(long, 0, 0).applyMatrix4(toField)];
}
