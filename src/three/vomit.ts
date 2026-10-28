import * as THREE from 'three';
import { flat } from './paint';

// The plague-dead soldier's retching (played on his scream: his head thrown forward, his mouth wide):
// a spray of sickly green thrown from his mouth, spreading in a cone before him, and where it falls a
// pool, broad, in the shape of that cone, spreading out from his feet as it comes. The pool stays a
// while and dries away. Whoever stands in it is slowed (the game's to do, with `VOMIT`'s cone).

/**
 * The cone, shared with the game: how far before him it reaches and how wide it opens (shares of his
 * height, and degrees); when in his scream it is thrown and until when (seconds); how long the pool
 * lies before it dries, and how long it takes drying.
 */
export const VOMIT = { reach: 1.5, angle: 70, from: 0.55, to: 1.55, lies: 5, dries: 1.5 };
/** The spray: how many drops kept, thrown a second, how fast, how big (a share of his height), how heavy; its colours. */
const SPRAY = { kept: 90, rate: 70, speed: [110, 210], size: [0.035, 0.07], fall: 420, colours: ['#7f9c2e', '#94b236', '#5f7a22'] };
/** The pool's colours: its body, its splashes, a few sickly bright spots; how thick it lies. */
const POOL = { body: '#4f6420', splash: '#728f2a', bright: '#a3cf3c', thick: 0.88 };

interface Drop { sprite: THREE.Sprite; v: THREE.Vector3 }

/** The pool's picture: the cone from its apex at the top middle (laid flat, that is the end at his feet), blotched, ragged at its edges, thinning outward. */
let pooled: THREE.Texture | null = null;
function poolPicture(): THREE.Texture {
  if (pooled) return pooled;
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const half = (VOMIT.angle / 2) * Math.PI / 180;
  // Seeded, so it is the same pool every time.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blob = (colour: string, n: number, big: [number, number], alpha: number, far = 1) => {
    g.fillStyle = colour;
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(rnd()) * far, a = (rnd() * 2 - 1) * half * (1 - 0.15 * d);
      const r = (big[0] + rnd() * (big[1] - big[0])) * (0.6 + 0.6 * d);
      g.globalAlpha = alpha * (1 - 0.45 * d);
      g.beginPath();
      g.arc(size / 2 + Math.sin(a) * d * size * 0.92, 4 + Math.cos(a) * d * size * 0.92, r, 0, Math.PI * 2);
      g.fill();
    }
  };
  blob(POOL.body, 260, [6, 14], 0.95);
  blob(POOL.splash, 120, [3, 9], 0.9);
  blob(POOL.bright, 40, [1.5, 4], 0.85, 0.9);
  g.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return pooled = texture;
}

export class Vomit {
  readonly group = new THREE.Group();
  /** The pool, grown out from his feet: its pivot is the cone's apex. */
  private readonly pivot = new THREE.Group();
  private readonly pool: THREE.Mesh;
  private readonly drops: Drop[] = [];
  private readonly mouth = new THREE.Vector3();
  private time = -1;

  /** `body` is his model, already scaled; `tall` his height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    const reach = tall * VOMIT.reach;
    const material = flat('#ffffff');
    Object.assign(material, { map: poolPicture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // A square the cone's reach on a side, its apex at the top middle of its picture, laid flat
    // with that apex at the pivot and the cone along +Z.
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(reach, reach).rotateX(-Math.PI / 2).translate(0, 0, reach / 2), material);
    this.pool.receiveShadow = true;
    this.pivot.add(this.pool);
    this.pivot.position.y = 0.5;
    this.group.add(this.pivot);
    for (let i = 0; i < SPRAY.kept; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: SPRAY.colours[i % SPRAY.colours.length] }));
      sprite.visible = false;
      this.group.add(sprite);
      this.drops.push({ sprite, v: new THREE.Vector3() });
    }
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
    this.pivot.rotation.y = this.body.rotation.y;
    this.pivot.scale.setScalar(0.001);
    (this.pool.material as THREE.MeshToonMaterial).opacity = POOL.thick;
    for (const d of this.drops) d.sprite.visible = false;
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
    this.pivot.scale.setScalar(Math.max(0.001, 1 - (1 - k) ** 2));
    const dry = (t - VOMIT.to - VOMIT.lies) / VOMIT.dries;
    (this.pool.material as THREE.MeshToonMaterial).opacity = POOL.thick * (dry > 0 ? 1 - dry : 1);
    // The spray, from his mouth (a little before his head), into the cone.
    const head = this.body.getObjectByName('Head');
    const ahead = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.pivot.rotation.y);
    if (head) head.getWorldPosition(this.mouth).addScaledVector(ahead, tall * 0.06).sub(this.group.position);
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    if (t >= VOMIT.from && t < VOMIT.to) {
      for (let n = Math.round(SPRAY.rate * dt + Math.random()); n > 0; n--) {
        const d = this.drops.find(x => !x.sprite.visible);
        if (!d) break;
        const a = (Math.random() * 2 - 1) * (VOMIT.angle / 2) * Math.PI / 180;
        const way = ahead.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
        d.v.copy(way).multiplyScalar(r(SPRAY.speed)).setY(r([-40, 30]));
        d.sprite.position.copy(this.mouth);
        d.sprite.scale.setScalar(tall * r(SPRAY.size));
        d.sprite.visible = true;
      }
    }
    for (const d of this.drops) {
      if (!d.sprite.visible) continue;
      d.v.y -= SPRAY.fall * dt;
      d.sprite.position.addScaledVector(d.v, dt);
      if (d.sprite.position.y <= 0) d.sprite.visible = false;
    }
  }
}
