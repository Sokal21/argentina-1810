import * as THREE from 'three';
import { unlitShader } from './pixels';

// Many little pictures that face the camera (what a sprite is: a square turned to the camera, a
// picture on it or only a colour), drawn all in one call. A sprite each was a call each: the
// plague-dead soldier's retching alone, its drops and its bubbles, was over a hundred, and his
// stench thirty more for as long as he stood. Here each is a copy of one square, put where it goes,
// as big, as clear and as turned as it is, by its own numbers; a square scaled to nothing is not
// seen, and none past the last shown is drawn at all.

const vertex = /* glsl */ `
  attribute vec3 at;
  attribute float size;
  attribute float clear;
  attribute float spin;
  attribute vec3 tint;
  varying vec2 vUv;
  varying float vClear;
  varying vec3 vTint;
  void main() {
    // The copy's centre, as the camera sees it; its corners spread from there across the camera's
    // own right and up, turned in that plane: so it faces the camera however the camera stands.
    vec4 centre = modelViewMatrix * vec4(at, 1.0);
    vec2 corner = position.xy * size;
    float c = cos(spin), s = sin(spin);
    centre.xy += vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
    gl_Position = projectionMatrix * centre;
    vUv = uv;
    vClear = clear;
    vTint = tint;
  }`;

const fragment = /* glsl */ `
  #ifdef USE_MAP
  uniform sampler2D map;
  #endif
  varying vec2 vUv;
  varying float vClear;
  varying vec3 vTint;
  void main() {
    vec4 colour = vec4(vTint, vClear);
    #ifdef USE_MAP
    colour *= texture2D(map, vUv);
    #endif
    gl_FragColor = colour;
  }`;

export class Billboards {
  readonly mesh: THREE.Mesh;
  private readonly geometry = new THREE.InstancedBufferGeometry();
  private readonly at: THREE.InstancedBufferAttribute;
  private readonly size: THREE.InstancedBufferAttribute;
  private readonly clear: THREE.InstancedBufferAttribute;
  private readonly spin: THREE.InstancedBufferAttribute;
  private readonly tint: THREE.InstancedBufferAttribute;
  /** Which copies are shown. */
  private readonly live: boolean[];
  private changed = false;

  /** Room for `room` copies, each of the picture `map` (none: a plain square of its colour); `lit`, added to what is behind them, as light is. */
  constructor(readonly room: number, map?: THREE.Texture, lit = false) {
    const square = new THREE.PlaneGeometry(1, 1);
    this.geometry.setIndex(square.getIndex());
    this.geometry.setAttribute('position', square.getAttribute('position'));
    this.geometry.setAttribute('uv', square.getAttribute('uv'));
    const dynamic = (n: number) => new THREE.InstancedBufferAttribute(new Float32Array(room * n), n).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('at', this.at = dynamic(3));
    this.geometry.setAttribute('size', this.size = dynamic(1));
    this.geometry.setAttribute('clear', this.clear = dynamic(1));
    this.geometry.setAttribute('spin', this.spin = dynamic(1));
    this.geometry.setAttribute('tint', this.tint = dynamic(3));
    this.geometry.instanceCount = 0;
    this.live = new Array<boolean>(room).fill(false);
    const material = new THREE.ShaderMaterial({
      uniforms: map ? { map: { value: map } } : {},
      defines: map ? { USE_MAP: '' } : {},
      vertexShader: vertex,
      fragmentShader: unlitShader(fragment),
      transparent: true,
      depthWrite: false,
      blending: lit ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Whether copy `i` is shown. */
  shown(i: number): boolean {
    return this.live[i];
  }

  /** The first copy not shown, if any. */
  free(): number {
    return this.live.indexOf(false);
  }

  /** Colours copy `i` (as a sprite's colour: what its picture is multiplied by). */
  colour(i: number, colour: THREE.ColorRepresentation): void {
    const c = new THREE.Color(colour);
    this.tint.setXYZ(i, c.r, c.g, c.b);
    this.changed = true;
  }

  /** Shows copy `i` at `at` (in the mesh's own space), `size` across, as clear as `clear` (0 to 1), turned `spin` (radians). */
  put(i: number, at: THREE.Vector3, size: number, clear = 1, spin = 0): void {
    this.at.setXYZ(i, at.x, at.y, at.z);
    this.size.setX(i, size);
    this.clear.setX(i, clear);
    this.spin.setX(i, spin);
    this.live[i] = true;
    this.changed = true;
  }

  hide(i: number): void {
    if (!this.live[i]) return;
    this.live[i] = false;
    this.size.setX(i, 0);
    this.changed = true;
  }

  hideAll(): void {
    for (let i = 0; i < this.room; i++) this.hide(i);
  }

  /** Sends the frame's changes to be drawn: only up to the last copy shown, nothing when none is. */
  commit(): void {
    if (!this.changed) return;
    this.changed = false;
    const last = this.live.lastIndexOf(true);
    this.geometry.instanceCount = last + 1;
    this.mesh.visible = last >= 0;
    for (const a of [this.at, this.size, this.clear, this.spin, this.tint]) a.needsUpdate = true;
  }
}
