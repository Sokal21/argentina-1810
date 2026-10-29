import * as THREE from 'three';
import { Billboards } from './billboards';
import { unlitShader } from './pixels';

// What makes the Wekufe more than his model. He floats, rising and sinking a little. His tail is hidden
// in smoke, laid along it as it bends and snakes (found each frame from the leg bones it is skinned to),
// in layers: a black core, thick enough to hide it, let off just before it as the camera sees it;
// a dark cloud about that; a grey haze outside, slower to go; and at its end, smoke of many greys and
// blacks, big and small, spreading and curling off it. Souls wind up round it and off him, as black
// streaks, each fading along its length. The red of his eyes and of what burns within his belly
// glows past his body, beating slowly, as halos drawn over everything (his model's own red is lit by
// glow.py's light map, which shines only on itself).

/**
 * A layer of the smoke: how many puffs kept, how long one lasts, how fast it rises and spreads, how big
 * it starts (a share of his height) and how many times that it ends, its colours, how thick at most,
 * how far out from the tail's middle it is let off (a share of the tail's width there), and over which
 * stretch of the tail (0 its tip, 1 its root; the whole of it if not said).
 */
interface Layer { kept: number; life: number[]; rise: number[]; spread: number; size: number[]; swell: number; colours: string[]; thick: number; out: number; up?: number[] }
const LAYERS: Layer[] = [
  { kept: 60, life: [0.5, 0.9], rise: [2, 6], spread: 4, size: [0.1, 0.16], swell: 1.5, colours: ['#050405', '#0a0809', '#0e0b0d'], thick: 0.95, out: 0.6 },
  { kept: 40, life: [0.9, 1.5], rise: [6, 12], spread: 8, size: [0.16, 0.26], swell: 1.8, colours: ['#141013', '#1b1519', '#221a1f'], thick: 0.7, out: 1.1 },
  { kept: 24, life: [1.6, 2.6], rise: [8, 16], spread: 12, size: [0.26, 0.4], swell: 2.2, colours: ['#2c2630', '#352d38'], thick: 0.32, out: 1.6 },
  { kept: 48, life: [0.8, 2], rise: [-4, 10], spread: 18, size: [0.05, 0.3], swell: 2.4,
    colours: ['#000000', '#0b0a0c', '#18161a', '#2a272c', '#3d393f', '#524d55', '#68626b', '#7e7881'], thick: 0.7, out: 1.4, up: [-0.08, 0.3] },
];
/** The tail's width, as a share of his height, at its root (his waist) and at its tip. */
const TAIL = { root: 0.11, tip: 0.03 };
/**
 * The souls: how many at once, how long one lasts, how fast it climbs the tail (tails a second) and
 * winds round it (radians a second), how far out (shares of the tail's width), how long its streak is
 * (seconds of its path), how wide (a share of his height), how clear at most, and their colours.
 */
const SOULS = { kept: 14, points: 18, life: [1.6, 2.6], climb: [0.45, 0.75], wind: [2.5, 4.2], out: [1.1, 1.9],
  streak: 0.4, wide: 0.024, clear: 0.85, colours: ['#000000', '#070607', '#0e0c0f', '#161318'] };
/** How high he floats and how far he rises and sinks (shares of his height), and how fast. */
const FLOAT = { high: 0.12, bob: 0.03, beat: 1.4 };
/**
 * His halos: on which bone, how far before it and up it (shares of his height), how wide (a share of
 * his height), how bright at least and at most, and how fast they beat.
 */
const HALOS = [
  { bone: 'Head', ahead: 0.05, up: 0.01, wide: 0.16, bright: [0.75, 1] },
  { bone: 'Spine01', ahead: 0.07, up: 0, wide: 0.38, bright: [0.45, 0.8] },
];
const BEAT = 2.2;
const RED = new THREE.Color('#ff3018');

/** A soft round picture: `inner` how far out it stays bright. For a puff of smoke and for a halo. */
const pictures = new Map<number, THREE.Texture>();
function soft(inner: number): THREE.Texture {
  const had = pictures.get(inner);
  if (had) return had;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const fade = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, 'rgba(255,255,255,1)');
  fade.addColorStop(inner, 'rgba(255,255,255,0.6)');
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  pictures.set(inner, texture);
  return texture;
}

interface Puff { at: THREE.Vector3; way: THREE.Vector3; t: number; life: number; rise: number; size: number; spin: number; turn: number }
interface Soul { t: number; life: number; from: number; climb: number; angle: number; wind: number; out: number; colour: THREE.Color }

const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);

/** The souls' streaks: ribbons turned to the camera, clear at their head and fading along them. */
class Streaks {
  readonly mesh: THREE.Mesh;
  private readonly at: THREE.BufferAttribute;
  private readonly tint: THREE.BufferAttribute;

  constructor(lines: number, private readonly points: number) {
    const geometry = new THREE.BufferGeometry();
    this.at = new THREE.BufferAttribute(new Float32Array(lines * points * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.tint = new THREE.BufferAttribute(new Float32Array(lines * points * 2 * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.at);
    geometry.setAttribute('tint', this.tint);
    const index: number[] = [];
    for (let l = 0; l < lines; l++) {
      for (let p = 0; p < points - 1; p++) {
        const a = (l * points + p) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec4 tint; varying vec4 vTint;
        void main() { vTint = tint; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: unlitShader(`
        varying vec4 vTint;
        void main() { gl_FragColor = vTint; }`),
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
  }

  /** Point `p` of line `l`: where it is, which way across it spreads, how wide, its colour and how clear. */
  put(l: number, p: number, at: THREE.Vector3, across: THREE.Vector3, wide: number, colour: THREE.Color, clear: number): void {
    const v = (l * this.points + p) * 2;
    this.at.setXYZ(v, at.x - across.x * wide / 2, at.y - across.y * wide / 2, at.z - across.z * wide / 2);
    this.at.setXYZ(v + 1, at.x + across.x * wide / 2, at.y + across.y * wide / 2, at.z + across.z * wide / 2);
    this.tint.setXYZW(v, colour.r, colour.g, colour.b, clear);
    this.tint.setXYZW(v + 1, colour.r, colour.g, colour.b, clear);
  }

  commit(): void {
    this.at.needsUpdate = this.tint.needsUpdate = true;
  }
}

export class Wekufe {
  readonly group = new THREE.Group();
  private readonly layers: { how: Layer; cloud: Billboards; puffs: Puff[] }[] = [];
  private readonly streaks: Streaks;
  private readonly souls: Soul[] = [];
  private readonly halos: { sprite: THREE.Sprite; bone: THREE.Object3D | undefined; how: (typeof HALOS)[number] }[] = [];
  /** What of the model floats: everything under its root, so the root keeps the place the game gives it. */
  private readonly floats: THREE.Object3D[];
  /** The bones the tail is laid along, root first: his waist, then thighs, calves, feet, two by two. */
  private readonly bones: (THREE.Object3D | undefined)[][];
  /** The tail's line this frame, root first, its tip last. */
  private readonly line = [0, 1, 2, 3, 4].map(() => new THREE.Vector3());
  /** Where the camera was when last drawn: the smoke's core is let off before the tail as it sees it. */
  private readonly eye = new THREE.Vector3();
  private seen = false;
  private readonly at = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly w = new THREE.Vector3();
  private time = Math.random() * 10;
  /** From 0 (gone) to 1. */
  power = 1;

  /** `body` is his model, already scaled, `tall` its height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    this.floats = [...body.children];
    const bone = (name: string) => body.getObjectByName(name);
    this.bones = [[bone('Waist')], ...['Thigh', 'Calf', 'Foot'].map(b => [bone('L_' + b), bone('R_' + b)])];
    for (const how of LAYERS) {
      const cloud = new Billboards(how.kept, soft(0.3));
      const puffs: Puff[] = [];
      for (let i = 0; i < how.kept; i++) {
        cloud.colour(i, how.colours[i % how.colours.length]);
        puffs.push({ at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, life: 0, rise: 0, size: 0, spin: 0, turn: 0 });
      }
      this.layers.push({ how, cloud, puffs });
      this.group.add(cloud.mesh);
    }
    this.streaks = new Streaks(SOULS.kept, SOULS.points);
    this.streaks.mesh.onBeforeRender = (_r, _s, camera) => { this.eye.setFromMatrixPosition(camera.matrixWorld); this.seen = true; };
    this.group.add(this.streaks.mesh);
    for (let i = 0; i < SOULS.kept; i++) {
      this.souls.push({ t: 0, life: 0, from: 0, climb: 0, angle: 0, wind: 0, out: 0, colour: new THREE.Color() });
      this.soul(this.souls[i], Math.random());
    }
    for (const how of HALOS) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: soft(0.25), color: RED, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      }));
      sprite.scale.setScalar(how.wide * tall);
      sprite.renderOrder = 10;
      this.group.add(sprite);
      this.halos.push({ sprite, bone: bone(how.bone), how });
    }
  }

  /** A soul set off again from low on the tail, `into` that share of its life already. */
  private soul(s: Soul, into = 0): void {
    s.life = r(SOULS.life);
    s.t = into * s.life;
    s.from = Math.random() * 0.3 - 0.1;
    s.climb = r(SOULS.climb);
    s.angle = Math.random() * Math.PI * 2;
    s.wind = r(SOULS.wind) * (Math.random() < 0.5 ? -1 : 1);
    s.out = r(SOULS.out);
    s.colour.set(SOULS.colours[Math.floor(Math.random() * SOULS.colours.length)]);
  }

  /** The tail's line: its root at his waist, through the middles of both legs' bones, its tip as far past the feet as half a calf. */
  private lay(): void {
    this.bones.forEach((pair, i) => {
      const p = this.line[i].set(0, 0, 0);
      let n = 0;
      for (const b of pair) if (b) { p.add(b.getWorldPosition(this.v)); n++; }
      if (n) p.divideScalar(n);
    });
    this.line[4].copy(this.line[3]).sub(this.line[2]).multiplyScalar(0.6).add(this.line[3]);
  }

  /** The point `up` along the tail (0 its tip, 1 its root), and past its root, rising off him. */
  private along(up: number, out: THREE.Vector3): THREE.Vector3 {
    if (up >= 1) return out.copy(this.line[0]).setY(this.line[0].y + (up - 1) * this.tall * 0.6);
    const k = Math.max(0, 1 - up) * (this.line.length - 1), i = Math.min(Math.floor(k), this.line.length - 2);
    return out.lerpVectors(this.line[i], this.line[i + 1], k - i);
  }

  /** The tail's width `up` along it. */
  private width(up: number): number {
    const u = Math.min(1, Math.max(0, up));
    return this.tall * (TAIL.tip + (TAIL.root - TAIL.tip) * u);
  }

  update(dt: number): void {
    this.time += dt;
    const shown = this.body.parent && this.body.visible ? this.power : 0;
    // Each child is moved in the root's units: the model is one unit tall.
    const high = FLOAT.high + FLOAT.bob * Math.sin(this.time * FLOAT.beat * Math.PI);
    for (const o of this.floats) o.position.y = high;
    this.body.updateWorldMatrix(true, true);
    this.lay();
    this.smoke(dt, shown);
    this.wind(dt, shown);
    this.glow(shown);
  }

  private smoke(dt: number, shown: number): void {
    for (const { how, cloud, puffs } of this.layers) {
      const rate = how.kept / ((how.life[0] + how.life[1]) / 2);
      puffs.forEach((p, i) => {
        if (cloud.shown(i)) {
          p.t += dt;
          const k = p.t / p.life;
          if (k >= 1) { cloud.hide(i); return; }
          p.at.addScaledVector(p.way, dt);
          p.at.y += p.rise * dt;
          p.turn += p.spin * dt;
          cloud.put(i, p.at, p.size * (1 + (how.swell - 1) * k), how.thick * shown * Math.min(1, k * 4) * (1 - k * k), p.turn);
        } else if (shown > 0.05 && Math.random() < dt * rate) {
          // Anywhere along it, more of the core low where the tail is all smoke.
          const up = how.up ? r(how.up) : how === LAYERS[0] ? Math.pow(Math.random(), 1.3) : Math.random() * 1.05;
          const wide = this.width(up);
          const a = Math.random() * Math.PI * 2, out = Math.sqrt(Math.random()) * how.out * wide / 2;
          this.along(up, p.at);
          p.at.x += Math.cos(a) * out;
          p.at.z += Math.sin(a) * out;
          // Before the tail, as the camera sees it, by about its width: so the core hides it.
          if (this.seen) p.at.add(this.v.subVectors(this.eye, p.at).normalize().multiplyScalar(wide * 0.6));
          p.way.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(how.spread * Math.random());
          p.t = 0; p.life = r(how.life); p.rise = r(how.rise); p.size = r(how.size) * this.tall;
          p.spin = (Math.random() - 0.5) * 1.2;
          p.turn = Math.random() * Math.PI * 2;
          cloud.put(i, p.at, p.size, 0, p.turn);
        }
      });
      cloud.commit();
    }
  }

  /** The souls, each a streak along the last of its path up and round the tail, as the tail is now. */
  private wind(dt: number, shown: number): void {
    const head = this.at, before = this.w, across = this.ahead;
    this.souls.forEach((s, l) => {
      s.t += dt;
      if (s.t >= s.life) this.soul(s);
      const life = s.t / s.life;
      const fade = shown * SOULS.clear * Math.min(1, life * 5) * Math.min(1, (1 - life) * 3);
      for (let p = 0; p < SOULS.points; p++) {
        const share = p / (SOULS.points - 1);
        const t = Math.max(0, s.t - share * SOULS.streak);
        this.path(s, t, head);
        this.path(s, Math.max(0, t - 0.02), before);
        // Across the streak, square to its way and to the camera.
        const way = before.sub(head);
        if (this.seen) across.crossVectors(way, this.v.subVectors(this.eye, head)).normalize();
        else across.set(-way.z, 0, way.x).normalize();
        this.streaks.put(l, p, head, across, SOULS.wide * this.tall * (1 - share * 0.75), s.colour, fade * (1 - share));
      }
    });
    this.streaks.commit();
  }

  /** Where soul `s` is `t` into its life: up the tail and round it, further out as it rises off him. */
  private path(s: Soul, t: number, out: THREE.Vector3): THREE.Vector3 {
    const up = s.from + s.climb * t;
    const angle = s.angle + s.wind * t;
    const far = this.width(up) / 2 * s.out * (1 + Math.max(0, up - 1) * 2);
    return this.along(up, out).add(this.v.set(Math.cos(angle) * far, 0, Math.sin(angle) * far));
  }

  private glow(shown: number): void {
    this.body.getWorldQuaternion(this.turn);
    const ahead = this.ahead.set(0, 0, 1).applyQuaternion(this.turn).setY(0).normalize();
    const beat = 0.5 + 0.5 * Math.sin(this.time * BEAT * Math.PI);
    for (const { sprite, bone, how } of this.halos) {
      sprite.visible = !!bone && shown > 0.01;
      if (!bone) continue;
      bone.getWorldPosition(this.at);
      sprite.position.copy(this.at).addScaledVector(ahead, how.ahead * this.tall);
      sprite.position.y += how.up * this.tall;
      sprite.material.opacity = shown * (how.bright[0] + (how.bright[1] - how.bright[0]) * beat);
    }
  }
}
