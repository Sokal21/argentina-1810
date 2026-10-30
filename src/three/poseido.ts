import * as THREE from 'three';
import { Billboards } from './billboards';
import { flat } from './paint';
import { DODGE, lumps, soft, Streaks } from './wekufe';

// The plague-dead soldier with the Wekufe in him (docs/personajes/apestado_poseido.md): the same model
// and clips, what was green in him gone red and the rest of him nearly black; two broken ram's horns
// through his kepi, two red eyes, black smoke and black fire coming off his shoulders and back.

/** What is kept of his colours, and the red of what shone green in him. */
const BURNT = { kept: new THREE.Color(0.42, 0.36, 0.4), lift: 34, sore: new THREE.Color('#ff2a12') };
/** A horn: the points of its middle (shares of his height, from his head bone, one side), how thick at its root and at its end. */
const HORNS = {
  whole: [[0.04, 0.095, 0], [0.09, 0.115, -0.012], [0.135, 0.145, -0.022], [0.16, 0.195, -0.012], [0.158, 0.24, 0.018]],
  broken: [[0.04, 0.095, 0], [0.09, 0.115, -0.012], [0.122, 0.14, -0.02]],
  root: 0.024, end: 0.005, colour: '#2a2022',
};
/** His eyes: how far apart, up and ahead of his head bone, how wide (shares of his height), how bright at most and at least. */
const EYES = { apart: 0.024, up: 0.072, ahead: 0.09, wide: 0.03, bright: [1, 0.65], beat: 1.4 };
/** The bones the smoke comes off, how much of it, how long a puff lasts, how fast it rises, how big (shares of his height) and its colours. */
const SMOKE = { bones: ['L_Clavicle', 'R_Clavicle', 'Spine02', 'L_Upperarm', 'R_Upperarm'], kept: 46, life: [0.7, 1.4], rise: [0.05, 0.14], out: 0.07,
  size: [0.05, 0.11], swell: 2, thick: 0.6, colours: ['#050405', '#0c0a0d', '#141216', '#1d1a1f'] };
/** The tongues of black fire: how many, points along each, how long one lasts, how tall and wide (shares of his height), how far they wave. */
const TONGUES = { kept: 14, points: 12, life: [0.35, 0.8], tall: [0.13, 0.26], wide: [0.02, 0.04], wave: 0.3, run: [7, 12], clear: 0.9 };

interface Puff { at: THREE.Vector3; way: THREE.Vector3; t: number; life: number; size: number; spin: number }
interface Tongue { bone: THREE.Object3D | undefined; off: THREE.Vector3; t: number; life: number; tall: number; wide: number; run: number; phase: number }

const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);

/** A copy of a texture with each of its pixels changed: red, green, blue (0 to 255), and whether what shines is lit there. */
function repainted(was: THREE.Texture, change: (px: Uint8ClampedArray, i: number) => void): THREE.CanvasTexture {
  const image = was.image as ImageBitmap, canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const g = canvas.getContext('2d')!;
  g.drawImage(image, 0, 0);
  const data = g.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) change(data.data, i);
  g.putImageData(data, 0, 0);
  const made = new THREE.CanvasTexture(canvas);
  made.flipY = was.flipY;
  made.colorSpace = was.colorSpace;
  made.channel = was.channel;
  made.minFilter = was.minFilter;
  made.magFilter = was.magFilter;
  return made;
}

/** The body blackened and its green shine turned red: both its pictures painted anew from what shines. */
function burn(body: THREE.Object3D): void {
  body.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const material = node.material as THREE.MeshToonMaterial;
    const shine = material.lightMap;
    let lit: Uint8ClampedArray | null = null;
    if (shine) {
      material.lightMap = repainted(shine, (px, i) => {
        const on = px[i] + px[i + 1] + px[i + 2] > 30;
        px[i] = on ? BURNT.sore.r * 255 : 0;
        px[i + 1] = on ? BURNT.sore.g * 255 : 0;
        px[i + 2] = on ? BURNT.sore.b * 255 : 0;
      });
      const image = material.lightMap.image as HTMLCanvasElement;
      lit = image.getContext('2d')!.getImageData(0, 0, image.width, image.height).data;
    }
    if (material.map) material.map = repainted(material.map, (px, i) => {
      if (lit && lit[i] > 0) { px[i] = BURNT.sore.r * 255; px[i + 1] = BURNT.sore.g * 255; px[i + 2] = BURNT.sore.b * 255; return; }
      px[i] = px[i] * BURNT.kept.r + BURNT.lift;
      px[i + 1] = px[i + 1] * BURNT.kept.g + BURNT.lift;
      px[i + 2] = px[i + 2] * BURNT.kept.b + BURNT.lift;
    });
    material.needsUpdate = true;
  });
}

/** A horn from its middle's points, tapering, on the side `side` (1 his left, -1 his right), in his height's shares. */
function horn(points: number[][], side: number, tall: number): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x * side * tall, y * tall, z * tall)));
  const rings = 14, round = 6, geometry = new THREE.TubeGeometry(curve, rings, 1, round);
  const at = geometry.getAttribute('position'), v = new THREE.Vector3(), mid = new THREE.Vector3();
  for (let ring = 0; ring <= rings; ring++) {
    const q = ring / rings;
    curve.getPointAt(q, mid);
    const thick = (HORNS.root + (HORNS.end - HORNS.root) * q) * tall;
    for (let p = 0; p <= round; p++) {
      const i = ring * (round + 1) + p;
      v.fromBufferAttribute(at, i).sub(mid).multiplyScalar(thick).add(mid);
      at.setXYZ(i, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, flat(HORNS.colour));
  mesh.castShadow = true;
  return mesh;
}

export class Possessed {
  readonly group = new THREE.Group();
  private readonly cloud = new Billboards(SMOKE.kept, lumps());
  private readonly puffs: Puff[] = [];
  private readonly bones: THREE.Object3D[];
  private readonly tongues = new Streaks(TONGUES.kept, TONGUES.points);
  private readonly dodges = new Streaks(TONGUES.kept, TONGUES.points, true);
  private readonly flames: Tongue[] = [];
  private readonly eyes: THREE.Sprite[] = [];
  private time = 0;
  private readonly at = new THREE.Vector3();
  private readonly across = new THREE.Vector3();
  private readonly camera = new THREE.Vector3();
  private seen = false;

  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    burn(body);
    this.bones = SMOKE.bones.map(name => body.getObjectByName(name)).filter((b): b is THREE.Object3D => !!b);
    const head = body.getObjectByName('Head');
    if (head) {
      // Held by his head, set out as he stands at rest: so upright, and facing as he does.
      body.updateMatrixWorld(true);
      const held = new THREE.Group();
      head.getWorldPosition(held.position);
      held.add(horn(HORNS.whole, 1, tall), horn(HORNS.broken, -1, tall));
      for (const side of [1, -1]) {
        const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(0.25), color: BURNT.sore, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
        eye.renderOrder = 10;
        eye.position.set(EYES.apart * side * tall, EYES.up * tall, EYES.ahead * tall);
        eye.scale.setScalar(EYES.wide * tall);
        held.add(eye);
        this.eyes.push(eye);
      }
      this.group.add(held);
      head.attach(held);
    }
    this.group.add(this.cloud.mesh);
    for (let i = 0; i < SMOKE.kept; i++) {
      this.cloud.colour(i, SMOKE.colours[i % SMOKE.colours.length]);
      const puff = { at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, life: 0, size: 0, spin: 0 };
      this.puffs.push(puff);
      this.let(puff, Math.random());
    }
    this.tongues.mesh.renderOrder = 1;
    this.dodges.mesh.renderOrder = 2;
    this.tongues.mesh.onBeforeRender = (_r, _s, camera) => { this.camera.setFromMatrixPosition(camera.matrixWorld); this.seen = true; };
    this.group.add(this.tongues.mesh, this.dodges.mesh);
    for (let i = 0; i < TONGUES.kept; i++) {
      const flame: Tongue = { bone: undefined, off: new THREE.Vector3(), t: 0, life: 0, tall: 0, wide: 0, run: 0, phase: 0 };
      this.flames.push(flame);
      this.kindle(flame, Math.random());
    }
  }

  /** A puff let off one of his bones, `into` that share of its life already. */
  private let(puff: Puff, into = 0): void {
    const bone = this.bones[Math.floor(Math.random() * this.bones.length)];
    if (bone) bone.getWorldPosition(puff.at);
    const out = SMOKE.out * this.tall, angle = Math.random() * Math.PI * 2;
    puff.at.x += Math.cos(angle) * out * Math.random();
    puff.at.z += Math.sin(angle) * out * Math.random();
    puff.way.set(Math.cos(angle) * out * 0.5, r(SMOKE.rise) * this.tall, Math.sin(angle) * out * 0.5);
    puff.life = r(SMOKE.life);
    puff.t = into * puff.life;
    puff.size = r(SMOKE.size) * this.tall;
    puff.spin = Math.random() * Math.PI * 2;
  }

  private kindle(f: Tongue, into = 0): void {
    f.bone = this.bones[Math.floor(Math.random() * this.bones.length)];
    const angle = Math.random() * Math.PI * 2, out = Math.random() * SMOKE.out * this.tall;
    f.off.set(Math.cos(angle) * out, 0, Math.sin(angle) * out);
    f.life = r(TONGUES.life);
    f.t = into * f.life;
    f.tall = r(TONGUES.tall) * this.tall;
    f.wide = r(TONGUES.wide) * this.tall;
    f.run = r(TONGUES.run);
    f.phase = Math.random() * Math.PI * 2;
  }

  update(dt: number): void {
    this.time += dt;
    const shown = !!this.body.parent && this.body.visible;
    this.group.visible = shown;
    if (!shown) return;
    const beat = 0.5 + 0.5 * Math.sin(this.time * EYES.beat * Math.PI);
    // Drawn through his brow, which would hide them; so not when he looks away.
    for (const eye of this.eyes) {
      eye.getWorldPosition(this.at);
      eye.parent!.getWorldDirection(this.across);
      eye.visible = !this.seen || this.across.dot(this.camera.clone().sub(this.at)) > 0;
      eye.material.opacity = EYES.bright[1] + (EYES.bright[0] - EYES.bright[1]) * beat;
    }
    this.puffs.forEach((puff, i) => {
      puff.t += dt;
      if (puff.t >= puff.life) this.let(puff);
      puff.at.addScaledVector(puff.way, dt);
      const q = puff.t / puff.life;
      this.cloud.put(i, puff.at, puff.size * (1 + (SMOKE.swell - 1) * q), SMOKE.thick * Math.sin(Math.PI * Math.min(1, q * 1.2 + 0.05)), puff.spin);
    });
    this.cloud.commit();
    this.lick(dt);
  }

  /** The tongues, each rising from his shoulders and back, waving more toward its tip, flaring up and dying down. */
  private lick(dt: number): void {
    const { at, across } = this, up = new THREE.Vector3(0, 1, 0), root = new THREE.Vector3(), black = new THREE.Color('#050405');
    this.flames.forEach((f, l) => {
      f.t += dt;
      if (f.t >= f.life) this.kindle(f);
      const life = f.t / f.life, lit = Math.sin(Math.PI * Math.pow(life, 0.6)), tall = f.tall * lit;
      f.bone?.getWorldPosition(root);
      root.add(f.off);
      for (let p = 0; p < TONGUES.points; p++) {
        const q = p / (TONGUES.points - 1);
        at.copy(root).addScaledVector(up, q * tall);
        if (this.seen) across.crossVectors(up, this.camera.clone().sub(at)).normalize();
        else across.set(1, 0, 0);
        at.addScaledVector(across, Math.sin(q * Math.PI * 2 - this.time * f.run + f.phase) * TONGUES.wave * tall * q);
        const wide = f.wide * Math.sin(Math.PI / 2 * Math.min(1, q / 0.3)) * Math.pow(1 - q, 0.8) * (0.5 + 0.5 * lit);
        const clear = lit * Math.min(1, q / 0.15) * (1 - q * q);
        this.tongues.put(l, p, at, across, wide, black, TONGUES.clear * DODGE.under * clear);
        this.dodges.put(l, p, at, across, wide * DODGE.wider, DODGE.colour, clear);
      }
    });
    this.tongues.commit();
    this.dodges.commit();
  }
}
