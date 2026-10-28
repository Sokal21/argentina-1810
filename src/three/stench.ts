import * as THREE from 'three';
import { Billboards } from './billboards';

// The stench the plague-dead soldier walks in: puffs of a dull, sickly green cloud let off about
// his body, carried away behind him as by a wind at his back, swelling and thinning as they go.
// Not lit and not shining (his sores shine; this is only foul air): drawn over what is behind it,
// half seen through. The puffs are left in the world, so that walking he trails them.

/** The puffs: how many kept, how long one lasts, how far behind him it is carried a second, how much it rises, how big it starts (a share of his height) and how many times that it ends. */
const PUFF = { kept: 34, life: [1.8, 3], drift: [16, 30], rise: [4, 10], size: [0.22, 0.38], swell: 2.2 };
/** Their colours (one of them each), how thick at most, and where on him they are let off, as shares of his height. */
const CLOUD = { colours: ['#8da24a', '#7a8f3e', '#9fb35a'], thick: 0.75, from: [0.3, 0.85] };

/** A puff: where it is, how long it has lasted and will, how far it is carried and rises a second, how big at first, how fast it turns and how far it has. All the puffs are one mesh (billboards.ts), each a copy of it by its index. */
interface Puff { at: THREE.Vector3; t: number; life: number; drift: number; rise: number; size: number; spin: number; turn: number }

/** A puff's picture: soft all over, fading to its edge, a little uneven so that it reads as cloud. */
let puffed: THREE.Texture | null = null;
function puff(): THREE.Texture {
  if (puffed) return puffed;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  for (const [x, y, r] of [[16, 16, 15], [11, 13, 9], [21, 18, 9], [15, 21, 8]]) {
    const soft = g.createRadialGradient(x, y, 0, x, y, r);
    soft.addColorStop(0, 'rgba(255,255,255,0.9)');
    soft.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = soft;
    g.fillRect(0, 0, size, size);
  }
  return puffed = new THREE.CanvasTexture(canvas);
}

export class Stench {
  readonly group = new THREE.Group();
  /** The puffs, drawn in one call. */
  private readonly cloud = new Billboards(PUFF.kept, puff());
  private readonly puffs: Puff[] = [];
  private readonly at = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private readonly behind = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  /** From 0 (gone: he is down) to 1. */
  power = 1;

  /** `body` is his model, already scaled, `tall` its height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    for (let i = 0; i < PUFF.kept; i++) {
      this.cloud.colour(i, CLOUD.colours[i % CLOUD.colours.length]);
      this.puffs.push({ at: new THREE.Vector3(), t: 0, life: 0, drift: 0, rise: 0, size: 0, spin: 0, turn: 0 });
    }
    this.group.add(this.cloud.mesh);
  }

  update(dt: number): void {
    // None let off by a body taken off the scene, or not drawn (still under the ground).
    const power = this.body.parent && this.body.visible ? this.power : 0;
    this.body.getWorldPosition(this.at);
    // Behind him: his front is +Z, turned as he is.
    this.body.getWorldQuaternion(this.turn);
    const behind = this.behind.set(0, 0, -1).applyQuaternion(this.turn).setY(0).normalize();
    const side = this.side.set(behind.z, 0, -behind.x);
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    this.puffs.forEach((p, i) => {
      if (this.cloud.shown(i)) {
        p.t += dt;
        const k = p.t / p.life;
        if (k >= 1) { this.cloud.hide(i); return; }
        p.at.addScaledVector(behind, p.drift * dt);
        p.at.y += p.rise * dt;
        p.turn += p.spin * dt;
        // Thickening as it leaves him, then thinning away.
        this.cloud.put(i, p.at, p.size * (1 + (PUFF.swell - 1) * k), CLOUD.thick * power * Math.min(1, k * 3) * (1 - k), p.turn);
      } else if (power > 0.05 && Math.random() < dt * PUFF.kept / 2.2) {
        p.t = 0; p.life = r(PUFF.life); p.drift = r(PUFF.drift); p.rise = r(PUFF.rise); p.size = r(PUFF.size) * this.tall;
        p.spin = (Math.random() - 0.5) * 0.8;
        p.turn = 0;
        p.at.copy(this.at)
          .addScaledVector(side, (Math.random() - 0.5) * this.tall * 0.35)
          .addScaledVector(behind, (Math.random() - 0.3) * this.tall * 0.2);
        p.at.y += this.tall * r(CLOUD.from);
        this.cloud.put(i, p.at, p.size, 0);
      }
    });
    this.cloud.commit();
  }
}
