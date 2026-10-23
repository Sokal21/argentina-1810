import * as THREE from 'three';

// Dust kicked up off the ground: soft puffs of earth that rise a little, swell and fade, and specks of
// grit flung up that fall back. Raised where a man's boots tear at the ground (the captain sliding in
// on his lunge, from under each boot); and a cloud thrown up as he pushes off, that swells big at once
// and is gone as quickly. Both are kept, a fixed number of each, hidden until wanted: a material made and
// thrown away each time has its shader built anew, a stutter.

/** Puffs: how many are kept, how long one lasts, how big it is born and grows, how fast it rises and drifts, its colours. */
const PUFF = { kept: 72, life: [0.6, 1.1], from: 3.5, to: 11, rise: [10, 26], drift: 24, colours: ['#a08c64', '#8c7a56', '#b4a07a'], opacity: 0.7 };
/** The cloud as he pushes off: how many puffs, how long it lasts, how big each is born and grows, how far out and up they go. */
const CLOUD = { puffs: 16, life: [0.6, 0.85], from: 8, to: 38, out: [40, 90], rise: [15, 40] };
/** Specks: how many are kept, how long one flies, how fast it is flung out and up, how hard it falls, its size and colours. */
const SPECK = { kept: 96, life: [0.35, 0.65], out: [30, 90], up: [50, 130], fall: 420, size: 1.3, colours: ['#6e5c3e', '#56462e', '#857150'] };

interface Bit { mesh: THREE.Mesh; t: number; life: number; way: THREE.Vector3; floor: number; from: number; to: number }

export class Dust {
  readonly group = new THREE.Group();
  private readonly puffs: Bit[] = [];
  /** The clouds' own puffs: in with the boots' they were taken for those within a few frames. */
  private readonly clouds: Bit[] = [];
  private nextCloud = 0;
  private readonly specks: Bit[] = [];
  private nextPuff = 0;
  private nextSpeck = 0;

  constructor() {
    const puffShape = new THREE.IcosahedronGeometry(1, 0), speckShape = new THREE.BoxGeometry(1, 1, 1);
    const make = (into: Bit[], kept: number, shape: THREE.BufferGeometry, colours: string[], transparent: boolean) => {
      for (let i = 0; i < kept; i++) {
        const mesh = new THREE.Mesh(shape, new THREE.MeshLambertMaterial({ color: colours[i % colours.length], transparent, depthWrite: !transparent }));
        mesh.visible = false;
        this.group.add(mesh);
        into.push({ mesh, t: 0, life: 0, way: new THREE.Vector3(), floor: 0, from: 0, to: 0 });
      }
    };
    make(this.puffs, PUFF.kept, puffShape, PUFF.colours, true);
    make(this.clouds, CLOUD.puffs * 2, puffShape, PUFF.colours, true);
    make(this.specks, SPECK.kept, speckShape, SPECK.colours, false);
  }

  /** Kicks up dust at a spot of the 3D ground (on it), thrown along `away` (level), as much as `much` (1 a step's worth). */
  kick(at: THREE.Vector3, away: THREE.Vector3, much = 1): void {
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    const side = new THREE.Vector3(-away.z, 0, away.x);
    for (let i = 0; i < Math.round(3 * much); i++) {
      const p = this.puffs[this.nextPuff++ % this.puffs.length];
      p.t = 0;
      p.life = r(PUFF.life);
      p.floor = at.y;
      p.from = PUFF.from;
      p.to = PUFF.to;
      p.mesh.position.copy(at).addScaledVector(side, (Math.random() - 0.5) * 8);
      p.way.copy(away).multiplyScalar(PUFF.drift * Math.random()).addScaledVector(side, (Math.random() - 0.5) * PUFF.drift).setY(r(PUFF.rise));
      p.mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      p.mesh.visible = true;
    }
    for (let i = 0; i < Math.round(4 * much); i++) {
      const s = this.specks[this.nextSpeck++ % this.specks.length];
      s.t = 0;
      s.life = r(SPECK.life);
      s.floor = at.y;
      s.mesh.position.copy(at).addScaledVector(side, (Math.random() - 0.5) * 6);
      s.way.copy(away).multiplyScalar(r(SPECK.out)).addScaledVector(side, (Math.random() - 0.5) * 40).setY(r(SPECK.up));
      s.mesh.scale.setScalar(SPECK.size * (0.6 + Math.random() * 0.8));
      s.mesh.visible = true;
    }
  }

  /** Throws up a cloud at a spot of the 3D ground: big at once, out all round and up, gone as quickly. */
  cloud(at: THREE.Vector3): void {
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    for (let i = 0; i < CLOUD.puffs; i++) {
      const p = this.clouds[this.nextCloud++ % this.clouds.length], a = (i / CLOUD.puffs) * Math.PI * 2 + Math.random() * 0.5;
      p.t = 0;
      p.life = r(CLOUD.life);
      p.floor = at.y;
      p.from = CLOUD.from;
      p.to = CLOUD.to;
      p.mesh.position.copy(at).add(new THREE.Vector3(Math.cos(a) * 4, 2, Math.sin(a) * 4));
      p.way.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(r(CLOUD.out)).setY(r(CLOUD.rise));
      p.mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      p.mesh.visible = true;
    }
  }

  update(dt: number): void {
    for (const p of [...this.puffs, ...this.clouds]) {
      if (!p.mesh.visible) continue;
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.mesh.visible = false; continue; }
      p.mesh.position.addScaledVector(p.way, dt);
      p.way.multiplyScalar(1 - Math.min(1, dt * 3));
      p.mesh.scale.setScalar(p.from + (p.to - p.from) * (1 - (1 - k) * (1 - k)));
      (p.mesh.material as THREE.MeshLambertMaterial).opacity = PUFF.opacity * (1 - k) * (1 - k);
    }
    for (const s of this.specks) {
      if (!s.mesh.visible) continue;
      s.t += dt;
      s.way.y -= SPECK.fall * dt;
      s.mesh.position.addScaledVector(s.way, dt);
      s.mesh.rotation.x += dt * 9;
      if (s.t >= s.life || s.mesh.position.y < s.floor) s.mesh.visible = false;
    }
  }
}
