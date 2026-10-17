import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { PITCH } from './space';

// The camera, the light and the pixels. The world is drawn at a few times fewer pixels than the
// screen has, and each of them shown as a square block; one of those pixels is one unit of the
// world, as one pixel of a sprite was. The camera only ever moves a whole pixel at a time, so
// nothing standing still shimmers as it goes.

/** Screen pixels to each pixel of the world, unless the address says otherwise (?px=4). */
const PIXEL = Number(new URLSearchParams(location.search).get('px')) || 3;
/** Where the sun is, as a way from the ground: behind the left shoulder, high. */
const SUN = new THREE.Vector3(-0.55, 1, 0.45).normalize();
/** How far round whoever is followed the sun's shadows are worked out, in world units. */
const SHADOWED = 900;
const SHADOW_MAP = 2048;
/** How far the camera stands off, along the way it looks: anything so long as all is in front. */
const OFF = 3000;
/** How soft the sky's light is, and how strong the sun. */
const SKY = { sky: '#cfd8dc', ground: '#8a7a50', strength: 1.6 };
const SUNLIGHT = { colour: '#fff1d6', strength: 2.4 };
const EDGES = { normal: 0.35, depth: 0.45 };

export class View {
  readonly renderer = new THREE.WebGLRenderer({ antialias: false });
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera();
  private readonly composer: EffectComposer;
  private readonly pixels: RenderPixelatedPass;
  private readonly sun = new THREE.DirectionalLight(SUNLIGHT.colour, SUNLIGHT.strength);
  /** The camera's own right and up, along which it is kept on whole pixels. */
  private readonly right = new THREE.Vector3(1, 0, 0);
  private readonly up = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH));
  private readonly back = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
  pixel = PIXEL;
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

    this.scene.add(new THREE.HemisphereLight(SKY.sky, SKY.ground, SKY.strength));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -SHADOWED;
    s.right = s.top = SHADOWED;
    s.near = 1;
    s.far = OFF * 2;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    this.composer = new EffectComposer(this.renderer);
    this.pixels = new RenderPixelatedPass(this.pixel, this.scene, this.camera, { normalEdgeStrength: EDGES.normal, depthEdgeStrength: EDGES.depth });
    this.composer.addPass(this.pixels);
    this.composer.addPass(new OutputPass());
    this.fit();
    addEventListener('resize', () => this.fit());
  }

  fit(): void {
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.pixels.setPixelSize(this.pixel);
    // One unit of the world to each of its pixels, whatever the screen. Drawn plain, the same
    // stretch of the world is seen, only finer.
    const w = Math.floor(innerWidth / this.pixel), h = Math.floor(innerHeight / this.pixel);
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
  }

  /** Lines along the edges of things, lighter where they turn and darker where they stand in front: on or off. */
  set edges(on: boolean) {
    this.pixels.normalEdgeStrength = on ? EDGES.normal : 0;
    this.pixels.depthEdgeStrength = on ? EDGES.depth : 0;
  }

  get edges(): boolean {
    return (this.pixels.normalEdgeStrength ?? 0) > 0;
  }

  /** Keeps a spot on the ground in the middle of the screen. */
  follow(at: THREE.Vector3): void {
    const eye = at.clone().addScaledVector(this.back, OFF);
    // On whole pixels along the screen's two ways; along the third it makes no difference.
    const r = eye.dot(this.right), u = eye.dot(this.up);
    eye.addScaledVector(this.right, Math.round(r) - r);
    eye.addScaledVector(this.up, Math.round(u) - u);
    this.camera.position.copy(eye);
    // The sun's shadows are worked out round the same spot, kept on whole texels of its map.
    const texel = (SHADOWED * 2) / SHADOW_MAP;
    const spot = new THREE.Vector3(Math.round(at.x / texel) * texel, 0, Math.round(at.z / texel) * texel);
    this.sun.target.position.copy(spot);
    this.sun.position.copy(spot).addScaledVector(SUN, OFF);
  }

  draw(): void {
    if (this.pixelated) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
