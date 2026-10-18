import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
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
  /** Drawn in big pixels, or as a plain 3D scene to compare. */
  pixelated = true;

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
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.pixels.setPixelSize(this.pixel);
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

  draw(): void {
    finish(this.finisher, this.look, innerWidth, innerHeight, performance.now() / 1000);
    if (this.pixelated) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
