import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { finish, finishing, LOOK, sunWay, type Look } from './look';
import { PixelPass } from './pixels';
import { shadeIn } from './paint';
import { PITCH } from './space';

// The camera, the light and the pixels. The world is drawn at a few times fewer pixels than the
// screen has, and each of them shown as a square block; one of those pixels is one unit of the
// world, as one pixel of a sprite was. The camera only ever moves a whole pixel at a time, so
// nothing standing still shimmers as it goes.

const SHADOW_MAP = 2048;
/**
 * The sun's shadows are worked out only where they can be seen: over the ground in view and whatever
 * stands on it, from the stream's bed (`low`) to the top of the tallest thing on the map (`tallest`,
 * told by whoever makes the map) standing on a hill (`over`), all reckoned from the ground under
 * whoever is followed (world units, up); and a little past the picture's edges (world units), for the
 * shake and the snapping. Reckoned over the whole map (a box of ±1620 round the hero, 6000 deep), the
 * shadow pass drew every tree of the forest in the sun's strip across it: ten million triangles a
 * frame, five times the rest of the picture. Everything the box takes in costs: the higher it reaches,
 * the deeper the strip of ground along the sun's slant it must cover.
 */
const SHADOWED = { low: -80, over: 80, past: 48 };
/** How tall the tallest thing stands until a map says: the belfry (buildings.ts). */
const TALLEST = 330;
/** How far the camera stands off, along the way it looks: anything so long as all is in front. */
const OFF = 3000;

/** How many of the world's pixels the screen's shorter side shows at least (a computer's 772 at 3 a pixel). */
const SHORT_SIDE = 257;

export class View {
  readonly renderer = new THREE.WebGLRenderer({ antialias: false });
  readonly scene = new THREE.Scene();
  /** Drawn over the finished picture, on the world's pixels but past every pass: signs that must read whole. */
  readonly over = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  private readonly composer: EffectComposer;
  private readonly pixels: PixelPass;
  /** The glow round only what is very bright; before the finishing pass, which draws it in the world's pixels. */
  private readonly glow: UnrealBloomPass;
  private readonly finisher: ShaderPass;
  private readonly sun = new THREE.DirectionalLight();
  private readonly sky = new THREE.HemisphereLight();
  /** The way to the sun. */
  /** The way toward the sun. */
  sunward = sunWay(LOOK);
  /** What the picture looks like: see look.ts. */
  look: Look = { ...LOOK };
  /** The camera's own right and up, along which it is kept on whole pixels. */
  private readonly right = new THREE.Vector3(1, 0, 0);
  private readonly up = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH));
  private readonly back = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
  /** How tall the tallest thing on the map stands, in world units: the sun's shadows are reckoned up to there. */
  private _tallest = TALLEST;
  get tallest(): number { return this._tallest; }
  set tallest(height: number) {
    if (height === this._tallest) return;
    this._tallest = height;
    if (this.sized) this.fitShadows();
  }
  /** The sun's shadow camera's own right and up (as Three turns it toward its target), and one texel of its map along each. */
  private readonly sunRight = new THREE.Vector3(1, 0, 0);
  private readonly sunUp = new THREE.Vector3(0, 1, 0);
  private readonly texel = new THREE.Vector2(1, 1);
  /** How deep in his rage Cabral is, which the whole picture shows (0 to 1). */
  fury = 0;
  /** Drawn in big pixels, or as a plain 3D scene to compare. */
  private plain = false;
  get pixelated(): boolean { return !this.plain; }
  set pixelated(on: boolean) { this.plain = !on; this.fit(); }
  /** The world's pixels across and down: what is rendered, the screen showing each as a block. */
  private cols = 1;
  private rows = 1;

  constructor(parent: HTMLElement) {
    this.renderer.setPixelRatio(1);
    // A house is cut open to be seen within (house.ts).
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.domElement.style.imageRendering = 'pixelated';
    parent.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color('#14110f');

    this.camera.quaternion.setFromEuler(new THREE.Euler(-PITCH, 0, 0));
    this.camera.near = 1;
    this.camera.far = OFF * 2;

    this.scene.add(this.sky);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    const s = this.sun.shadow.camera;
    s.near = 1;
    s.far = OFF * 2;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    this.composer = new EffectComposer(this.renderer);
    this.pixels = new PixelPass(this.look.pixel, this.scene, this.camera);
    this.composer.addPass(this.pixels);
    this.glow = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0, 0.35, 0.92);
    this.composer.addPass(this.glow);
    this.composer.addPass(new OutputPass());
    this.finisher = finishing();
    this.composer.addPass(this.finisher);
    this.apply(this.look);
    addEventListener('resize', () => this.fit());
  }

  /** Puts a look into effect: its pixels, edges and light; the finishing pass reads it each frame. */
  apply(look: Look): void {
    const pixelChanged = look.pixel !== this.look.pixel || look.far !== this.look.far;
    this.look = { ...look };
    this.pixels.normalEdgeStrength = look.creases;
    this.glow.strength = look.bloom;
    this.glow.threshold = look.bloomFrom;
    this.glow.enabled = look.bloom > 0;
    this.pixels.depthEdgeStrength = look.outlines;
    this.sun.color.set(look.sunColour);
    this.sun.intensity = look.sunStrength;
    this.sun.castShadow = look.shadows;
    this.sunward = sunWay(look);
    this.sky.color.set(look.skyColour);
    this.sky.groundColor.set(look.groundColour);
    this.sky.intensity = look.skyStrength;
    shadeIn(look.steps, look.darkest);
    if (pixelChanged || !this.sized) this.fit();
    // The sun moved: its shadows are reckoned over the same view from where it now stands.
    else this.fitShadows();
  }

  private sized = false;

  /**
   * Screen pixels to each pixel of the world: the look's, or fewer on a small screen, so that its
   * shorter side shows as much of the world as a computer's does (on a phone, at 3 a pixel, the hero
   * filled the screen).
   */
  get pixel(): number {
    const short = Math.min(innerWidth, innerHeight);
    return Math.max(1, Math.min(this.look.pixel, short / SHORT_SIDE));
  }

  fit(): void {
    this.sized = true;
    // Rendered at the world's own pixels, every pass after it too, and shown a block to each by
    // the browser, unsmoothed: the same picture as rendering at the screen's size and then blocking
    // it, for a ninth of the pixels to work out. Drawn plain, at the screen's own.
    const block = this.plain ? 1 : this.pixel;
    this.cols = Math.max(1, Math.floor(innerWidth / block));
    this.rows = Math.max(1, Math.floor(innerHeight / block));
    this.renderer.setSize(this.cols, this.rows, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = `${this.cols * block}px`;
    canvas.style.height = `${this.rows * block}px`;
    this.composer.setSize(this.cols, this.rows);
    this.pixels.setPixelSize(1);
    // One unit of the world to each of its pixels, whatever the screen. Drawn plain, the same
    // stretch of the world is seen, only finer.
    const k = this.look.far;
    const w = Math.floor(innerWidth / this.pixel) * k, h = Math.floor(innerHeight / this.pixel) * k;
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
    this.fitShadows();
  }

  /**
   * Fits the sun's shadow camera to the view: a box, in the light's own frame, round everything the
   * camera can see between the lowest and highest things there are (the eight corners of that slab),
   * and reaching toward the sun far enough to take in whatever casts a shadow onto it. Its size holds
   * until the camera or the sun changes; each frame only its place moves (`follow`), by whole texels.
   */
  private fitShadows(): void {
    // The light's frame, as Three turns the shadow camera toward its target (Matrix4.lookAt, up +Y).
    const toward = this.sunward.clone().normalize();
    this.sunRight.set(0, 1, 0).cross(toward);
    if (this.sunRight.lengthSq() < 1e-6) this.sunRight.set(1, 0, 0);
    this.sunRight.normalize();
    this.sunUp.crossVectors(toward, this.sunRight).normalize();
    // The corners of what is seen: across the screen, up it, and at either height; a point `u` up
    // the screen at height `y` stands `(y - u·cos) / sin` along the camera's back.
    const w = (this.camera.right - this.camera.left) / 2 + SHADOWED.past;
    const h = (this.camera.top - this.camera.bottom) / 2 + SHADOWED.past;
    const high = this._tallest + SHADOWED.over;
    let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity, nearest = -Infinity, furthest = Infinity;
    const corner = new THREE.Vector3();
    for (const r of [-w, w]) for (const u of [-h, h]) for (const y of [SHADOWED.low, high]) {
      corner.set(0, 0, 0).addScaledVector(this.right, r).addScaledVector(this.up, u).addScaledVector(this.back, (y - u * Math.cos(PITCH)) / Math.sin(PITCH));
      const x = corner.dot(this.sunRight), v = corner.dot(this.sunUp), toSun = corner.dot(toward);
      left = Math.min(left, x); right = Math.max(right, x);
      bottom = Math.min(bottom, v); top = Math.max(top, v);
      nearest = Math.max(nearest, toSun); furthest = Math.min(furthest, toSun);
    }
    // Whatever casts a shadow into the box stands toward the sun from it, by at most the height of
    // the tallest thing over the lowest, along the sun's slant.
    const casting = (high - SHADOWED.low) / Math.max(0.1, toward.y);
    const s = this.sun.shadow.camera;
    // The box is centred on the spot the light looks at, which `follow` keeps on whole texels.
    const halfW = (right - left) / 2, halfH = (top - bottom) / 2;
    s.left = -halfW; s.right = halfW;
    s.bottom = -halfH; s.top = halfH;
    s.near = Math.max(1, OFF - nearest - casting);
    s.far = OFF - furthest;
    s.updateProjectionMatrix();
    this.texel.set((2 * halfW) / SHADOW_MAP, (2 * halfH) / SHADOW_MAP);
  }

  /** Seconds the camera still shakes for, and how far, in the world's pixels. */
  private shaking = 0;
  private shake = 0;
  /** How long a fading shake lasts in all, or 0 for one that does not fade. */
  private shakeFor = 0;

  /** Shakes the camera, as a blow that connects is felt. */
  jolt(seconds: number, pixels: number, fading = false): void {
    // A small blow does not cut short a great shake under way.
    if (this.shaking > 0 && this.shake * this.left() > pixels) return;
    this.shaking = Math.max(this.shaking, seconds);
    this.shake = pixels;
    this.shakeFor = fading ? seconds : 0;
  }

  /** How strong the shake still is, 0 to 1: dying away if it fades, whole until it ends if not. */
  private left(): number {
    return this.shakeFor > 0 ? Math.max(0, this.shaking / this.shakeFor) : 1;
  }

  /** Keeps a spot on the ground in the middle of the screen. */
  follow(at: THREE.Vector3, dt = 0): void {
    const eye = at.clone().addScaledVector(this.back, OFF);
    // A shake moves it whole pixels at a time, like everything else.
    if (this.shaking > 0) {
      this.shaking -= dt;
      const k = this.look.far;
      const far = this.shake * this.left();
      eye.addScaledVector(this.right, Math.round((Math.random() * 2 - 1) * far) * k);
      eye.addScaledVector(this.up, Math.round((Math.random() * 2 - 1) * far) * k);
    }
    // On whole pixels along the screen's two ways; along the third it makes no difference.
    const unit = this.look.far, r = eye.dot(this.right), u = eye.dot(this.up);
    eye.addScaledVector(this.right, Math.round(r / unit) * unit - r);
    eye.addScaledVector(this.up, Math.round(u / unit) * unit - u);
    this.camera.position.copy(eye);
    // The sun's shadows are worked out round the same spot (the middle of what is seen), kept on whole
    // texels of its map along the light's own right and up, so they do not shimmer as the camera goes.
    const spot = at.clone(), x = spot.dot(this.sunRight), y = spot.dot(this.sunUp);
    spot.addScaledVector(this.sunRight, Math.round(x / this.texel.x) * this.texel.x - x);
    spot.addScaledVector(this.sunUp, Math.round(y / this.texel.y) * this.texel.y - y);
    this.sun.target.position.copy(spot);
    this.sun.position.copy(spot).addScaledVector(this.sunward, OFF);
  }

  /** A point of the page (as a pointer gives it), as a point of the picture from -1 to 1 each way. */
  pointAt(x: number, y: number): THREE.Vector2 {
    const box = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
  }

  /**
   * Compiles every material in the scene now, hidden things too (shown for the moment), so none is
   * compiled the first time it shows, a freeze in the middle of play.
   */
  warm(): void {
    for (const scene of [this.scene, this.over]) {
      const hidden: THREE.Object3D[] = [];
      scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } });
      this.renderer.compile(scene, this.camera);
      for (const o of hidden) o.visible = false;
    }
  }

  draw(): void {
    // Where the camera stands, in the world's pixels across and up, to hold the grime to the world.
    const unit = this.look.far, at = new THREE.Vector2(this.camera.position.dot(this.right) / unit, this.camera.position.dot(this.up) / unit);
    finish(this.finisher, this.look, this.cols, this.rows, performance.now() / 1000, at, 1, this.fury);
    this.composer.render();
    this.renderer.autoClear = false;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.over, this.camera);
    this.renderer.autoClear = true;
  }
}
