import * as THREE from 'three';
import { Billboards } from './billboards';
import { ground } from './space';
import type { Blast, Mark } from '../tropa/battery';

// Roca's battery's shells, seen (tropa/battery.ts plans where and when they fall): each one's mark on
// the ground first, a red ring with its inside filling toward it as the shell comes, so she sees where
// and how soon; then the blast: a flash, a ball of fire, dark smoke rising, and the ground left
// scorched a while. Whoever watches is told of each blast (`blasted`), to shake the camera and the pad.

/** The mark: its colour, how thick its fill comes to, how fast its ring beats at the last. */
const MARK = { colour: '#ff3a1c', fill: 0.38, ring: 0.9, beat: 22 };
/** The blast: its flash (seconds, a share of its width), its fire (puffs, seconds, colours), its smoke (puffs, seconds, colours, how high it rises a second), its scorch (seconds it lies, seconds it fades, how dark). */
const FLASH = { life: 0.12, size: 2.6, colour: '#fff1c0' };
const FIRE = { puffs: 8, life: [0.35, 0.6], colours: ['#ffd25a', '#ff9a2a', '#ff5a14'], rise: 40 };
const SMOKE = { puffs: 7, life: [1.4, 2.2], colours: ['#3a342e', '#4a423a', '#2c2824'], rise: 26, thick: 0.75 };
const SCORCH = { lies: 3, fades: 2, colour: '#1c1611', thick: 0.7 };

interface Shown { mark: Mark; ring: THREE.LineLoop; fill: THREE.Mesh }
interface Puff { i: number; at: THREE.Vector3; v: THREE.Vector3; t: number; life: number; size: number; grows: number }

/** A soft round picture, white at its heart. */
let soft: THREE.Texture | null = null;
function softGlow(): THREE.Texture {
  if (soft) return soft;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, light = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  light.addColorStop(0, 'rgba(255,255,255,1)');
  light.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  return soft = new THREE.CanvasTexture(canvas);
}

export class Battery3D {
  readonly group = new THREE.Group();
  /** Told of each blast as it goes off: where, and whether it was a great one. */
  blasted: (blast: Blast) => void = () => {};
  private readonly fire = new Billboards(220, softGlow(), true);
  private readonly smoke = new Billboards(160, softGlow());
  private readonly circle = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  private readonly loop = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  }));
  private marks: Shown[] = [];
  private waiting: Blast[] = [];
  private flames: Puff[] = [];
  private smokes: Puff[] = [];
  private scorches: { mesh: THREE.Mesh; t: number }[] = [];
  private time = 0;

  constructor() {
    this.group.add(this.fire.mesh, this.smoke.mesh);
  }

  /** A salvo starts now: its marks show and its blasts go off as planned. */
  salvo({ marks, blasts }: { marks: Mark[]; blasts: Blast[] }): void {
    const start = this.time;
    for (const mark of marks) {
      const m = { ...mark, shows: start + mark.shows, lands: start + mark.lands };
      const ring = new THREE.LineLoop(this.loop, new THREE.LineBasicMaterial({ color: MARK.colour, transparent: true, opacity: 0, depthWrite: false }));
      const fill = new THREE.Mesh(this.circle, new THREE.MeshBasicMaterial({ color: MARK.colour, transparent: true, opacity: 0, depthWrite: false }));
      for (const o of [ring, fill]) { o.position.copy(ground(m.x, m.y, 0.8)); o.renderOrder = 3; this.group.add(o); }
      ring.scale.setScalar(m.r);
      this.marks.push({ mark: m, ring, fill });
    }
    for (const blast of blasts) this.waiting.push({ ...blast, at: start + blast.at });
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    // The marks: showing, their fill closing on their ring as the shell comes, their ring beating at the last.
    for (const shown of this.marks) {
      const { mark, ring, fill } = shown;
      const k = (t - mark.shows) / (mark.lands - mark.shows);
      const seen = k >= 0 && k < 1;
      ring.visible = fill.visible = seen;
      if (!seen) continue;
      fill.scale.setScalar(Math.max(0.01, mark.r * k));
      (fill.material as THREE.MeshBasicMaterial).opacity = MARK.fill * (0.5 + 0.5 * k);
      const beat = k > 0.6 ? 0.6 + 0.4 * Math.sin(t * MARK.beat) : 1;
      (ring.material as THREE.LineBasicMaterial).opacity = MARK.ring * Math.min(1, k * 4) * beat;
    }
    for (const gone of this.marks.filter(s => t >= s.mark.lands)) this.group.remove(gone.ring, gone.fill);
    this.marks = this.marks.filter(s => t < s.mark.lands);
    // The blasts whose moment has come.
    for (const blast of this.waiting.filter(b => t >= b.at)) this.blast(blast);
    this.waiting = this.waiting.filter(b => t < b.at);
    this.puffs(this.flames, this.fire, dt, 1, 0.9);
    this.puffs(this.smokes, this.smoke, dt, SMOKE.thick, 0.4);
    for (const s of this.scorches) {
      s.t += dt;
      const k = Math.max(0, (s.t - SCORCH.lies) / SCORCH.fades);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = SCORCH.thick * (1 - k);
    }
    for (const s of this.scorches.filter(s => s.t >= SCORCH.lies + SCORCH.fades)) this.group.remove(s.mesh);
    this.scorches = this.scorches.filter(s => s.t < SCORCH.lies + SCORCH.fades);
  }

  private blast(blast: Blast): void {
    const at = ground(blast.x, blast.y, 2), r = blast.r;
    const rand = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    // Each puff is put at once (as nothing), so the next free one is another.
    // The flash: a moment of white light as wide as the blast, and more.
    const flash = this.fire.free();
    if (flash >= 0) {
      this.fire.colour(flash, FLASH.colour, 1.6);
      this.fire.put(flash, at, 0, 0);
      this.flames.push({ i: flash, at: at.clone().setY(at.y + r * 0.3), v: new THREE.Vector3(), t: 0, life: FLASH.life, size: r * FLASH.size, grows: 0.3 });
    }
    // The ball of fire, its puffs flung out over the blast and up.
    for (let n = 0; n < FIRE.puffs; n++) {
      const i = this.fire.free();
      if (i < 0) break;
      const a = Math.random() * Math.PI * 2, out = Math.random() * r * 0.5;
      this.fire.colour(i, FIRE.colours[n % FIRE.colours.length], 1.4);
      this.fire.put(i, at, 0, 0);
      this.flames.push({ i, at: at.clone().add(new THREE.Vector3(Math.cos(a) * out, r * 0.15, Math.sin(a) * out)),
        v: new THREE.Vector3(Math.cos(a) * r * 0.6, FIRE.rise + Math.random() * r * 0.5, Math.sin(a) * r * 0.6), t: 0, life: rand(FIRE.life), size: r * (0.45 + Math.random() * 0.4), grows: 0.8 });
    }
    // Dark smoke, rising, swelling and thinning.
    for (let n = 0; n < SMOKE.puffs; n++) {
      const i = this.smoke.free();
      if (i < 0) break;
      const a = Math.random() * Math.PI * 2, out = Math.random() * r * 0.6;
      this.smoke.colour(i, SMOKE.colours[n % SMOKE.colours.length]);
      this.smoke.put(i, at, 0, 0);
      this.smokes.push({ i, at: at.clone().add(new THREE.Vector3(Math.cos(a) * out, r * 0.2, Math.sin(a) * out)),
        v: new THREE.Vector3(Math.cos(a) * 10, SMOKE.rise * (0.6 + Math.random() * 0.8), Math.sin(a) * 10), t: 0, life: rand(SMOKE.life), size: r * (0.4 + Math.random() * 0.3), grows: 1.6 });
    }
    // The ground scorched where it fell.
    const scorch = new THREE.Mesh(this.circle, new THREE.MeshBasicMaterial({ color: SCORCH.colour, transparent: true, opacity: SCORCH.thick, depthWrite: false }));
    scorch.position.copy(ground(blast.x, blast.y, 0.6));
    scorch.scale.setScalar(r * 0.85);
    scorch.renderOrder = 2;
    this.group.add(scorch);
    this.scorches.push({ mesh: scorch, t: 0 });
    this.blasted(blast);
  }

  /** Puffs flying and slowing, swelling and fading, gone at the end of their life. */
  private puffs(list: Puff[], into: Billboards, dt: number, thick: number, slows: number): void {
    for (const p of list) {
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { into.hide(p.i); continue; }
      p.at.addScaledVector(p.v, dt);
      p.v.multiplyScalar(Math.max(0, 1 - dt * slows * 3));
      into.put(p.i, p.at, p.size * (1 + p.grows * k), thick * Math.min(1, k * 6) * (1 - k) * (1 - k * 0.3));
    }
    list.splice(0, list.length, ...list.filter(p => p.t < p.life));
    into.commit();
  }
}
