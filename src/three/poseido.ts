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

/**
 * Being possessed, as shares of his agony: over when the black cloud climbs him, when it wraps him thickest, when he is changed under it, and when it has gone;
 * how big he is before it (a share of what he comes to), and its puffs: how many, how far out, how tall they climb, how fast they go round him, how big, how thick.
 */
const POSSESSION = { climbs: [0.08, 0.42], thickest: [0.46, 0.58], changes: 0.52, gone: 0.9, small: 0.8,
  kept: 120, out: [0.12, 0.36], high: 0.95, round: [1.4, 3.2], size: [0.1, 0.22], thick: 0.96, colours: ['#000000', '#040304', '#080608', '#0d0b0e', '#141216'],
  /** The tongues of black fire licking up through the cloud: how many, how long each lasts, how tall and wide, over which shares of his agony they burn, how clear the black and its red within it (on a pale ground more red reads as red fire, not black). */
  fire: { kept: 30, points: 14, life: [0.35, 0.8], tall: [0.28, 0.6], wide: [0.05, 0.1], burns: [0.12, 0.92], black: 0.97, red: 0.3 } };

interface Wrap { up: number; angle: number; out: number; round: number; size: number; spin: number; bob: number }

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

/** Paints the body blackened with its green shine turned red, both its pictures anew from what shines, and returns how to show him so or as he was. */
function burn(body: THREE.Object3D): (burnt: boolean) => void {
  const swaps: ((burnt: boolean) => void)[] = [];
  body.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const material = node.material as THREE.MeshToonMaterial;
    const shine = material.lightMap, was = material.map;
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
    const light = material.lightMap, map = material.map;
    swaps.push(burnt => {
      material.lightMap = burnt ? light : shine;
      material.map = burnt ? map : was;
    });
  });
  return burnt => { for (const swap of swaps) swap(burnt); };
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
  private readonly show: (burnt: boolean) => void;
  /** What is his only once he is possessed: his horns and eyes, his smoke and fire. */
  private readonly held = new THREE.Group();
  private readonly aura = new THREE.Group();
  private readonly wrap = new Billboards(POSSESSION.kept, lumps());
  private readonly wraps: Wrap[] = [];
  private readonly size: number;
  private possessing: { t: number; seconds: number } | null = null;
  private readonly fire = new Streaks(POSSESSION.fire.kept, POSSESSION.fire.points);
  private readonly fireDodges = new Streaks(POSSESSION.fire.kept, POSSESSION.fire.points, true);
  private readonly fires: Tongue[] = [];

  constructor(private readonly body: THREE.Object3D, private readonly tall: number) {
    this.show = burn(body);
    this.size = body.scale.x;
    this.bones = SMOKE.bones.map(name => body.getObjectByName(name)).filter((b): b is THREE.Object3D => !!b);
    const head = body.getObjectByName('Head');
    if (head) {
      // Held by his head, set out as he stands at rest: so upright, and facing as he does.
      body.updateMatrixWorld(true);
      const held = this.held;
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
    this.group.add(this.aura, this.wrap.mesh);
    this.aura.add(this.cloud.mesh);
    this.wrap.mesh.renderOrder = 3;
    for (let i = 0; i < POSSESSION.kept; i++) {
      this.wrap.colour(i, POSSESSION.colours[i % POSSESSION.colours.length]);
      this.wraps.push({ up: Math.random(), angle: Math.random() * Math.PI * 2, out: r(POSSESSION.out), round: r(POSSESSION.round) * (i % 2 ? 1 : -1), size: r(POSSESSION.size), spin: Math.random() * Math.PI * 2, bob: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < SMOKE.kept; i++) {
      this.cloud.colour(i, SMOKE.colours[i % SMOKE.colours.length]);
      const puff = { at: new THREE.Vector3(), way: new THREE.Vector3(), t: 0, life: 0, size: 0, spin: 0 };
      this.puffs.push(puff);
      this.let(puff, Math.random());
    }
    this.tongues.mesh.renderOrder = 1;
    this.dodges.mesh.renderOrder = 2;
    this.tongues.mesh.onBeforeRender = (_r, _s, camera) => { this.camera.setFromMatrixPosition(camera.matrixWorld); this.seen = true; };
    this.aura.add(this.tongues.mesh, this.dodges.mesh);
    this.fire.mesh.renderOrder = 4;
    this.fireDodges.mesh.renderOrder = 5;
    this.fire.mesh.visible = this.fireDodges.mesh.visible = false;
    this.group.add(this.fire.mesh, this.fireDodges.mesh);
    for (let i = 0; i < POSSESSION.fire.kept; i++) {
      const flame: Tongue = { bone: undefined, off: new THREE.Vector3(), t: 0, life: 0, tall: 0, wide: 0, run: 0, phase: 0 };
      this.fires.push(flame);
      this.light(flame, Math.random());
    }
    for (let i = 0; i < TONGUES.kept; i++) {
      const flame: Tongue = { bone: undefined, off: new THREE.Vector3(), t: 0, life: 0, tall: 0, wide: 0, run: 0, phase: 0 };
      this.flames.push(flame);
      this.kindle(flame, Math.random());
    }
  }

  /** The Wekufe comes into him, over his agony of `seconds`: from as he was, in a black cloud climbing and wrapping him, to changed. */
  possess(seconds: number): void {
    this.possessing = { t: 0, seconds };
    this.changed(false);
  }

  /** Shown as already possessed. */
  possessed(): void {
    this.possessing = null;
    this.changed(true);
    this.body.scale.setScalar(this.size);
    for (let i = 0; i < POSSESSION.kept; i++) this.wrap.hide(i);
    this.wrap.commit();
    this.fire.mesh.visible = this.fireDodges.mesh.visible = false;
  }

  private changed(burnt: boolean): void {
    this.show(burnt);
    this.held.visible = this.aura.visible = burnt;
  }

  private possession(dt: number): void {
    const being = this.possessing;
    if (!being) return;
    being.t += dt;
    const q = being.t / being.seconds, { climbs, thickest, changes, gone, small } = POSSESSION;
    const climbed = Math.min(1, Math.max(0, (q - climbs[0]) / (climbs[1] - climbs[0])));
    const growth = Math.min(1, Math.max(0, (q - climbs[1]) / (thickest[1] - climbs[1])));
    this.body.scale.setScalar(this.size * (small + (1 - small) * growth));
    if (q >= changes && !this.held.visible) this.changed(true);
    // Thin at first, thickest about him, then thinning away from his head down.
    const thin = q < thickest[0] ? 0.4 + 0.2 * climbed + 0.4 * Math.max(0, (q - climbs[1]) / (thickest[0] - climbs[1])) : q < thickest[1] ? 1 : Math.max(0, (gone - q) / (gone - thickest[1]));
    this.body.getWorldPosition(this.at);
    this.wraps.forEach((w, i) => {
      w.angle += w.round * dt;
      const up = Math.min(1, w.up * POSSESSION.high), reach = Math.min(1, Math.max(0, (climbed * 1.25 - up) / 0.25));
      const clear = POSSESSION.thick * thin * reach;
      if (clear <= 0.01) { this.wrap.hide(i); return; }
      // Narrower toward his head, as a body is.
      const out = w.out * this.tall * (1 - up * 0.45);
      this.across.set(this.at.x + Math.cos(w.angle) * out, this.at.y + (up + 0.03 * Math.sin(this.time * 2 + w.bob)) * this.tall, this.at.z + Math.sin(w.angle) * out);
      this.wrap.put(i, this.across, w.size * this.tall, clear, w.spin);
    });
    this.wrap.commit();
    this.burning(dt, q, climbed);
    if (q >= 1) { this.possessing = null; this.fire.mesh.visible = this.fireDodges.mesh.visible = false; }
  }

  /** A tongue of the cloud's fire set off again about him, `into` that share of its life already: `off` its root, as shares of his height, its height in y. */
  private light(f: Tongue, into = 0): void {
    const how = POSSESSION.fire, angle = Math.random() * Math.PI * 2, out = r(POSSESSION.out);
    f.off.set(Math.cos(angle) * out, Math.random() * 0.75, Math.sin(angle) * out);
    f.life = r(how.life);
    f.t = into * f.life;
    f.tall = r(how.tall) * this.tall;
    f.wide = r(how.wide) * this.tall;
    f.run = r(TONGUES.run);
    f.phase = Math.random() * Math.PI * 2;
  }

  /** The black fire licking up through the cloud, no higher than it has climbed, with the Wekufe's red dodge. */
  private burning(dt: number, q: number, climbed: number): void {
    const { burns, points } = POSSESSION.fire, { at, across } = this;
    const lit = Math.min(1, Math.max(0, (q - burns[0]) / 0.1)) * Math.min(1, Math.max(0, (burns[1] - q) / 0.15));
    this.fire.mesh.visible = this.fireDodges.mesh.visible = lit > 0;
    if (lit <= 0) return;
    const up = new THREE.Vector3(0, 1, 0), root = new THREE.Vector3(), black = new THREE.Color('#050405');
    this.body.getWorldPosition(root);
    this.fires.forEach((f, l) => {
      f.t += dt;
      if (f.t >= f.life) this.light(f);
      const life = f.t / f.life, flare = Math.sin(Math.PI * Math.pow(life, 0.6)), tall = f.tall * flare;
      const narrows = 1 - f.off.y * 0.45, high = f.off.y * climbed;
      for (let p = 0; p < points; p++) {
        const k = p / (points - 1);
        at.set(root.x + f.off.x * narrows * this.tall, root.y + high * this.tall + k * tall, root.z + f.off.z * narrows * this.tall);
        if (this.seen) across.crossVectors(up, this.camera.clone().sub(at)).normalize();
        else across.set(1, 0, 0);
        at.addScaledVector(across, Math.sin(k * Math.PI * 2 - this.time * f.run + f.phase) * TONGUES.wave * tall * k);
        const wide = f.wide * Math.sin(Math.PI / 2 * Math.min(1, k / 0.3)) * Math.pow(1 - k, 0.8) * (0.5 + 0.5 * flare);
        const clear = lit * flare * Math.min(1, k / 0.15) * (1 - k * k);
        this.fire.put(l, p, at, across, wide, black, POSSESSION.fire.black * clear);
        this.fireDodges.put(l, p, at, across, wide * 0.8, DODGE.colour, POSSESSION.fire.red * clear);
      }
    });
    this.fire.commit();
    this.fireDodges.commit();
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
    this.possession(dt);
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
