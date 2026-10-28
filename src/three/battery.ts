import * as THREE from 'three';
import { Billboards } from './billboards';
import { ground } from './space';
import type { Blast, Mark } from '../tropa/battery';

// Roca's battery's shells, seen (tropa/battery.ts plans where and when they fall): each one's mark on
// the ground first, the ground cracking open about a pit, the cracks spreading and glowing hotter as
// the shell comes (not a drawn circle: the user, 28/10/2026), so she sees where
// and how soon; then the blast: a flash, a ball of fire, dark smoke rising, and the ground left
// scorched a while. Whoever watches is told of each blast (`blasted`), to shake the camera and the pad.

/**
 * The mark: how many pictures of cracks to choose among, how wide one is (a share of the blast's
 * width), how big it starts (a share of that), how dark at most; the glow in its cracks, its colour
 * and how bright at most, and how fast it beats at the last.
 */
const MARK = { pictures: 4, wide: 2.3, from: 0.35, dark: 0.92, glow: '#ff4a14', bright: 1.6, beat: 22 };
/** The blast: its flash (seconds, a share of its width), its fire (puffs, seconds, colours), its smoke (puffs, seconds, colours, how high it rises a second), its scorch (seconds it lies, seconds it fades, how dark). */
const FLASH = { life: 0.12, size: 2.6, colour: '#fff1c0' };
const FIRE = { puffs: 8, life: [0.35, 0.6], colours: ['#ffd25a', '#ff9a2a', '#ff5a14'], rise: 40 };
const SMOKE = { puffs: 7, life: [1.4, 2.2], colours: ['#3a342e', '#4a423a', '#2c2824'], rise: 26, thick: 0.75 };
const SCORCH = { lies: 3, fades: 2, thick: 0.85 };

interface Shown { mark: Mark; cracks: THREE.Mesh; glow: THREE.Mesh }
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
 * A picture of the ground cracked open about a pit, from its middle out to its edge, seeded so each
 * of a few is the same each time: `glowing`, only its cracks and its pit, in white, for the heat in
 * them to be laid over the other as light.
 */
function cracked(seed: number, glowing: boolean): THREE.Texture {
  const size = 128, half = size / 2, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  let n = seed * 7919 + 13;
  const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
  // The pit: a ragged hole, darkest at its heart, a lighter broken rim about it.
  const rim: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = half * (0.15 + rnd() * 0.07);
    rim.push([half + Math.cos(a) * r, half + Math.sin(a) * r]);
  }
  const pit = (grow: number, colour: string) => {
    g.fillStyle = colour;
    g.beginPath();
    rim.forEach(([x, y], i) => { const px = half + (x - half) * grow, py = half + (y - half) * grow; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
    g.closePath();
    g.fill();
  };
  if (!glowing) pit(1.35, 'rgba(70,52,36,0.85)');
  pit(1, glowing ? 'rgba(255,255,255,0.8)' : '#120b07');
  // The cracks: jagged lines out from the pit, thinning, some forking.
  const crack = (x: number, y: number, a: number, left: number, width: number) => {
    while (left > 0 && width > 0.3) {
      const step = 5 + rnd() * 6;
      a += (rnd() - 0.5) * 0.9;
      const nx = x + Math.cos(a) * step, ny = y + Math.sin(a) * step;
      g.strokeStyle = glowing ? 'rgba(255,255,255,0.95)' : '#160e08';
      g.lineWidth = glowing ? Math.max(0.6, width * 0.45) : width;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      if (rnd() < 0.18) crack(nx, ny, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5), left * 0.5, width * 0.6);
      x = nx; y = ny; left -= step; width *= 0.9;
    }
  };
  const many = 7 + Math.floor(rnd() * 4);
  for (let i = 0; i < many; i++) {
    const a = (i / many) * Math.PI * 2 + rnd() * 0.5;
    crack(half + Math.cos(a) * half * 0.16, half + Math.sin(a) * half * 0.16, a, half * (0.55 + rnd() * 0.35), 3.2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return texture;
}

export class Battery3D {
  readonly group = new THREE.Group();
  /** Told of each blast as it goes off: where, and whether it was a great one. */
  blasted: (blast: Blast) => void = () => {};
  private readonly fire = new Billboards(220, softGlow(), true);
  private readonly smoke = new Billboards(160, softGlow());
  private readonly square = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  /** The pictures of cracks, each with its glow. */
  private readonly pictures = Array.from({ length: MARK.pictures }, (_, i) => ({ dark: cracked(i + 1, false), glow: cracked(i + 1, true) }));
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
      const picture = this.pictures[Math.floor(Math.random() * this.pictures.length)], turn = Math.random() * Math.PI * 2;
      const cracks = new THREE.Mesh(this.square, new THREE.MeshBasicMaterial({ map: picture.dark, transparent: true, opacity: 0, depthWrite: false }));
      const glow = new THREE.Mesh(this.square, new THREE.MeshBasicMaterial({ map: picture.glow, color: new THREE.Color(MARK.glow).multiplyScalar(MARK.bright), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      for (const [o, h, order] of [[cracks, 0.8, 3], [glow, 0.9, 4]] as const) { o.position.copy(ground(m.x, m.y, h)); o.rotation.y = turn; o.renderOrder = order; this.group.add(o); }
      this.marks.push({ mark: m, cracks, glow });
    }
    for (const blast of blasts) this.waiting.push({ ...blast, at: start + blast.at });
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    // The marks: the ground cracking open from the pit out as the shell comes, the cracks glowing
    // hotter, and beating at the last.
    for (const shown of this.marks) {
      const { mark, cracks, glow } = shown;
      const k = (t - mark.shows) / (mark.lands - mark.shows);
      const seen = k >= 0 && k < 1;
      cracks.visible = glow.visible = seen;
      if (!seen) continue;
      const spread = mark.r * MARK.wide * (MARK.from + (1 - MARK.from) * (1 - (1 - k) * (1 - k)));
      cracks.scale.set(spread, 1, spread);
      glow.scale.set(spread, 1, spread);
      (cracks.material as THREE.MeshBasicMaterial).opacity = MARK.dark * Math.min(1, k * 3);
      const beat = k > 0.65 ? 0.65 + 0.35 * Math.sin(t * MARK.beat) : 1;
      (glow.material as THREE.MeshBasicMaterial).opacity = Math.pow(k, 1.4) * beat;
    }
    for (const gone of this.marks.filter(s => t >= s.mark.lands)) this.group.remove(gone.cracks, gone.glow);
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
    // The crater left where it fell: its pit and its cracks, a while.
    const picture = this.pictures[Math.floor(Math.random() * this.pictures.length)];
    const scorch = new THREE.Mesh(this.square, new THREE.MeshBasicMaterial({ map: picture.dark, transparent: true, opacity: SCORCH.thick, depthWrite: false }));
    scorch.position.copy(ground(blast.x, blast.y, 0.6));
    scorch.rotation.y = Math.random() * Math.PI * 2;
    scorch.scale.set(r * MARK.wide, 1, r * MARK.wide);
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
