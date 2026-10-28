import * as THREE from 'three';
import { flat } from './paint';

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
export const VOMIT = { near: 0.4, reach: 1.7, wide: [0.75, 1.7], from: 0.55, to: 1.55, lies: 5, dries: 1.5 };
/** How wide the pool is (a share of his height) at a share `d` of the way from its near end to its far end. */
const wideAt = (d: number) => VOMIT.wide[0] + (VOMIT.wide[1] - VOMIT.wide[0]) * d;
/** The spray: how many drops kept, thrown a second, how fast, how big (a share of his height), how heavy; its colours. */
const SPRAY = { kept: 90, rate: 70, up: [-30, 40], size: [0.035, 0.07], fall: 420, colours: ['#7f9c2e', '#94b236', '#5f7a22'] };
/** The pool's colours: its body, its splashes, a few sickly bright spots; how thick it lies. */
const POOL = { body: '#4f6420', splash: '#728f2a', bright: '#a3cf3c', thick: 0.88 };

interface Drop { sprite: THREE.Sprite; v: THREE.Vector3 }

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
  const blob = (colour: string, n: number, big: [number, number], alpha: number, far = 1) => {
    g.fillStyle = colour;
    for (let i = 0; i < n; i++) {
      const d = rnd() * far, across = (rnd() * 2 - 1) * (1 - 0.12 * rnd());
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
  private readonly drops: Drop[] = [];
  private readonly mouth = new THREE.Vector3();
  private time = -1;

  /** `body` is his model, already scaled; `tall` his height in the world's units. */
  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    const long = tall * (VOMIT.reach - VOMIT.near), wide = tall * VOMIT.wide[1];
    const material = flat('#ffffff');
    Object.assign(material, { map: poolPicture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // As long as the pool and as wide as its far end, its near end (the top of its picture) laid at
    // the pivot and the rest along +Z.
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(wide, long).rotateX(-Math.PI / 2).translate(0, 0, long / 2), material);
    this.pool.receiveShadow = true;
    this.pivot.add(this.pool);
    this.pivot.position.y = 0.5;
    this.group.add(this.turned);
    this.turned.add(this.pivot);
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
    this.turned.rotation.y = this.body.rotation.y;
    this.pivot.position.z = this.tall * VOMIT.near;
    this.pivot.scale.set(0.5, 1, 0.001);
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
    const grown = Math.max(0.001, 1 - (1 - k) ** 2);
    this.pivot.scale.set(0.5 + 0.5 * grown, 1, grown);
    const dry = (t - VOMIT.to - VOMIT.lies) / VOMIT.dries;
    (this.pool.material as THREE.MeshToonMaterial).opacity = POOL.thick * (dry > 0 ? 1 - dry : 1);
    // The spray, from his mouth (a little before his head), into the cone.
    const head = this.body.getObjectByName('Head');
    const ahead = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.turned.rotation.y);
    if (head) head.getWorldPosition(this.mouth).addScaledVector(ahead, tall * 0.06).sub(this.group.position);
    const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
    if (t >= VOMIT.from && t < VOMIT.to) {
      for (let n = Math.round(SPRAY.rate * dt + Math.random()); n > 0; n--) {
        const d = this.drops.find(x => !x.sprite.visible);
        if (!d) break;
        // Each thrown to come down somewhere in the pool: its far part as the retching goes on.
        const along = Math.min(1, Math.random() * (0.4 + 0.8 * (t - VOMIT.from) / (VOMIT.to - VOMIT.from)));
        const across = (Math.random() - 0.5) * wideAt(along) * tall;
        const side = new THREE.Vector3(ahead.z, 0, -ahead.x);
        const lands = ahead.clone().multiplyScalar(tall * (VOMIT.near + along * (VOMIT.reach - VOMIT.near))).addScaledVector(side, across);
        const up = r(SPRAY.up), h = Math.max(1, this.mouth.y);
        const flight = (up + Math.sqrt(up * up + 2 * SPRAY.fall * h)) / SPRAY.fall;
        d.v.set((lands.x - this.mouth.x) / flight, up, (lands.z - this.mouth.z) / flight);
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
