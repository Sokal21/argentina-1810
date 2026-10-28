import * as THREE from 'three';
import { Billboards } from './billboards';
import { drape, ground } from './space';
import type { Blast, Mark } from '../tropa/battery';

// Roca's battery's shells, seen (tropa/battery.ts plans where and when they fall): each one's mark on
// the ground first, a red ring with its inside filling toward it as the shell comes, so she sees where
// and how soon; then the blast: a flash, a ball of fire, dark smoke rising, and a crater left a while,
// each its own: soot, a pit with its rim of thrown earth, and cracks out from it. Whoever watches is told of each blast (`blasted`), to shake the camera and the pad.

/** The mark: its colour, how thick its fill comes to, how fast its ring beats at the last. */
const MARK = { colour: '#ff3a1c', fill: 0.38, ring: 0.9, beat: 22 };
/** The crater a blast leaves, its picture as wide as so many times the blast's width. */
const CRATER = { wide: 2.2 };
/** The blast: its flash (seconds, a share of its width), its fire (puffs, seconds, colours), its smoke (puffs, seconds, colours, how high it rises a second), its scorch (seconds it lies, seconds it fades, how dark). */
const FLASH = { life: 0.12, size: 2.6, colour: '#fff1c0' };
const FIRE = { puffs: 8, life: [0.35, 0.6], colours: ['#ffd25a', '#ff9a2a', '#ff5a14'], rise: 40 };
const SMOKE = { puffs: 7, life: [1.4, 2.2], colours: ['#3a342e', '#4a423a', '#2c2824'], rise: 26, thick: 0.75 };
const SCORCH = { lies: 3, fades: 2, thick: 0.9 };

interface Shown { mark: Mark; ring: THREE.LineLoop; fill: THREE.Mesh; reveal: { value: number } }
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

/**
 * A crater, drawn afresh for each blast so that no two are alike (the user, 28/10/2026): a halo of
 * soot fading out over the ground; a ragged pit, darkest at its heart, with a rim of earth thrown up
 * about it; and cracks running out from the rim, jagged, forking now and then, thinning to nothing.
 */
function crater(): THREE.CanvasTexture {
  const size = 256, half = size / 2, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, rnd = Math.random;
  // Soot, unevenly: a few soft dark blots about the middle.
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * half * 0.15, x = half + Math.cos(a) * d, y = half + Math.sin(a) * d, r = half * (0.6 + rnd() * 0.3);
    const soot = g.createRadialGradient(x, y, 0, x, y, r);
    soot.addColorStop(0, 'rgba(20,14,10,0.45)');
    soot.addColorStop(1, 'rgba(20,14,10,0)');
    g.fillStyle = soot;
    g.fillRect(0, 0, size, size);
  }
  // The pit's ragged edge.
  const edge: [number, number][] = [], pit = half * (0.17 + rnd() * 0.05);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, r = pit * (0.8 + rnd() * 0.4);
    edge.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const blob = (grow: number, fill: string | CanvasGradient) => {
    g.fillStyle = fill;
    g.beginPath();
    edge.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, half + x * grow, half + y * grow));
    g.closePath();
    g.fill();
  };
  // Thrown earth about it: clods of lighter dirt in a broken ring.
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, d = pit * (1.05 + rnd() * 0.6), r = 1.5 + rnd() * 4;
    g.fillStyle = rnd() < 0.5 ? 'rgba(92,70,48,0.9)' : 'rgba(64,48,33,0.9)';
    g.beginPath(); g.arc(half + Math.cos(a) * d, half + Math.sin(a) * d, r, 0, Math.PI * 2); g.fill();
  }
  blob(1.18, 'rgba(48,35,24,0.95)');
  const heart = g.createRadialGradient(half, half, 0, half, half, pit);
  heart.addColorStop(0, '#060403');
  heart.addColorStop(1, '#1e150e');
  blob(1, heart);
  // Cracks out from the rim.
  g.lineCap = 'round';
  const crack = (x: number, y: number, a: number, left: number, width: number) => {
    while (left > 0 && width > 0.35) {
      const step = 3 + rnd() * 5;
      a += (rnd() - 0.5) * 0.7;
      const nx = x + Math.cos(a) * step, ny = y + Math.sin(a) * step;
      g.strokeStyle = 'rgba(14,9,6,0.9)';
      g.lineWidth = width;
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      if (rnd() < 0.1) crack(nx, ny, a + (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.6), left * (0.3 + rnd() * 0.3), width * 0.65);
      x = nx; y = ny; left -= step; width *= 0.93;
    }
  };
  const many = 5 + Math.floor(rnd() * 5);
  for (let i = 0; i < many; i++) {
    const a = (i / many) * Math.PI * 2 + (rnd() - 0.5) * 0.8, from = pit * 1.1;
    crack(half + Math.cos(a) * from, half + Math.sin(a) * from, a, half * (0.35 + rnd() * 0.5), 2.2 + rnd() * 1.4);
  }
  return new THREE.CanvasTexture(canvas);
}

export class Battery3D {
  readonly group = new THREE.Group();
  /** Told of each blast as it goes off: where, and whether it was a great one. */
  blasted: (blast: Blast) => void = () => {};
  private readonly fire = new Billboards(220, softGlow(), true);
  private readonly smoke = new Billboards(160, softGlow());
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
      // Each laid over the ground where it falls (drape), whole: its fill shown as far out as it has
      // filled (a flat ring at one height was cut through wherever the ground swelled over it).
      const at = ground(m.x, m.y), place = new THREE.Matrix4().makeTranslation(at.x, at.y, at.z);
      const ringShape = this.loop.clone().scale(m.r, 1, m.r), fillShape = new THREE.RingGeometry(0.001, m.r, 32, 6).rotateX(-Math.PI / 2);
      drape(ringShape, place, 1.4);
      drape(fillShape, place, 1.2);
      const reveal = { value: 0 }, material = new THREE.MeshBasicMaterial({ color: MARK.colour, transparent: true, opacity: 0, depthWrite: false });
      material.onBeforeCompile = shader => {
        shader.uniforms.reveal = reveal;
        shader.vertexShader = 'varying float vOut;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vOut = length(position.xz);');
        shader.fragmentShader = 'uniform float reveal;\nvarying float vOut;\n' + shader.fragmentShader.replace('void main() {', 'void main() {\n  if (vOut > reveal) discard;');
      };
      material.customProgramCacheKey = () => 'battery-mark';
      const ring = new THREE.LineLoop(ringShape, new THREE.LineBasicMaterial({ color: MARK.colour, transparent: true, opacity: 0, depthWrite: false }));
      const fill = new THREE.Mesh(fillShape, material);
      for (const o of [ring, fill]) { o.position.copy(at); o.renderOrder = 3; this.group.add(o); }
      this.marks.push({ mark: m, ring, fill, reveal });
    }
    for (const blast of blasts) this.waiting.push({ ...blast, at: start + blast.at });
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    // The marks: showing, their fill closing on their ring as the shell comes, their ring beating at the last.
    for (const shown of this.marks) {
      const { mark, ring, fill, reveal } = shown;
      const k = (t - mark.shows) / (mark.lands - mark.shows);
      const seen = k >= 0 && k < 1;
      ring.visible = fill.visible = seen;
      if (!seen) continue;
      reveal.value = mark.r * k;
      (fill.material as THREE.MeshBasicMaterial).opacity = MARK.fill * (0.5 + 0.5 * k);
      const beat = k > 0.6 ? 0.6 + 0.4 * Math.sin(t * MARK.beat) : 1;
      (ring.material as THREE.LineBasicMaterial).opacity = MARK.ring * Math.min(1, k * 4) * beat;
    }
    for (const gone of this.marks.filter(s => t >= s.mark.lands)) {
      this.group.remove(gone.ring, gone.fill);
      // Each mark's shapes were its own, laid over the ground where it fell.
      gone.ring.geometry.dispose();
      gone.fill.geometry.dispose();
      (gone.ring.material as THREE.Material).dispose();
      (gone.fill.material as THREE.Material).dispose();
    }
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
    for (const s of this.scorches.filter(s => s.t >= SCORCH.lies + SCORCH.fades)) {
      // Each crater's picture was its own: let it go with it.
      this.group.remove(s.mesh);
      const material = s.mesh.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
      s.mesh.geometry.dispose();
    }
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
    // The crater left where it fell, its own, a while.
    const scorch = new THREE.Mesh(new THREE.PlaneGeometry(r * CRATER.wide, r * CRATER.wide, 8, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: crater(), transparent: true, opacity: SCORCH.thick, depthWrite: false }));
    scorch.position.copy(ground(blast.x, blast.y));
    scorch.rotation.y = Math.random() * Math.PI * 2;
    scorch.updateMatrixWorld(true);
    drape(scorch.geometry, scorch.matrixWorld, 0.9);
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
