import * as THREE from 'three';
import { Billboards } from './billboards';
import { unlitShader } from './pixels';

// What makes the Wekufe more than his model. His model ends a little under his waist (cut_below.py);
// below it he is a long gown of smoke and fire, as a lady's of old: narrow at his waist and flaring
// out in a bell to its hem just over the ground, swaying as his legs (bones under nothing now) swing.
// Its smoke is in layers: a black core filling it, a dark cloud about that, a grey haze outside,
// slower to go, at its hem smoke of many greys and blacks spreading over the ground and more lying on
// it about the hem, and at his waist
// a thick black band, so where his model ends is not seen. Tongues of
// black fire lick up from anywhere low on it, close along it as it narrows and bulging a little off it,
// waving, each soft at its root, widest a little above it and drawn out to a point, flaring and dying
// away, each drawn again over itself as a dodge so it stands out of the smoke, the more where they
// lie over one another; those on its far side dimmer, behind it. Souls wind up round it and off him, as black streaks,
// each fading along its length. He floats, rising and sinking a little. His claws tear red lines
// through the air along the very arc of his blow, throwing off sparks. He summons a cloud of lost
// souls, wailing faces going round him trailing black fire, a ring on the ground saying how far it hurts. Sinking, his smoke
// goes over his model, so the ground closing on him is not seen.
// He dives into the earth head first, sinking right under it; where his head goes in, the ground
// splashes black, drops thrown up and out and a black pool spreading, a cloud of black smoke bursts
// out low over the ground as dust would, and black fire bursts up; the smoke and the fire go together.
// The red of his eyes and of what burns within his belly glows past his body, beating slowly, as halos drawn over everything (his model's own red is lit by
// glow.py's light map, which shines only on itself).

/**
 * A layer of the smoke: how many puffs kept, how long one lasts, how fast it rises and spreads, how big
 * it starts (a share of his height) and how many times that it ends, its colours, how thick at most,
 * how far out from the gown's middle it is let off (a share of the gown's width there), and over which
 * stretch of the gown (0 its hem, 1 his waist; the whole of it if not said).
 */
interface Layer { kept: number; life: number[]; rise: number[]; spread: number; size: number[]; swell: number; colours: string[]; thick: number; out: number; up?: number[] }
const LAYERS: Layer[] = [
  { kept: 60, life: [0.5, 0.9], rise: [2, 6], spread: 4, size: [0.09, 0.14], swell: 1.5, colours: ['#050405', '#0a0809', '#0e0b0d'], thick: 0.4, out: 0.6 },
  { kept: 50, life: [0.9, 1.5], rise: [6, 12], spread: 8, size: [0.16, 0.26], swell: 1.8, colours: ['#0b090b', '#100d10', '#141114'], thick: 0.4, out: 1.1 },
  { kept: 24, life: [1.6, 2.6], rise: [8, 16], spread: 12, size: [0.26, 0.4], swell: 2.2, colours: ['#100e11', '#141215'], thick: 0.18, out: 1.6 },
  { kept: 48, life: [0.8, 2], rise: [-4, 8], spread: 18, size: [0.05, 0.24], swell: 2.4,
    colours: ['#000000', '#060507', '#0c0b0d', '#131114', '#1a181b', '#222024', '#2b282d', '#353238'], thick: 0.42, out: 1.4, up: [-0.08, 0.3] },
  // Lying on the ground about the hem, spreading slowly over it and hardly rising.
  { kept: 30, life: [1.6, 2.8], rise: [0, 3], spread: 16, size: [0.16, 0.3], swell: 2, colours: ['#050405', '#0c0a0d', '#141216', '#1c1a1e'], thick: 0.4, out: 1.3, up: [-0.14, 0.02] },
  // At his waist, thick, where his model ends: so the cut is not seen.
  { kept: 80, life: [0.5, 1.1], rise: [2, 8], spread: 3, size: [0.06, 0.12], swell: 1.5, colours: ['#030203', '#080608', '#0d0a0c', '#151215'], thick: 0.95, out: 0.75, up: [0.7, 1.1] },
];
/**
 * His gown: how far from his waist bone down to its hem (a share of his height), how wide at its waist
 * and at its hem (shares of his height), how sharply it flares toward the hem, and how much of his
 * legs' swing its hem takes.
 */
const GOWN = { long: 0.48, waist: 0.12, hem: 0.62, flare: 1.6, swing: 0.35 };
/**
 * The souls: how many at once, how long one lasts, how fast it climbs the gown (gowns a second) and
 * winds round it (radians a second), how far out (shares of the gown's width), how long its streak is
 * (seconds of its path), how wide (a share of his height), how clear at most, and their colours.
 */
const SOULS = { kept: 14, points: 18, life: [1.6, 2.6], climb: [0.45, 0.75], wind: [2.5, 4.2], out: [1.1, 1.9],
  streak: 0.4, wide: 0.024, clear: 0.85, colours: ['#000000', '#070607', '#0e0c0f', '#161318'] };
/**
 * The tongues of black fire: how many at once, points along each, how long one lasts, how far up the
 * gown from its hem one may start (a share of the gown), how long at its longest (a share of his height), how wide at its root (a share of his height), how far it waves to the side
 * at its tip (a share of its own height), how many waves along it and how fast they run up it, how
 * clear at its root, and their colours.
 */
const FLAMES = { kept: 44, points: 16, life: [0.4, 0.9], from: 0.35, tall: [0.22, 0.45], wide: [0.04, 0.08], wave: 0.3,
  waves: [1, 2], run: [7, 12], clear: 0.9, colours: ['#000000', '#050405', '#0a090b', '#100e11', '#18161a', '#211e23'] };
/**
 * His dive: from what share of the clip he sinks, how deep he goes by its end (in the model's units: it
 * is one unit tall), and how much longer than the clip he goes on sinking.
 */
const DIVE = { from: 0.4, deep: 1.6, after: 0.4, stays: 0, waist: false };
/**
 * His death, as his dive, writhing as he sinks: sinking from half his agony on, its splash as his waist
 * goes under (his dive's, as his head does); his fire and souls left where he was only as he starts to sink.
 */
const DEATH = { from: 0.5, deep: 1.8, after: 0.15, stays: 0.5, waist: true };
/**
 * The splash: its drops (how many, how fast out and up, shares of his height a second, how big, how
 * long they last at most), its pool (how wide it spreads, shares of his height, how long it lasts), and
 * the cloud of smoke that bursts out (how many puffs, how fast out and up, shares of his height a
 * second, how big at first and how many times that at last, how long they last, their colours, how
 * thick), and the fire that bursts up (how many tongues, how far out, how tall, how wide, how long each lasts at
 * most, and over how long its tongues are first lit).
 */
const SPLASH = {
  drops: 46, out: [0.3, 1.1], up: [0.6, 1.6], fall: 4, size: [0.012, 0.035], life: 1.4,
  colours: ['#000000', '#08070a', '#121014', '#1c191e'],
  /** How long the splash's smoke and fire last, both gone together, and how long they take to fade at its end. */
  lasts: 1.8, fades: 0.5,
  pool: { wide: 0.55, grow: 0.25, lasts: 1.8 },
  cloud: { puffs: 34, out: [0.5, 1.4], up: [0.05, 0.35], size: [0.12, 0.24], swell: 3, life: [2, 2.4],
    colours: ['#050405', '#0c0a0d', '#141216', '#1d1a1f', '#26222a'], thick: 0.85 },
  fire: { kept: 18, out: 0.18, tall: [0.3, 0.6], wide: [0.05, 0.1], life: [0.5, 1], kindles: 0.3 },
};
/**
 * What makes each tongue stand out of the smoke: drawn over it again, a little wider, as a dodge
 * (what is behind it brightened, many times over where tongues lie over one another and over the
 * smoke, nothing where there is only black): how much wider, by how much at most it brightens what
 * is behind (its colour: 1 doubles it), and the black tongue's own clearness under it.
 */
const DODGE = { colour: new THREE.Color(2.6, 0.45, 0.25), wider: 1.15, under: 0.55 };
/**
 * His claws' lines: the share of his `zarpazo` over which his hands strike (frames 22.5 to 27 of 51, as
 * measured: both swing at once; past them the hands turn back, and the lines would hook), the lines of each hand, how far past the hand their claws reach and how
 * far apart (shares of his height), how wide the line and its glow (shares of his height), how long they
 * last once struck and for how long of that the glow flares twice as wide, their colours and how bright
 * their glow. The sparks: how many, how fast (shares of his height a second), how big, how long they last.
 */
const CLAWS = {
  from: 22.5 / 51, to: 27 / 51, lines: 4, reach: 0.13, gap: 0.032, wide: 0.018, glow: 0.075, lasts: 0.42, flare: 0.1,
  colour: new THREE.Color('#ff1e0c'), glowing: new THREE.Color('#ff1404'), bright: 0.32,
  sparks: { kept: 36, fast: [0.5, 1.5], size: [0.008, 0.024], life: [0.2, 0.5], colour: '#ff3a14', gain: 1.5 },
};
/** How many places of each claw's path are kept, and how many points each line is drawn with. */
const CLAW_PATH = { kept: 40, points: 24 };
/**
 * The cloud of lost souls he summons: the share of his `invocar` at which they burst from him (his thrust,
 * frame 40 of 68, as measured), how long they last, grow out and fade (seconds), how many, the points of
 * each streak, how far round its path each streak reaches behind its head (radians), how fast they go round
 * (radians a second), how far out and how high (shares of his height, of `WRAITH_REACH`), how wide a streak
 * and how big a head (shares of his height). The ring on the ground says how far it hurts.
 */
const WRAITHS = { at: 40 / 68, lasts: 6, grows: 0.7, fades: 0.8, souls: 22, points: 14, trail: [0.7, 1.3], wind: [2.5, 3.9],
  out: [0.72, 1], high: [0.1, 0.85], bob: 0.06, wide: 0.05, head: [0.07, 0.1], clear: 0.9, ring: 0.4, colours: ['#000000', '#060507', '#0c0a0d'] };
/** How far out his cloud of souls hurts, a share of his height: the game's reckoning will take it from here. */
export const WRAITH_REACH = 0.95;
/** How high he floats and how far he rises and sinks (shares of his height), and how fast. */
const FLOAT = { high: 0.06, bob: 0.025, beat: 1.4 };
/**
 * His halos: on which bone, how far before it and up it (shares of his height), how wide (a share of
 * his height), how bright at least and at most, and how fast they beat.
 */
const HALOS = [
  { bone: 'Head', ahead: 0.05, up: 0.01, wide: 0.11, bright: [0.35, 0.5] },
  { bone: 'Spine01', ahead: 0.07, up: 0, wide: 0.24, bright: [0.12, 0.25] },
];
const BEAT = 2.2;
const RED = new THREE.Color('#ff3018');

/**
 * His smoke's puffs bubble: each swells and shrinks as it goes, by `boil` of its size at most, `beat`
 * times a second, and is drawn as a lump of round blobs, not one soft ball.
 */
const BOIL = { boil: [0.12, 0.35], beat: [0.35, 0.8] };

/** A puff of his smoke's picture: blobs of many sizes run together, each firm to near its edge. */
let lumped: THREE.Texture | null = null;
function lumps(): THREE.Texture {
  if (lumped) return lumped;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const blobs: number[][] = [[32, 34, 17], [20, 26, 11], [44, 24, 12], [24, 44, 10], [43, 44, 11], [32, 17, 9], [14, 36, 7], [51, 35, 7], [35, 51, 8]];
  for (const [x, y, r] of blobs) {
    const firm = g.createRadialGradient(x, y, 0, x, y, r);
    firm.addColorStop(0, 'rgba(255,255,255,0.95)');
    firm.addColorStop(0.7, 'rgba(255,255,255,0.8)');
    firm.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = firm;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return lumped = new THREE.CanvasTexture(canvas);
}

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

interface Puff { at: THREE.Vector3; way: THREE.Vector3; t: number; life: number; rise: number; size: number; spin: number; turn: number; boil: number; beat: number; power: number }
interface Flame { t: number; life: number; up: number; angle: number; out: number; tall: number; wide: number; waves: number; run: number; phase: number; colour: THREE.Color }
interface Soul { t: number; life: number; from: number; climb: number; angle: number; wind: number; out: number; colour: THREE.Color }

const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);

/** The souls' streaks: ribbons turned to the camera, clear at their head and fading along them. */
class Streaks {
  readonly mesh: THREE.Mesh;
  private readonly at: THREE.BufferAttribute;
  private readonly tint: THREE.BufferAttribute;

  /** `dodge`: brightening what is behind it, by its colour times its clearness (as a dodge does), rather than laid over it. `lit`: added to what is behind it, as light is. */
  constructor(lines: number, private readonly points: number, dodge = false, lit = false) {
    const geometry = new THREE.BufferGeometry();
    this.at = new THREE.BufferAttribute(new Float32Array(lines * points * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.tint = new THREE.BufferAttribute(new Float32Array(lines * points * 2 * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.at);
    geometry.setAttribute('tint', this.tint);
    // Which edge of its ribbon a corner is on: a lit one fades to both.
    const edge = new Float32Array(lines * points * 2);
    for (let v = 0; v < edge.length; v++) edge[v] = v % 2 ? 1 : -1;
    geometry.setAttribute('edge', new THREE.BufferAttribute(edge, 1));
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
        attribute vec4 tint; attribute float edge; varying vec4 vTint; varying float vEdge;
        void main() { vTint = tint; vEdge = edge; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: unlitShader(`
        varying vec4 vTint; varying float vEdge;
        void main() { gl_FragColor = ${dodge ? 'vec4(vTint.rgb * vTint.a, 1.0)' : lit ? 'vec4(vTint.rgb, vTint.a * pow(1.0 - abs(vEdge), 1.5))' : 'vTint'}; }`),
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      // A dodge: what is behind times one and what is drawn.
      ...(dodge ? { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.OneFactor } : {}),
      ...(lit ? { blending: THREE.AdditiveBlending } : {}),
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

interface Drop { at: THREE.Vector3; way: THREE.Vector3; t: number; size: number; life: number; spin: number; boil: number; beat: number }

/** The black splash where he goes into the earth: drops thrown up and out, a pool spreading, black fire bursting up. */
class Splash {
  readonly group = new THREE.Group();
  private readonly drops: Billboards;
  private readonly flying: Drop[] = [];
  private readonly pool: THREE.Mesh;
  private readonly smoke: Billboards;
  private readonly puffs: Drop[] = [];
  private readonly fire: Streaks;
  private readonly dodges: Streaks;
  private readonly flames: Flame[] = [];
  private readonly where = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly across = new THREE.Vector3();
  private readonly eye = new THREE.Vector3();
  private seen = false;
  private time = 0;
  /** Since it splashed. */
  private since = 0;
  /** Whether it is splashing: until it does, and once it is over, it costs nothing. */
  private going = false;

  constructor(private readonly tall: number) {
    this.drops = new Billboards(SPLASH.drops, soft(0.6));
    for (let i = 0; i < SPLASH.drops; i++) {
      this.drops.colour(i, SPLASH.colours[i % SPLASH.colours.length]);
      this.flying.push({ at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, size: 0, life: 0, spin: 0, boil: 0, beat: 0 });
    }
    this.group.add(this.drops.mesh);
    const cloud = SPLASH.cloud;
    // Bubbling as his own smoke does.
    this.smoke = new Billboards(cloud.puffs, lumps());
    (this.smoke.mesh.material as THREE.ShaderMaterial).depthTest = false;
    for (let i = 0; i < cloud.puffs; i++) {
      this.smoke.colour(i, cloud.colours[i % cloud.colours.length]);
      this.puffs.push({ at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, size: 0, life: 0, spin: 0, boil: 0, beat: 0 });
    }
    this.group.add(this.smoke.mesh);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { map: { value: soft(0.55) }, clear: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: unlitShader(`
        uniform sampler2D map; uniform float clear; varying vec2 vUv;
        void main() { gl_FragColor = vec4(0.02, 0.015, 0.02, texture2D(map, vUv).a * clear); }`),
      transparent: true, depthWrite: false,
    }));
    this.pool.visible = false;
    this.group.add(this.pool);
    this.fire = new Streaks(SPLASH.fire.kept, FLAMES.points);
    this.fire.mesh.renderOrder = 1;
    this.fire.mesh.onBeforeRender = (_r, _s, camera) => { this.eye.setFromMatrixPosition(camera.matrixWorld); this.seen = true; };
    this.group.add(this.fire.mesh);
    // Its fire stands out as his own does: each tongue drawn again over itself as a red dodge.
    this.dodges = new Streaks(SPLASH.fire.kept, FLAMES.points, true);
    this.dodges.mesh.renderOrder = 2;
    this.group.add(this.dodges.mesh);
    this.fire.mesh.visible = this.dodges.mesh.visible = false;
    for (let i = 0; i < SPLASH.fire.kept; i++) {
      this.flames.push({ t: 0, life: 0, up: 0, angle: 0, out: 0, tall: 0, wide: 0, waves: 0, run: 0, phase: 0, colour: new THREE.Color() });
    }
  }

  /** Splashes at `at`, on the ground. */
  start(at: THREE.Vector3): void {
    this.where.copy(at);
    this.since = 0;
    this.going = this.fire.mesh.visible = this.dodges.mesh.visible = true;
    const t = this.tall;
    this.flying.forEach((d, i) => {
      const a = Math.random() * Math.PI * 2, out = r(SPLASH.out) * t;
      d.at.copy(at);
      d.way.set(Math.cos(a) * out, r(SPLASH.up) * t, Math.sin(a) * out);
      d.t = 0;
      d.size = r(SPLASH.size) * t;
      this.drops.put(i, d.at, d.size, 1);
    });
    const cloud = SPLASH.cloud;
    this.puffs.forEach((d, i) => {
      const a = Math.random() * Math.PI * 2, out = r(cloud.out) * t;
      d.at.copy(at).setY(at.y + r(cloud.size) * t * 0.3);
      d.way.set(Math.cos(a) * out, r(cloud.up) * t, Math.sin(a) * out);
      d.t = 0;
      d.life = r(cloud.life);
      d.size = r(cloud.size) * t;
      d.spin = (Math.random() - 0.5) * 1.5;
      d.boil = r(BOIL.boil);
      d.beat = r(BOIL.beat);
      this.smoke.put(i, d.at, d.size, 0, Math.random() * Math.PI * 2);
    });
    this.flames.forEach((f, i) => this.light(f, -i / SPLASH.fire.kept * SPLASH.fire.kindles));
    this.pool.position.copy(at).setY(at.y + 0.3);
    this.pool.visible = true;
  }

  /** A tongue of the burst lit, `t` into its life (below 0: not yet lit). */
  private light(f: Flame, t: number): void {
    const fire = SPLASH.fire;
    f.life = r(fire.life);
    f.t = t;
    f.angle = Math.random() * Math.PI * 2;
    f.out = Math.sqrt(Math.random()) * fire.out;
    f.tall = r(fire.tall);
    f.wide = r(fire.wide);
    f.waves = r(FLAMES.waves);
    f.run = r(FLAMES.run);
    f.phase = Math.random() * Math.PI * 2;
    f.colour.set(FLAMES.colours[Math.floor(Math.random() * FLAMES.colours.length)]);
  }

  update(dt: number): void {
    if (!this.going) return;
    this.time += dt;
    this.since += dt;
    const t = this.tall, ground = this.where.y;
    this.flying.forEach((d, i) => {
      if (!this.drops.shown(i)) return;
      d.t += dt;
      if (d.t >= SPLASH.life) { this.drops.hide(i); return; }
      d.way.y -= SPLASH.fall * t * dt;
      d.at.addScaledVector(d.way, dt);
      // Fallen back, it lies where it fell, fading.
      if (d.at.y <= ground) { d.at.y = ground + 0.5; d.way.set(0, 0, 0); }
      this.drops.put(i, d.at, d.size, 1 - Math.pow(d.t / SPLASH.life, 3));
    });
    this.drops.commit();
    // The smoke and the fire fade out together at the splash's end.
    const ends = Math.min(1, Math.max(0, (SPLASH.lasts - this.since) / SPLASH.fades));
    // The cloud: thrown out fast and slowing, rising a little, swelling and thinning away.
    const cloud = SPLASH.cloud;
    this.puffs.forEach((d, i) => {
      if (!this.smoke.shown(i)) return;
      d.t += dt;
      const k = d.t / d.life;
      if (k >= 1 || ends <= 0) { this.smoke.hide(i); return; }
      d.way.multiplyScalar(Math.exp(-2.5 * dt));
      d.at.addScaledVector(d.way, dt);
      d.at.y += 0.06 * t * dt;
      this.smoke.put(i, d.at, d.size * (1 + (cloud.swell - 1) * (1 - Math.pow(1 - k, 2))) * (1 + d.boil * Math.sin(d.t * d.beat * Math.PI * 2)), cloud.thick * ends * Math.min(1, k * 8) * (1 - 0.6 * k), d.t * d.spin);
    });
    this.smoke.commit();
    const pool = SPLASH.pool, k = this.since / pool.lasts;
    this.pool.visible = k < 1;
    if (k < 1) {
      this.pool.scale.setScalar(t * pool.wide * (1 - Math.pow(1 - Math.min(1, this.since / pool.grow), 2)));
      (this.pool.material as THREE.ShaderMaterial).uniforms.clear.value = 0.9 * (1 - k * k);
    }
    const across = this.across;
    // Relit up to the end, so the fire is still burning as it fades with the smoke.
    if (this.seen) across.subVectors(this.eye, this.where).setY(0).normalize().cross(this.at.set(0, 1, 0));
    else across.set(1, 0, 0);
    this.flames.forEach((f, l) => {
      f.t += dt;
      if (f.t >= f.life && this.since < SPLASH.lasts) this.light(f, 0);
      const life = f.t / f.life;
      // Not lit yet (or never: before any splash), or burnt out.
      const lit = !f.life || f.t < 0 || life >= 1 ? 0 : Math.sin(Math.PI * Math.pow(life, 0.6)) * ends;
      const tall = f.tall * t * lit;
      for (let p = 0; p < FLAMES.points; p++) {
        const q = p / (FLAMES.points - 1);
        const sway = Math.sin(q * f.waves * Math.PI * 2 - this.time * f.run + f.phase) * FLAMES.wave * tall * q;
        this.at.set(this.where.x + Math.cos(f.angle) * f.out * t, ground + q * tall, this.where.z + Math.sin(f.angle) * f.out * t).addScaledVector(across, sway);
        // Pointed at its root as at its tip, as his own tongues are.
        const body = Math.sin(Math.PI / 2 * Math.min(1, q / 0.3)) * Math.pow(1 - q, 0.8);
        const wide = f.wide * t * body * (0.5 + 0.5 * lit), clear = lit * Math.min(1, q / 0.15) * (1 - q * q);
        this.fire.put(l, p, this.at, across, wide, f.colour, FLAMES.clear * DODGE.under * clear);
        this.dodges.put(l, p, this.at, across, wide * DODGE.wider, DODGE.colour, clear);
      }
    });
    this.fire.commit();
    this.dodges.commit();
    // Over: its drops, pool and smoke already gone, and its fire faded with the smoke.
    if (this.since >= SPLASH.lasts) this.going = this.fire.mesh.visible = this.dodges.mesh.visible = false;
  }
}

/** A lost soul's face: a red head, two burning eyes and a dark mouth open in a wail. */
let wailing: THREE.Texture | null = null;
function wail(): THREE.Texture {
  if (wailing) return wailing;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#a81a0a';
  g.beginPath(); g.ellipse(16, 15, 10, 13, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffc070';
  g.beginPath(); g.ellipse(11.5, 12, 2.4, 3, 0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(20.5, 12, 2.4, 3, -0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a0503';
  g.beginPath(); g.ellipse(16, 21, 3, 4.5, 0, 0, Math.PI * 2); g.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return wailing = texture;
}

interface Wraith { angle: number; wind: number; out: number; high: number; phase: number; trail: number; head: number; colour: THREE.Color }

/** The cloud of lost souls he summons: faces wailing round him, each trailing a streak of black fire, a ring on the ground saying how far it hurts. */
class Wraiths {
  readonly group = new THREE.Group();
  private readonly streaks: Streaks;
  private readonly dodges: Streaks;
  private readonly heads: Billboards;
  private readonly ring: THREE.Mesh;
  private readonly souls: Wraith[] = [];
  private readonly middle = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  private readonly way = new THREE.Vector3();
  private readonly across = new THREE.Vector3();
  private readonly toEye = new THREE.Vector3();
  /** His summoning: its clip's length and how far into it; then how long since they burst out. */
  private calling: { seconds: number; t: number } | null = null;
  private since = -1;
  private time = 0;

  constructor(private readonly body: THREE.Object3D, private readonly tall: number, private readonly eye: THREE.Vector3) {
    this.streaks = new Streaks(WRAITHS.souls, WRAITHS.points);
    this.dodges = new Streaks(WRAITHS.souls, WRAITHS.points, true);
    this.streaks.mesh.renderOrder = 1;
    this.dodges.mesh.renderOrder = 2;
    this.heads = new Billboards(WRAITHS.souls, wail());
    this.heads.mesh.renderOrder = 3;
    for (let i = 0; i < WRAITHS.souls; i++) {
      this.heads.colour(i, '#ffffff');
      this.souls.push({
        angle: i / WRAITHS.souls * Math.PI * 2 + Math.random() * 0.4, wind: r(WRAITHS.wind), out: r(WRAITHS.out), high: r(WRAITHS.high),
        phase: Math.random() * Math.PI * 2, trail: r(WRAITHS.trail), head: r(WRAITHS.head),
        colour: new THREE.Color(WRAITHS.colours[i % WRAITHS.colours.length]),
      });
    }
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.965, 1, 96).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { clear: { value: 0 } },
      vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: unlitShader('uniform float clear; void main() { gl_FragColor = vec4(0.8, 0.07, 0.03, clear); }'),
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    // Under his smoke and all, on the ground.
    this.ring.renderOrder = -2;
    this.group.add(this.ring, this.streaks.mesh, this.dodges.mesh, this.heads.mesh);
    this.show(false);
  }

  private show(on: boolean): void {
    this.ring.visible = this.streaks.mesh.visible = this.dodges.mesh.visible = on;
    if (!on) { this.heads.hideAll(); this.heads.commit(); }
  }

  /** He summons them: his `invocar`, `seconds` long, has just begun. */
  summon(seconds: number): void {
    this.calling = { seconds, t: 0 };
    this.since = -1;
    this.show(false);
  }

  /** Gone at once. */
  stop(): void {
    this.calling = null;
    this.since = -1;
    this.show(false);
  }

  update(dt: number): void {
    if (this.calling) {
      this.calling.t += dt;
      if (this.calling.t / this.calling.seconds >= WRAITHS.at) { this.calling = null; this.since = 0; this.show(true); }
    }
    if (this.since < 0) return;
    this.since += dt;
    this.time += dt;
    const end = WRAITHS.lasts + WRAITHS.fades;
    if (this.since >= end) { this.stop(); return; }
    const t = this.tall, grown = 1 - Math.pow(1 - Math.min(1, this.since / WRAITHS.grows), 3);
    const fade = Math.min(1, (end - this.since) / WRAITHS.fades);
    // Round him as he goes, a little behind him; let off at his waist's height at first, spreading.
    this.body.getWorldPosition(this.at);
    if (this.since === dt) this.middle.copy(this.at);
    else this.middle.lerp(this.at, Math.min(1, dt * 5));
    const ground = this.at.y, reach = WRAITH_REACH * t;
    this.ring.position.set(this.middle.x, ground + 0.4, this.middle.z);
    this.ring.scale.setScalar(Math.max(0.001, reach * grown));
    (this.ring.material as THREE.ShaderMaterial).uniforms.clear.value = fade * WRAITHS.ring * (0.75 + 0.25 * Math.sin(this.time * 5));
    this.souls.forEach((soul, l) => {
      soul.angle += soul.wind * dt;
      for (let p = 0; p < WRAITHS.points; p++) {
        const q = p / (WRAITHS.points - 1);
        this.place(soul, soul.angle - q * soul.trail, grown, reach, ground, this.at);
        this.place(soul, soul.angle - (q + 0.05) * soul.trail, grown, reach, ground, this.next);
        this.way.subVectors(this.at, this.next);
        this.across.crossVectors(this.way, this.toEye.subVectors(this.eye, this.at)).normalize();
        const wide = WRAITHS.wide * t * Math.pow(1 - q, 0.9), clear = fade * WRAITHS.clear * (1 - q * q) * grown;
        this.streaks.put(l, p, this.at, this.across, wide, soul.colour, clear * DODGE.under);
        this.dodges.put(l, p, this.at, this.across, wide * DODGE.wider, DODGE.colour, clear);
        if (p === 0) this.heads.put(l, this.at, soul.head * t, fade * grown);
      }
    });
    this.streaks.commit();
    this.dodges.commit();
    this.heads.commit();
  }

  /** Where a soul is at a place round its path: wavering in and out, up and down, as it goes. */
  private place(soul: Wraith, angle: number, grown: number, reach: number, ground: number, out: THREE.Vector3): void {
    const far = reach * soul.out * grown * (1 + 0.06 * Math.sin(angle * 3 + soul.phase));
    const high = (0.45 + (soul.high - 0.45) * grown + WRAITHS.bob * Math.sin(angle * 2 + soul.phase + this.time * 2)) * this.tall;
    out.set(this.middle.x + Math.cos(angle) * far, ground + high, this.middle.z + Math.sin(angle) * far);
  }
}

/** Where along a path (`places`, `count` of them) a share of it falls, smoothed through them (Catmull-Rom): a blow this quick is only a few frames. */
function smoothed(places: THREE.Vector3[], count: number, share: number, out: THREE.Vector3): THREE.Vector3 {
  const at = share * (count - 1), i = Math.min(Math.floor(at), count - 2), u = at - i;
  const a = places[Math.max(0, i - 1)], b = places[i], c = places[i + 1], d = places[Math.min(count - 1, i + 2)];
  const u2 = u * u, u3 = u2 * u;
  const ka = -0.5 * u3 + u2 - 0.5 * u, kb = 1.5 * u3 - 2.5 * u2 + 1, kc = -1.5 * u3 + 2 * u2 + 0.5 * u, kd = 0.5 * u3 - 0.5 * u2;
  return out.set(a.x * ka + b.x * kb + c.x * kc + d.x * kd, a.y * ka + b.y * kb + c.y * kc + d.y * kd, a.z * ka + b.z * kb + c.z * kc + d.z * kd);
}

/** The red lines his claws tear through the air along the arc of his blow, and the sparks they throw. */
class Claws {
  readonly group = new THREE.Group();
  private readonly lines: Streaks;
  private readonly glows: Streaks;
  private readonly sparks: Billboards;
  private readonly flying: Drop[] = [];
  /** Each hand: its bones, where its claws have been. */
  private readonly hands: { hand: THREE.Object3D; arm: THREE.Object3D; path: THREE.Vector3[]; count: number; was: THREE.Vector3 }[] = [];
  /** How long his blow is, how far into it he is, and how long since it was struck. */
  private blow: { seconds: number; t: number; since: number } | null = null;
  private readonly tip = new THREE.Vector3();
  private readonly elbow = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  private readonly way = new THREE.Vector3();
  private readonly across = new THREE.Vector3();
  private readonly apart = new THREE.Vector3();

  /** `eye` is where the camera is, kept up to date by whoever is drawn. */
  constructor(body: THREE.Object3D, private readonly tall: number, private readonly eye: THREE.Vector3) {
    for (const side of ['L_', 'R_']) {
      const hand = body.getObjectByName(side + 'Hand'), arm = body.getObjectByName(side + 'Forearm');
      if (!hand || !arm) continue;
      this.hands.push({ hand, arm, path: Array.from({ length: CLAW_PATH.kept }, () => new THREE.Vector3()), count: 0, was: new THREE.Vector3() });
    }
    const many = this.hands.length * CLAWS.lines;
    this.glows = new Streaks(many, CLAW_PATH.points, false, true);
    this.lines = new Streaks(many, CLAW_PATH.points);
    this.glows.mesh.renderOrder = 3;
    this.lines.mesh.renderOrder = 4;
    this.glows.mesh.visible = this.lines.mesh.visible = false;
    this.sparks = new Billboards(CLAWS.sparks.kept, soft(0.6), true);
    for (let i = 0; i < CLAWS.sparks.kept; i++) {
      this.sparks.colour(i, CLAWS.sparks.colour, CLAWS.sparks.gain);
      this.flying.push({ at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, size: 0, life: 0, spin: 0, boil: 0, beat: 0 });
    }
    this.group.add(this.glows.mesh, this.lines.mesh, this.sparks.mesh);
  }

  /** He strikes: his blow, `seconds` long, has just begun. */
  strike(seconds: number): void {
    this.blow = { seconds, t: 0, since: -1 };
    for (const h of this.hands) h.count = 0;
    this.glows.mesh.visible = this.lines.mesh.visible = false;
  }

  /** No blow: whatever is in the air goes. */
  stop(): void {
    this.blow = null;
    this.glows.mesh.visible = this.lines.mesh.visible = false;
  }

  update(dt: number): void {
    this.fly(dt);
    const blow = this.blow;
    // Held (paused): no new place of its claws, or they pile up where they stand.
    if (!blow || dt <= 0) return;
    blow.t += dt;
    const share = blow.t / blow.seconds;
    if (share < CLAWS.from) return;
    if (share <= CLAWS.to) this.follow();
    else if (blow.since < 0) blow.since = 0;
    else blow.since += dt;
    if (blow.since >= CLAWS.lasts) { this.stop(); return; }
    this.draw(blow.since);
  }

  /** Where each hand's claws are now, and a spark or two thrown off them the way they go. */
  private follow(): void {
    for (const h of this.hands) {
      h.hand.getWorldPosition(this.tip);
      h.arm.getWorldPosition(this.elbow);
      this.way.subVectors(this.tip, this.elbow).normalize();
      this.tip.addScaledVector(this.way, CLAWS.reach * this.tall);
      if (h.count) {
        const moved = this.way.subVectors(this.tip, h.was);
        this.throwOff(this.tip, moved);
      }
      h.was.copy(this.tip);
      if (h.count < CLAW_PATH.kept) h.path[h.count++].copy(this.tip);
    }
  }

  private throwOff(from: THREE.Vector3, moved: THREE.Vector3): void {
    const how = CLAWS.sparks, t = this.tall;
    for (let n = 0; n < 2; n++) {
      const i = this.sparks.free();
      if (i < 0) return;
      const d = this.flying[i], fast = r(how.fast) * t;
      d.at.copy(from);
      d.way.copy(moved).normalize().multiplyScalar(fast);
      d.way.x += (Math.random() - 0.5) * fast;
      d.way.y += (Math.random() - 0.5) * fast;
      d.way.z += (Math.random() - 0.5) * fast;
      d.t = 0;
      d.life = r(how.life);
      d.size = r(how.size) * t;
      this.sparks.put(i, d.at, d.size, 1);
    }
  }

  private fly(dt: number): void {
    const t = this.tall;
    this.flying.forEach((d, i) => {
      if (!this.sparks.shown(i)) return;
      d.t += dt;
      if (d.t >= d.life) { this.sparks.hide(i); return; }
      d.way.multiplyScalar(Math.exp(-3 * dt));
      d.way.y -= 1.5 * t * dt;
      d.at.addScaledVector(d.way, dt);
      this.sparks.put(i, d.at, d.size * (1 - d.t / d.life * 0.5), 1 - Math.pow(d.t / d.life, 2));
    });
    this.sparks.commit();
  }

  /** The lines as far as they have gone: pointed at both ends, thinning and draining from where they began once struck. */
  private draw(since: number): void {
    const t = this.tall, gone = Math.max(0, since) / CLAWS.lasts;
    const flare = since >= 0 && since < CLAWS.flare ? 2 : 1;
    const last = CLAW_PATH.points - 1;
    let shown = false;
    let line = 0;
    for (const h of this.hands) {
      if (h.count >= 2) shown = true;
      for (let c = 0; c < CLAWS.lines; c++, line++) {
        // Side by side, as claws are: square to the blow as the camera sees it, the outer ones shorter.
        const off = (c - (CLAWS.lines - 1) / 2) * CLAWS.gap * t;
        const short = 0.05 * Math.abs(c - (CLAWS.lines - 1) / 2);
        for (let p = 0; p <= last; p++) {
          const u = p / last;
          if (h.count < 2) { this.lines.put(line, p, this.at.copy(h.was), this.across.set(1, 0, 0), 0, CLAWS.colour, 0); this.glows.put(line, p, this.at, this.across, 0, CLAWS.glowing, 0); continue; }
          const along = short + u * (1 - 2 * short);
          smoothed(h.path, h.count, along, this.at);
          // Its way there: measured backward at its very end, where there is nothing ahead (or the claws tangle).
          if (along + 0.02 <= 1) this.way.subVectors(smoothed(h.path, h.count, along + 0.02, this.next), this.at);
          else this.way.subVectors(this.at, smoothed(h.path, h.count, along - 0.02, this.next));
          this.across.crossVectors(this.way, this.apart.subVectors(this.eye, this.at)).normalize();
          this.at.addScaledVector(this.across, off);
          // Pointed at both ends; drained from its start as it goes.
          const body = Math.pow(Math.sin(Math.PI * u), 0.6);
          const drained = u < gone ? 0 : 1;
          const clear = drained * (1 - gone * gone);
          this.lines.put(line, p, this.at, this.across, CLAWS.wide * t * body * (1 - gone * 0.6), CLAWS.colour, clear);
          this.glows.put(line, p, this.at, this.across, CLAWS.glow * t * body * flare, CLAWS.glowing, CLAWS.bright * clear * body);
        }
      }
    }
    this.lines.commit();
    this.glows.commit();
    this.lines.mesh.visible = this.glows.mesh.visible = shown;
  }
}

export class Wekufe {
  readonly group = new THREE.Group();
  /** All his smoke, one mesh, drawn in one call, layer after layer; each layer's puffs from `first` on. */
  private readonly cloud: Billboards;
  private readonly layers: { how: Layer; first: number; puffs: Puff[] }[] = [];
  private readonly streaks: Streaks;
  private readonly souls: Soul[] = [];
  private readonly tongues: Streaks;
  private readonly dodges: Streaks;
  private readonly flames: Flame[] = [];
  private readonly halos: { sprite: THREE.Sprite; bone: THREE.Object3D | undefined; how: (typeof HALOS)[number] }[] = [];
  /** What of the model floats: everything under its root, so the root keeps the place the game gives it. */
  private readonly floats: THREE.Object3D[];
  /** His waist bone, then his legs' (thighs, calves, feet, two by two): the gown hangs from the one and swings with the others. */
  private readonly bones: (THREE.Object3D | undefined)[][];
  /** The gown's middle line this frame, his waist first, its hem last. */
  private readonly line = [0, 1, 2, 3, 4].map(() => new THREE.Vector3());
  /** Where the camera was when last drawn: the streaks and tongues are turned to it. */
  private readonly eye = new THREE.Vector3();
  private seen = false;
  private readonly at = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly w = new THREE.Vector3();
  private time = Math.random() * 10;
  /** How much of him is shown, eased: going into the earth his gown's smoke, fire and souls fade out slowly rather than all at once. */
  private faded = 1;
  /** How fast it fades out and comes back, a second. */
  private static readonly FADE = { out: 1.1, back: 6 };
  /** From 0 (gone) to 1. */
  power = 1;
  /** His splash where he goes into the earth. */
  private readonly splash: Splash;
  /** The lines his claws tear. */
  private readonly claws: Claws;
  /** The lost souls he summons. */
  private readonly wraiths: Wraiths;
  /** His dive: how long the clip is, how far into it he is; null while he is not diving. */
  private diving: { seconds: number; t: number; splashed: boolean; how: typeof DIVE } | null = null;
  /** Where his gown was as he began to dive: its fire and souls stay there, burning out, as he goes under. */
  private readonly stayed = [0, 1, 2, 3, 4].map(() => new THREE.Vector3());
  private staying = false;
  private readonly ground = new THREE.Vector3();

  /** `body` is his model, already scaled, `tall` its height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    this.floats = [...body.children];
    // A shadow himself, he casts none.
    body.traverse(node => { node.castShadow = false; });
    this.splash = new Splash(tall);
    this.group.add(this.splash.group);
    this.claws = new Claws(body, tall, this.eye);
    this.group.add(this.claws.group);
    this.wraiths = new Wraiths(body, tall, this.eye);
    this.group.add(this.wraiths.group);
    const bone = (name: string) => body.getObjectByName(name);
    this.bones = [[bone('Waist')], ...['Thigh', 'Calf', 'Foot'].map(b => [bone('L_' + b), bone('R_' + b)])];
    this.cloud = new Billboards(LAYERS.reduce((all, how) => all + how.kept, 0), lumps());
    this.group.add(this.cloud.mesh);
    let first = 0;
    for (const how of LAYERS) {
      const puffs: Puff[] = [];
      for (let i = 0; i < how.kept; i++) {
        this.cloud.colour(first + i, how.colours[i % how.colours.length]);
        puffs.push({ at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, life: 0, rise: 0, size: 0, spin: 0, turn: 0, boil: 0, beat: 0, power: 0 });
      }
      this.layers.push({ how, first, puffs });
      first += how.kept;
    }
    this.streaks = new Streaks(SOULS.kept, SOULS.points);
    this.streaks.mesh.onBeforeRender = (_r, _s, camera) => { this.eye.setFromMatrixPosition(camera.matrixWorld); this.seen = true; };
    this.group.add(this.streaks.mesh);
    this.tongues = new Streaks(FLAMES.kept, FLAMES.points);
    // Drawn after the smoke, so the smoke in the gown does not hide them.
    this.tongues.mesh.renderOrder = 1;
    this.group.add(this.tongues.mesh);
    this.dodges = new Streaks(FLAMES.kept, FLAMES.points, true);
    this.dodges.mesh.renderOrder = 2;
    this.group.add(this.dodges.mesh);
    for (let i = 0; i < FLAMES.kept; i++) {
      this.flames.push({ t: 0, life: 0, up: 0, angle: 0, out: 0, tall: 0, wide: 0, waves: 0, run: 0, phase: 0, colour: new THREE.Color() });
      this.flame(this.flames[i], Math.random());
    }
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

  /** A soul set off again from low on the gown, `into` that share of its life already. */
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

  /** A tongue lit again low on the gown, more of them nearer the hem, `into` that share of its life already. */
  private flame(f: Flame, into = 0): void {
    f.life = r(FLAMES.life);
    f.t = into * f.life;
    // Some from under the hem, the rest anywhere low on the gown: their roots at no one height.
    f.up = Math.random() * (FLAMES.from + 0.12) - 0.12;
    f.angle = Math.random() * Math.PI * 2;
    f.out = Math.random() * 0.5;
    f.tall = r(FLAMES.tall);
    f.wide = r(FLAMES.wide);
    f.waves = r(FLAMES.waves);
    f.run = r(FLAMES.run);
    f.phase = Math.random() * Math.PI * 2;
    f.colour.set(FLAMES.colours[Math.floor(Math.random() * FLAMES.colours.length)]);
  }

  /** The gown's middle line, its waist first, its hem last: straight down from his waist, its hem swung as his legs swing. */
  private lay(): void {
    const [waist, ...legs] = this.bones;
    const top = this.line[0];
    if (waist[0]) waist[0].getWorldPosition(top);
    // Where his feet are, against his waist: so far the hem is swung.
    const feet = this.v.set(0, 0, 0);
    let n = 0;
    for (const b of legs[legs.length - 1]) if (b) { feet.add(b.getWorldPosition(this.side)); n++; }
    if (n) feet.divideScalar(n).sub(top).multiplyScalar(GOWN.swing);
    const hem = this.line[4].set(top.x + feet.x, top.y - GOWN.long * this.tall, top.z + feet.z);
    for (let i = 1; i < 4; i++) this.line[i].lerpVectors(top, hem, i / 4);
  }

  /** The point `up` along the gown's middle (0 its hem, 1 his waist), and past his waist, rising off him. */
  private along(up: number, out: THREE.Vector3): THREE.Vector3 {
    if (up >= 1) return out.copy(this.line[0]).setY(this.line[0].y + (up - 1) * this.tall * 0.6);
    const k = Math.max(0, 1 - up) * (this.line.length - 1), i = Math.min(Math.floor(k), this.line.length - 2);
    return out.lerpVectors(this.line[i], this.line[i + 1], k - i);
  }

  /** The gown's width `up` along it: flaring out more and more toward its hem. */
  private width(up: number): number {
    const u = Math.min(1, Math.max(0, up));
    return this.tall * (GOWN.waist + (GOWN.hem - GOWN.waist) * Math.pow(1 - u, GOWN.flare));
  }

  /** He dives into the earth, playing his dive (`seconds` long), and stays under it until he `rises`. */
  dive(seconds: number): void {
    this.diving = { seconds, t: 0, splashed: false, how: DIVE };
    this.staying = false;
  }

  /** He dies, playing his agony (`seconds` long): he sinks into the earth writhing, and it splashes as he dives. */
  dies(seconds: number): void {
    this.diving = { seconds, t: 0, splashed: false, how: DEATH };
    this.staying = false;
  }

  /** He summons his lost souls, playing his `invocar` (`seconds` long). */
  invoke(seconds: number): void {
    this.wraiths.summon(seconds);
  }

  /** His lost souls gone at once. */
  uninvoke(): void {
    this.wraiths.stop();
  }

  /** He strikes with his claws, playing his `zarpazo` (`seconds` long). */
  claw(seconds: number): void {
    this.claws.strike(seconds);
  }

  /** Not striking: what his claws tore goes. */
  unclaw(): void {
    this.claws.stop();
  }

  /** Back out of the earth, floating. */
  rises(): void {
    this.diving = null;
  }

  update(dt: number): void {
    this.time += dt;
    let shown = this.body.parent && this.body.visible ? this.power : 0;
    // Each child is moved in the root's units: the model is one unit tall.
    let high = FLOAT.high + FLOAT.bob * Math.sin(this.time * FLOAT.beat * Math.PI);
    const dive = this.diving;
    const sinking = !!dive && dive.t / dive.seconds >= dive.how.from;
    if (dive) {
      dive.t += dt;
      const k = Math.min(1, Math.max(0, (dive.t / dive.seconds - dive.how.from) / (1 + dive.how.after - dive.how.from)));
      high -= dive.how.deep * k * k;
    }
    for (const o of this.floats) o.position.y = high;
    this.body.updateWorldMatrix(true, true);
    this.lay();
    // The ground is where his root stands. Going under, his smoke, souls and fire go with him.
    this.body.getWorldPosition(this.ground);
    if (dive) {
      const head = this.halos[0].bone;
      if (dive.how.waist) this.at.copy(this.line[0]);
      else if (head) head.getWorldPosition(this.at);
      if (head && !dive.splashed && this.at.y <= this.ground.y + this.tall * 0.04) {
        dive.splashed = true;
        this.splash.start(this.at.setY(this.ground.y));
      }
      shown *= Math.min(1, Math.max(0, (this.line[0].y - this.ground.y) / (this.tall * 0.25)));
    }
    this.splash.update(dt);
    this.claws.update(dt);
    this.wraiths.update(dt);
    const ease = shown < this.faded ? Wekufe.FADE.out : Wekufe.FADE.back;
    this.faded += (shown - this.faded) * Math.min(1, dt * ease);
    // Sinking, his smoke is drawn over him, hiding the ground closing on him; and let off where he went in,
    // not under the ground with him, where it would now be seen through it.
    (this.cloud.mesh.material as THREE.ShaderMaterial).depthTest = !sinking;
    if (sinking && this.staying) this.line.forEach((p, i) => p.copy(this.stayed[i]));
    // His halos under it then, or their red shows through.
    for (const { sprite } of this.halos) sprite.renderOrder = sinking ? -1 : 10;
    this.smoke(dt, this.faded);
    // Diving, his fire and souls are left where his gown was as he began: they do not go up and down with him.
    if (dive && dive.t / dive.seconds >= dive.how.stays) {
      if (!this.staying) { this.stayed.forEach((p, i) => p.copy(this.line[i])); this.staying = true; }
      this.line.forEach((p, i) => p.copy(this.stayed[i]));
    }
    // Faded past seeing, under the earth, his fire and souls cost nothing.
    const there = this.faded > 0.05;
    this.streaks.mesh.visible = this.tongues.mesh.visible = this.dodges.mesh.visible = there;
    if (there) {
      this.wind(dt, this.faded);
      this.lick(dt, this.faded);
    }
    this.glow(shown);
  }

  private smoke(dt: number, shown: number): void {
    const cloud = this.cloud;
    for (const { how, first, puffs } of this.layers) {
      const rate = how.kept / ((how.life[0] + how.life[1]) / 2);
      puffs.forEach((p, n) => {
        const i = first + n;
        if (cloud.shown(i)) {
          p.t += dt;
          const k = p.t / p.life;
          if (k >= 1) { cloud.hide(i); return; }
          p.at.addScaledVector(p.way, dt);
          p.at.y += p.rise * dt;
          p.turn += p.spin * dt;
          const bubbling = 1 + p.boil * Math.sin(p.t * p.beat * Math.PI * 2);
          cloud.put(i, p.at, p.size * (1 + (how.swell - 1) * k) * bubbling, how.thick * p.power * Math.min(1, k * 4) * (1 - k * k), p.turn);
        } else if (shown > 0.05 && Math.random() < dt * rate * shown) {
          // Each puff as thick as he was shown when it was let off: left behind as he goes under, it lives out its life.
          p.power = shown;
          // Anywhere along it, more of the core low where the gown is widest.
          const up = how.up ? r(how.up) : how === LAYERS[0] ? Math.pow(Math.random(), 1.3) : Math.random() * 1.05;
          const wide = this.width(up);
          const a = Math.random() * Math.PI * 2, out = Math.sqrt(Math.random()) * how.out * wide / 2;
          this.along(up, p.at);
          p.at.x += Math.cos(a) * out;
          p.at.z += Math.sin(a) * out;
          p.way.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(how.spread * Math.random());
          p.t = 0; p.life = r(how.life); p.rise = r(how.rise); p.size = r(how.size) * this.tall;
          p.spin = (Math.random() - 0.5) * 1.2;
          p.boil = r(BOIL.boil);
          p.beat = r(BOIL.beat);
          p.turn = Math.random() * Math.PI * 2;
          cloud.put(i, p.at, p.size, 0, p.turn);
        }
      });
    }
    cloud.commit();
  }

  /** The souls, each a streak along the last of its path up and round the gown, as the gown is now. */
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

  /** The tongues: each rising from its root low on the gown, waving more toward its tip, flaring up and dying down. */
  private lick(dt: number, shown: number): void {
    const at = this.at, across = this.ahead, side = this.side, way = this.w;
    this.flames.forEach((f, l) => {
      f.t += dt;
      if (f.t >= f.life) this.flame(f);
      const life = f.t / f.life;
      // Up quick, then down slower: as long as it is lit.
      const lit = Math.sin(Math.PI * Math.pow(life, 0.6));
      const tall = f.tall * this.tall * lit;
      side.set(Math.cos(f.angle), 0, Math.sin(f.angle));
      // On the gown's far side, dimmer: behind it.
      const back = this.seen ? 0.65 + 0.35 * Math.max(-1, Math.min(1, side.dot(this.v.subVectors(this.eye, this.line[0]).setY(0).normalize()) * 2)) : 1;
      for (let p = 0; p < FLAMES.points; p++) {
        const q = p / (FLAMES.points - 1);
        // Up from its root low on the gown, close along it as it narrows.
        const up = f.up + q * tall / (GOWN.long * this.tall);
        // Bulging a little off the gown along its middle, so it is seen to stand round it.
        this.along(up, at).addScaledVector(side, this.width(up) / 2 * (0.85 + f.out * 0.4 + 0.18 * Math.sin(Math.PI * q)));
        if (p === 0) way.set(0, 1, 0);
        // Waving across it as the camera sees it, so the wave is seen.
        if (this.seen) across.crossVectors(way, this.v.subVectors(this.eye, at)).normalize();
        else across.set(-side.z, 0, side.x);
        at.addScaledVector(across, Math.sin(q * f.waves * Math.PI * 2 - this.time * f.run + f.phase) * FLAMES.wave * tall * q);
        // Soft at its root, widest a little above it, drawn out to its point.
        // A point at its root too, rounding out to its widest a little above it, then drawn out to its tip.
        const body = Math.sin(Math.PI / 2 * Math.min(1, q / 0.3)) * Math.pow(1 - q, 0.8);
        const wide = f.wide * this.tall * body * (0.5 + 0.5 * lit), clear = shown * lit * back * Math.min(1, q / 0.15) * (1 - q * q);
        this.tongues.put(l, p, at, across, wide, f.colour, FLAMES.clear * DODGE.under * clear);
        this.dodges.put(l, p, at, across, wide * DODGE.wider, DODGE.colour, clear);
      }
    });
    this.tongues.commit();
    this.dodges.commit();
  }

  /** Where soul `s` is `t` into its life: up the gown and round it, further out as it rises off him. */
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
      if (this.at.y < this.ground.y) sprite.visible = false;
      sprite.position.copy(this.at).addScaledVector(ahead, how.ahead * this.tall);
      sprite.position.y += how.up * this.tall;
      sprite.material.opacity = shown * (how.bright[0] + (how.bright[1] - how.bright[0]) * beat);
    }
  }
}
