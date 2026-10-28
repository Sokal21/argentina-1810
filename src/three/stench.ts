import * as THREE from 'three';

// The stench the plague-dead soldier walks in: puffs of a dull, sickly green cloud let off about
// his body, carried away behind him as by a wind at his back, swelling and thinning as they go.
// Not lit and not shining (his sores shine; this is only foul air): drawn over what is behind it,
// half seen through. The puffs are left in the world, so that walking he trails them.

/** The puffs: how many kept, how long one lasts, how far behind him it is carried a second, how much it rises, how big it starts (a share of his height) and how many times that it ends. */
const PUFF = { kept: 34, life: [1.8, 3], drift: [16, 30], rise: [4, 10], size: [0.22, 0.38], swell: 2.2 };
/** Their colours (one of them each), how thick at most, and where on him they are let off, as shares of his height. */
const CLOUD = { colours: ['#8da24a', '#7a8f3e', '#9fb35a'], thick: 0.75, from: [0.3, 0.85] };

interface Puff { sprite: THREE.Sprite; t: number; life: number; drift: number; rise: number; size: number; spin: number }

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
  private readonly puffs: Puff[] = [];
  private readonly at = new THREE.Vector3();
  /** From 0 (gone: he is down) to 1. */
  power = 1;

  /** `body` is his model, already scaled, `tall` its height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    for (let i = 0; i < PUFF.kept; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: puff(), color: CLOUD.colours[i % CLOUD.colours.length], transparent: true, depthWrite: false, opacity: 0,
      }));
      sprite.visible = false;
      this.group.add(sprite);
      this.puffs.push({ sprite, t: 0, life: 0, drift: 0, rise: 0, size: 0, spin: 0 });
    }
  }

  update(dt: number): void {
    // None let off by a body taken off the scene, or not drawn (still under the ground).
    const power = this.body.parent && this.body.visible ? this.power : 0;
    this.body.getWorldPosition(this.at);
    // Behind him: his front is +Z, turned as he is.
    const turn = this.body.getWorldQuaternion(new THREE.Quaternion());
    const behind = new THREE.Vector3(0, 0, -1).applyQuaternion(turn).setY(0).normalize();
    const side = new THREE.Vector3(behind.z, 0, -behind.x);
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    for (const p of this.puffs) {
      const s = p.sprite;
      if (s.visible) {
        p.t += dt;
        const k = p.t / p.life;
        if (k >= 1) { s.visible = false; continue; }
        s.position.addScaledVector(behind, p.drift * dt);
        s.position.y += p.rise * dt;
        // Thickening as it leaves him, then thinning away.
        s.material.opacity = CLOUD.thick * power * Math.min(1, k * 3) * (1 - k);
        s.material.rotation += p.spin * dt;
        s.scale.setScalar(p.size * (1 + (PUFF.swell - 1) * k));
      } else if (power > 0.05 && Math.random() < dt * PUFF.kept / 2.2) {
        p.t = 0; p.life = r(PUFF.life); p.drift = r(PUFF.drift); p.rise = r(PUFF.rise); p.size = r(PUFF.size) * this.tall;
        p.spin = (Math.random() - 0.5) * 0.8;
        s.position.copy(this.at)
          .addScaledVector(side, (Math.random() - 0.5) * this.tall * 0.35)
          .addScaledVector(behind, (Math.random() - 0.3) * this.tall * 0.2);
        s.position.y += this.tall * r(CLOUD.from);
        s.material.opacity = 0;
        s.visible = true;
      }
    }
  }
}
