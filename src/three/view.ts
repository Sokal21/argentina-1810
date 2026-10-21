import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { finish, finishing, LOOK, sunWay, type Look } from './look';
import { shadeIn } from './paint';
import { PITCH } from './space';

// The camera, the light and the pixels. The world is drawn at a few times fewer pixels than the
// screen has, and each of them shown as a square block; one of those pixels is one unit of the
// world, as one pixel of a sprite was. The camera only ever moves a whole pixel at a time, so
// nothing standing still shimmers as it goes.

/** How far round whoever is followed the sun's shadows are worked out, in world units, seen from close. */
const SHADOWED = 900;
const SHADOW_MAP = 2048;
/** How far the camera stands off, along the way it looks: anything so long as all is in front. */
const OFF = 3000;

export class View {
  readonly renderer = new THREE.WebGLRenderer({ antialias: false });
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  private readonly composer: EffectComposer;
  private readonly pixels: RenderPixelatedPass;
  /** The glow round only what is very bright; before the finishing pass, which draws it in the world's pixels. */
  private readonly glow: UnrealBloomPass;
  private readonly finisher: ShaderPass;
  private readonly sun = new THREE.DirectionalLight();
  private readonly sky = new THREE.HemisphereLight();
  /** The way to the sun. */
  private sunward = sunWay(LOOK);
  /** What the picture looks like: see look.ts. */
  look: Look = { ...LOOK };
  /** The camera's own right and up, along which it is kept on whole pixels. */
  private readonly right = new THREE.Vector3(1, 0, 0);
  private readonly up = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH));
  private readonly back = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
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
    this.pixels = new RenderPixelatedPass(this.look.pixel, this.scene, this.camera);
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
  }

  /** How far round whoever is followed the sun's shadows reach: more, the further off the camera stands. */
  private get shadowed(): number {
    return SHADOWED * Math.max(1, this.look.far);
  }

  private sized = false;

  /** Screen pixels to each pixel of the world. */
  get pixel(): number {
    return this.look.pixel;
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
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -this.shadowed;
    s.right = s.top = this.shadowed;
    s.updateProjectionMatrix();
  }

  /** Seconds the camera still shakes for, and how far, in the world's pixels. */
  private shaking = 0;
  private shake = 0;

  /** Shakes the camera, as a blow that connects is felt. */
  jolt(seconds: number, pixels: number): void {
    this.shaking = Math.max(this.shaking, seconds);
    this.shake = pixels;
  }

  /** Keeps a spot on the ground in the middle of the screen. */
  follow(at: THREE.Vector3, dt = 0): void {
    const eye = at.clone().addScaledVector(this.back, OFF);
    // A shake moves it whole pixels at a time, like everything else.
    if (this.shaking > 0) {
      this.shaking -= dt;
      const k = this.look.far;
      eye.addScaledVector(this.right, Math.round((Math.random() * 2 - 1) * this.shake) * k);
      eye.addScaledVector(this.up, Math.round((Math.random() * 2 - 1) * this.shake) * k);
    }
    // On whole pixels along the screen's two ways; along the third it makes no difference.
    const unit = this.look.far, r = eye.dot(this.right), u = eye.dot(this.up);
    eye.addScaledVector(this.right, Math.round(r / unit) * unit - r);
    eye.addScaledVector(this.up, Math.round(u / unit) * unit - u);
    this.camera.position.copy(eye);
    // The sun's shadows are worked out round the same spot, kept on whole texels of its map.
    const texel = (this.shadowed * 2) / SHADOW_MAP;
    const spot = new THREE.Vector3(Math.round(at.x / texel) * texel, 0, Math.round(at.z / texel) * texel);
    this.sun.target.position.copy(spot);
    this.sun.position.copy(spot).addScaledVector(this.sunward, OFF);
  }

  /** A point of the page (as a pointer gives it), as a point of the picture from -1 to 1 each way. */
  pointAt(x: number, y: number): THREE.Vector2 {
    const box = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
  }

  draw(): void {
    // Where the camera stands, in the world's pixels across and up, to hold the grime to the world.
    const unit = this.look.far, at = new THREE.Vector2(this.camera.position.dot(this.right) / unit, this.camera.position.dot(this.up) / unit);
    finish(this.finisher, this.look, this.cols, this.rows, performance.now() / 1000, at, 1, this.fury);
    this.composer.render();
  }
}
