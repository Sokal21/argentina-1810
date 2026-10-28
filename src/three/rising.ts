import * as THREE from 'three';
import { flat } from './paint';

// The plague-dead soldier coming up out of the earth near her: first the ground swells into a mound,
// stirring and letting off a breath of dust (the warning, so she has a moment); then it breaks, clods
// of earth thrown off, and he pushes himself up out of it from lying face down (his `levantarse`),
// sunk in the ground at first and rising as he gets up; then the broken mound settles back to a patch
// of turned earth, and is gone. It shows the mound and the earth; how deep he is still sunk is asked
// of it (`sunk`), and whoever draws him puts him that far down.

/** How long the ground swells before he breaks out, how long he takes to come up out of it (a share of his getting up), how long the earth takes to settle. */
export const RISE = { warn: 0.8, out: 0.45, settle: 2.4 };
/** The mound: how long and wide (shares of his height, along him and across), how high it swells, and its earths. */
const MOUND = { long: 0.95, wide: 0.55, high: 0.14, earth: '#5b4630', dark: '#382a1c', clod: '#6b5338' };
/** The clods thrown as it breaks: how many, how big (shares of his height), how fast up and out, how heavy. */
const CLODS = { count: 12, size: [0.03, 0.06], up: [50, 95], out: [15, 45], fall: 260 };
/** The dust: how many puffs, how long one lasts, how big (shares of his height), how thick, its colour. */
const DUST = { kept: 14, life: [0.6, 1.3], size: [0.15, 0.3], thick: 0.5, colour: '#8a7656' };
/** How far down he lies at first, a share of his height: under the ground, all but his back. */
const DEPTH = 0.3;

interface Clod { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; flying: boolean }
interface Puff { sprite: THREE.Sprite; t: number; life: number; size: number }

/** A puff's picture: soft, fading to its edge. */
let soft: THREE.Texture | null = null;
function puff(): THREE.Texture {
  if (soft) return soft;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, light = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  light.addColorStop(0, 'rgba(255,255,255,0.9)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  return soft = new THREE.CanvasTexture(canvas);
}

export class Rising {
  readonly group = new THREE.Group();
  private readonly mound: THREE.Mesh;
  private readonly patch: THREE.Mesh;
  private readonly clods: Clod[] = [];
  private readonly dust: Puff[] = [];
  private time = -1;

  /** `tall` is his height in the world's units; `rises` how long his getting up lasts, in seconds. */
  constructor(private readonly tall: number, private readonly rises: number) {
    // A dome flattened into a low, long mound, along his length (+Z, his front, turned as he is).
    this.mound = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), flat(MOUND.earth));
    this.mound.castShadow = this.mound.receiveShadow = true;
    this.group.add(this.mound);
    // The turned earth under it, left when it settles.
    this.patch = new THREE.Mesh(new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: MOUND.dark, transparent: true, depthWrite: false }));
    this.patch.position.y = 0.4;
    this.patch.scale.set(tall * MOUND.wide * 0.6, 1, tall * MOUND.long * 0.6);
    this.group.add(this.patch);
    const clod = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < CLODS.count; i++) {
      const mesh = new THREE.Mesh(clod, flat(i % 3 ? MOUND.clod : MOUND.earth));
      mesh.castShadow = true;
      this.group.add(mesh);
      this.clods.push({ mesh, v: new THREE.Vector3(), spin: new THREE.Vector3(), flying: false });
    }
    for (let i = 0; i < DUST.kept; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff(), color: DUST.colour, transparent: true, depthWrite: false, opacity: 0 }));
      this.group.add(sprite);
      this.dust.push({ sprite, t: 0, life: 0, size: 0 });
    }
    this.group.visible = false;
  }

  /** How long it all lasts, from the ground first stirring to the earth settled. */
  get lasts(): number {
    return RISE.warn + this.rises + RISE.settle;
  }

  /** Whether he is up out of the ground yet (before, he is not drawn). */
  get out(): boolean {
    return this.time >= RISE.warn;
  }

  /** Starts it over where he is to come up, turned his way. */
  start(at: THREE.Vector3, turn: number): void {
    this.time = 0;
    this.group.position.copy(at);
    this.group.rotation.y = turn;
    this.group.visible = true;
    for (const c of this.clods) { c.flying = false; c.mesh.visible = false; }
    for (const d of this.dust) d.sprite.visible = false;
  }

  /** How far down in the ground he is now, in the world's units. */
  get sunk(): number {
    const k = (this.time - RISE.warn) / (this.rises * RISE.out);
    if (k <= 0) return this.tall * DEPTH;
    if (k >= 1) return 0;
    // Slowly at first, as he heaves himself up, then quickly free.
    return this.tall * DEPTH * (1 - k * k);
  }

  update(dt: number): void {
    if (this.time < 0) return;
    const was = this.time;
    this.time += dt;
    const t = this.time, tall = this.tall;
    if (t > this.lasts) { this.group.visible = false; this.time = -1; return; }
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    // The mound: swelling, stirring as something heaves under it; broken open, sinking back.
    let swell: number, settle = 0;
    if (t < RISE.warn) {
      const k = t / RISE.warn;
      swell = k * k * (1 + 0.12 * Math.sin(t * 38) * k);
    } else {
      settle = Math.min(1, (t - RISE.warn - this.rises * RISE.out) / RISE.settle);
      swell = 1 - Math.max(0, settle) * 0.85;
    }
    this.mound.scale.set(tall * MOUND.wide * 0.5 * (1 + 0.15 * settle), Math.max(0.01, tall * MOUND.high * swell), tall * MOUND.long * 0.5 * (1 + 0.15 * settle));
    // It fades into the ground as it settles, the patch with it.
    const left = settle > 0.7 ? 1 - (settle - 0.7) / 0.3 : 1;
    this.mound.visible = left > 0.05;
    (this.patch.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.min(1, t / RISE.warn) * left;
    // It breaks: the clods thrown off it, the dust thrown up.
    if (was < RISE.warn && t >= RISE.warn) {
      for (const c of this.clods) {
        const a = Math.random() * Math.PI * 2, s = tall * r(CLODS.size);
        c.mesh.scale.setScalar(s);
        c.mesh.position.set(Math.cos(a) * tall * MOUND.wide * 0.25, tall * MOUND.high * 0.6, Math.sin(a) * tall * MOUND.long * 0.3);
        c.v.set(Math.cos(a) * r(CLODS.out), r(CLODS.up), Math.sin(a) * r(CLODS.out));
        c.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
        c.flying = c.mesh.visible = true;
      }
      for (let i = 0; i < DUST.kept / 2; i++) this.puff(r, true);
    }
    for (const c of this.clods) {
      if (!c.mesh.visible) continue;
      if (c.flying) {
        c.v.y -= CLODS.fall * dt;
        c.mesh.position.addScaledVector(c.v, dt);
        c.mesh.rotation.x += c.spin.x * dt; c.mesh.rotation.y += c.spin.y * dt; c.mesh.rotation.z += c.spin.z * dt;
        if (c.mesh.position.y <= c.mesh.scale.x * 0.5) { c.mesh.position.y = c.mesh.scale.x * 0.5; c.flying = false; }
      }
      c.mesh.visible = left > 0.05;
    }
    // Dust off it while it stirs, and while he comes up out of it.
    if (t < RISE.warn + this.rises * RISE.out && Math.random() < dt * (t < RISE.warn ? 6 : 12)) this.puff(r, false);
    for (const d of this.dust) {
      if (!d.sprite.visible) continue;
      d.t += dt;
      const k = d.t / d.life;
      if (k >= 1) { d.sprite.visible = false; continue; }
      d.sprite.position.y += tall * 0.25 * dt;
      d.sprite.material.opacity = DUST.thick * Math.min(1, k * 4) * (1 - k);
      d.sprite.scale.setScalar(d.size * (1 + k));
    }
  }

  private puff(r: (a: number[]) => number, burst: boolean): void {
    const d = this.dust.find(x => !x.sprite.visible);
    if (!d) return;
    const tall = this.tall, a = Math.random() * Math.PI * 2, out = burst ? 0.35 : 0.2;
    d.t = 0; d.life = r(DUST.life); d.size = tall * r(DUST.size);
    d.sprite.position.set(Math.cos(a) * tall * MOUND.wide * out, tall * MOUND.high, Math.sin(a) * tall * MOUND.long * out);
    d.sprite.material.opacity = 0;
    d.sprite.visible = true;
  }
}
