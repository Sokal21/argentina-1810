import * as THREE from 'three';
import { flat } from './paint';
import { Billboards } from './billboards';

// The plague-dead soldier's retching (played on his scream: his head thrown forward, his mouth wide):
// a spray of sickly green thrown from his mouth, spreading in a cone before him, and where it falls a
// pool, broad, in the shape of that cone (cut off where the spray first comes down, a little before
// him), spreading out as it comes. The pool stays a while and dries away. Whoever stands in it is
// slowed (the game's to do, with `VOMIT`'s shape).

/**
 * The cone, shared with the game: from how far before him to how far it lies, and how wide it is at
 * its near end and at its far end (all shares of his height); when in his scream it is thrown and
 * until when (seconds); how long the pool lies before it dries, and how long it takes drying.
 */
export const VOMIT = { near: 0.4, reach: 2.4, wide: [0.75, 1.8], from: 0.55, to: 1.55, lies: 5, dries: 2.6 };
/** How wide the pool is (a share of his height) at a share `d` of the way from its near end to its far end. */
const wideAt = (d: number) => VOMIT.wide[0] + (VOMIT.wide[1] - VOMIT.wide[0]) * d;
/** The spray: how many drops kept, thrown a second, how fast, how big (a share of his height), how heavy; its colours. */
const SPRAY = { kept: 90, rate: 70, up: [-30, 40], size: [0.035, 0.07], fall: 420, colours: ['#7f9c2e', '#94b236', '#5f7a22'] };
/** The pool's colours: its body, its splashes, a few sickly bright spots; how thick it lies. */
const POOL = { body: '#4f6420', splash: '#728f2a', bright: '#a3cf3c', thick: 0.88 };

/** Its bubbles: how many kept, how many rise a second, how long one swells before it bursts, how big (a share of his height), their colour. */
const BUBBLES = { kept: 44, rate: 18, swell: [0.4, 0.9], size: [0.06, 0.13], colour: '#d2f070' };

/** A drop of the spray: where it is, its speed, how big. The drops are all one mesh (billboards.ts), each a copy of it by its index. */
interface Drop { at: THREE.Vector3; v: THREE.Vector3; size: number }
/** A bubble: where it is in the pool, how long it has swelled and how long it will, how big. One mesh too. */
interface Bubble { at: THREE.Vector3; t: number; life: number; size: number }

/**
 * The order the pool dries in, a grey for each point of it: patches here and there, its edges and
 * its ends sooner, its heart last. Where the grey is under how far it has dried, it is gone.
 */
let ordered: THREE.Texture | null = null;
function dryOrder(): THREE.Texture {
  if (ordered) return ordered;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const heart = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.6);
  heart.addColorStop(0, '#d0d0d0');
  heart.addColorStop(1, '#202020');
  g.fillStyle = heart;
  g.fillRect(0, 0, size, size);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    const v = Math.floor(rnd() * 255);
    g.fillStyle = `rgba(${v},${v},${v},0.35)`;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 2 + rnd() * 7, 0, Math.PI * 2);
    g.fill();
  }
  return ordered = new THREE.CanvasTexture(canvas);
}

/** A bubble's picture: a thin pale ring with a glint, clear within. */
let bubbled: THREE.Texture | null = null;
function bubble(): THREE.Texture {
  if (bubbled) return bubbled;
  const size = 16, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.arc(8, 8, 6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,1)';
  g.lineWidth = 2;
  g.beginPath(); g.arc(8, 8, 6, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ffffff';
  g.fillRect(5, 5, 2, 2);
  return bubbled = new THREE.CanvasTexture(canvas);
}

/** The pool's picture: the cut cone, its near end along the top (laid flat, the end toward him), blotched, ragged at its edges, thinning outward. */
let pooled: THREE.Texture | null = null;
function poolPicture(): THREE.Texture {
  if (pooled) return pooled;
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  // Seeded, so it is the same pool every time.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // How far out its edge lies at a share `d` of its length, on one side: rounded off at both ends
  // (as an ellipse's end), and ragged, unevenly on each side.
  const ragged = [0, 1].map(() => [1, 2, 3].map(() => [rnd() * 6.3, 3 + rnd() * 9]));
  const edge = (d: number, side: number) => {
    const rounded = Math.sqrt(Math.max(0, 1 - Math.abs(2 * d - 1) ** 2.4));
    const rag = ragged[side].reduce((sum, [phase, often], i) => sum + Math.sin(d * often + phase) * 0.09 / (i + 1), 0);
    return Math.max(0, rounded * (0.88 + rag));
  };
  const blob = (colour: string, n: number, big: [number, number], alpha: number, far = 1) => {
    g.fillStyle = colour;
    for (let i = 0; i < n; i++) {
      const d = rnd() * far, sideways = rnd() * 2 - 1;
      const across = sideways * edge(d, sideways < 0 ? 0 : 1) * (1 - 0.12 * rnd());
      const r = (big[0] + rnd() * (big[1] - big[0])) * (0.8 + 0.5 * d);
      g.globalAlpha = alpha * (1 - 0.4 * d);
      g.beginPath();
      g.arc(size / 2 + across * (wideAt(d) / VOMIT.wide[1]) * size * 0.45, 8 + d * (size - 16), r, 0, Math.PI * 2);
      g.fill();
    }
  };
  blob(POOL.body, 320, [6, 14], 0.95);
  blob(POOL.splash, 140, [3, 9], 0.9);
  blob(POOL.bright, 40, [1.5, 4], 0.85, 0.9);
  // Splashes thrown off past its edges, small.
  g.fillStyle = POOL.splash;
  for (let i = 0; i < 70; i++) {
    const d = rnd(), sideways = rnd() < 0.5 ? -1 : 1, past = 1 + 0.06 + rnd() * 0.18;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.arc(size / 2 + sideways * edge(d, sideways < 0 ? 0 : 1) * past * (wideAt(d) / VOMIT.wide[1]) * size * 0.45, 8 + d * (size - 16), 1 + rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return pooled = texture;
}

export class Vomit {
  readonly group = new THREE.Group();
  /** The pool, grown out from its near end: its pivot is there. */
  private readonly pivot = new THREE.Group();
  /** Turned his way, the pool on it at its near end. */
  private readonly turned = new THREE.Group();
  private readonly pool: THREE.Mesh;
  /** The spray's drops, drawn in one call; and the bubbles, in another. */
  private readonly spray = new Billboards(SPRAY.kept);
  private readonly drops: Drop[] = [];
  private readonly froth = new Billboards(BUBBLES.kept, bubble());
  private readonly bubbles: Bubble[] = [];
  /** How far it has dried, 0 to 1, as the pool's shader reads it. */
  private readonly dried = { value: 0 };
  private readonly mouth = new THREE.Vector3();
  private head: THREE.Object3D | null = null;
  private readonly ahead = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly lands = new THREE.Vector3();
  private time = -1;

  /** `body` is his model, already scaled; `tall` his height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    const long = tall * (VOMIT.reach - VOMIT.near), wide = tall * VOMIT.wide[1];
    const material = flat('#ffffff');
    Object.assign(material, { map: poolPicture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // Drying, it goes unevenly: wherever the order it dries in is under how far it has dried.
    const order = dryOrder();
    material.onBeforeCompile = shader => {
      shader.uniforms.dried = this.dried;
      shader.uniforms.order = { value: order };
      shader.fragmentShader = 'uniform float dried;\nuniform sampler2D order;\n' + shader.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n  if (texture2D(order, vMapUv).g < dried * 1.05) discard;');
    };
    material.customProgramCacheKey = () => 'vomit-pool';
    // As long as the pool and as wide as its far end, its near end (the top of its picture) laid at
    // the pivot and the rest along +Z.
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(wide, long).rotateX(-Math.PI / 2).translate(0, 0, long / 2), material);
    this.pool.receiveShadow = true;
    this.pivot.add(this.pool);
    this.pivot.position.y = 0.5;
    this.group.add(this.turned);
    this.turned.add(this.pivot);
    for (let i = 0; i < SPRAY.kept; i++) {
      this.spray.colour(i, SPRAY.colours[i % SPRAY.colours.length]);
      this.drops.push({ at: new THREE.Vector3(), v: new THREE.Vector3(), size: 0 });
    }
    this.group.add(this.spray.mesh);
    for (let i = 0; i < BUBBLES.kept; i++) {
      this.froth.colour(i, BUBBLES.colour);
      this.bubbles.push({ at: new THREE.Vector3(), t: 0, life: 0, size: 0 });
    }
    this.turned.add(this.froth.mesh);
    this.group.visible = false;
  }

  /** How long it all lasts, from his scream's start to the pool dried. */
  get lasts(): number {
    return VOMIT.to + VOMIT.lies + VOMIT.dries;
  }

  /** Starts it as his scream starts: the pool laid where he stands, the way he faces. */
  start(): void {
    this.time = 0;
    this.body.updateMatrixWorld(true);
    const at = this.body.getWorldPosition(new THREE.Vector3());
    this.group.position.set(at.x, 0, at.z);
    // Only the pool is turned his way: the drops are reckoned in the world's axes.
    this.turned.rotation.y = this.body.rotation.y;
    this.pivot.position.z = this.tall * VOMIT.near;
    this.pivot.scale.set(0.5, 1, 0.001);
    (this.pool.material as THREE.MeshToonMaterial).opacity = POOL.thick;
    this.dried.value = 0;
    this.spray.hideAll();
    this.froth.hideAll();
    this.spray.commit();
    this.froth.commit();
    this.head = this.body.getObjectByName('Head') ?? null;
    this.group.visible = true;
  }

  stop(): void {
    this.time = -1;
    this.group.visible = false;
  }

  update(dt: number): void {
    if (this.time < 0) return;
    this.time += dt;
    const t = this.time, tall = this.tall;
    if (t > this.lasts) { this.stop(); return; }
    // The pool spreads out from his feet while he retches, quickly at first.
    const k = Math.max(0, Math.min(1, (t - VOMIT.from - 0.1) / (VOMIT.to - VOMIT.from)));
    const grown = Math.max(0.001, 1 - (1 - k) ** 2);
    this.pivot.scale.set(0.5 + 0.5 * grown, 1, grown);
    const dry = Math.max(0, Math.min(1, (t - VOMIT.to - VOMIT.lies) / VOMIT.dries));
    this.dried.value = dry;
    this.bubble(dt, grown, dry);
    // The spray, from his mouth (a little before his head), into the cone.
    const ahead = this.ahead.set(Math.sin(this.turned.rotation.y), 0, Math.cos(this.turned.rotation.y));
    if (this.head) this.head.getWorldPosition(this.mouth).addScaledVector(ahead, tall * 0.06).sub(this.group.position);
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    if (t >= VOMIT.from && t < VOMIT.to) {
      for (let n = Math.round(SPRAY.rate * dt + Math.random()); n > 0; n--) {
        const i = this.spray.free();
        if (i < 0) break;
        const d = this.drops[i];
        // Each thrown to come down somewhere in the pool: its far part as the retching goes on.
        const along = Math.min(1, Math.random() * (0.4 + 0.8 * (t - VOMIT.from) / (VOMIT.to - VOMIT.from)));
        const across = (Math.random() - 0.5) * wideAt(along) * tall;
        const side = this.side.set(ahead.z, 0, -ahead.x);
        const lands = this.lands.copy(ahead).multiplyScalar(tall * (VOMIT.near + along * (VOMIT.reach - VOMIT.near))).addScaledVector(side, across);
        const up = r(SPRAY.up), h = Math.max(1, this.mouth.y);
        const flight = (up + Math.sqrt(up * up + 2 * SPRAY.fall * h)) / SPRAY.fall;
        d.v.set((lands.x - this.mouth.x) / flight, up, (lands.z - this.mouth.z) / flight);
        d.at.copy(this.mouth);
        d.size = tall * r(SPRAY.size);
        this.spray.put(i, d.at, d.size);
      }
    }
    this.drops.forEach((d, i) => {
      if (!this.spray.shown(i)) return;
      d.v.y -= SPRAY.fall * dt;
      d.at.addScaledVector(d.v, dt);
      if (d.at.y <= 0) this.spray.hide(i);
      else this.spray.put(i, d.at, d.size);
    });
    this.spray.commit();
  }

  /** Bubbles rising in the pool here and there, swelling and bursting; fewer as it dries. */
  private bubble(dt: number, grown: number, dry: number): void {
    const tall = this.tall, r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    if (grown > 0.2 && Math.random() < dt * BUBBLES.rate * (1 - dry)) {
      const i = this.froth.free();
      if (i >= 0) {
        const b = this.bubbles[i];
        // Somewhere well within it, as far as it has spread.
        const along = 0.1 + Math.random() * 0.8;
        b.at.set((Math.random() - 0.5) * wideAt(along) * tall * 0.7 * (0.5 + 0.5 * grown), 1.5,
          this.pivot.position.z + along * (VOMIT.reach - VOMIT.near) * tall * grown);
        b.t = 0; b.life = r(BUBBLES.swell); b.size = tall * r(BUBBLES.size);
        this.froth.put(i, b.at, 0);
      }
    }
    this.bubbles.forEach((b, i) => {
      if (!this.froth.shown(i)) return;
      b.t += dt;
      const k = b.t / b.life;
      // Swelling, then a last moment bursting: wider and gone.
      if (k >= 1.15) { this.froth.hide(i); return; }
      this.froth.put(i, b.at, b.size * (k < 1 ? Math.sqrt(k) : 1 + (k - 1) * 4), k < 1 ? 1 : 1 - (k - 1) / 0.15);
    });
    this.froth.commit();
  }
}
