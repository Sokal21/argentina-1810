import * as THREE from 'three';
import { unlitShader } from './pixels';
import { chance } from '../world/chance';

// Embers still alight where a house burnt: points of fire on what is left of it, among the ash of
// its floor and along its charred rafters, each brightening and fading in its own slow time, one to
// two pixels across (at two to four they read too big); and over them a warm glow, wavering. No
// flames: only what is left smouldering. Each lies on a point of the model itself (`onModel`): laid
// by guess they were hidden under its floor, or lay out on the open ground.

/** How dim an ember is at its darkest and how bright at its brightest; the seconds of its slowest and quickest breath. */
const EMBER = { dull: '#7a1a08', hot: '#ffb050', slow: 2.6, quick: 1.1 };
/** The glow they cast together: its colour, its strength at most, how far it reaches and how high over them it stands. */
const GLOW = { colour: '#ff7a30', strength: 600, reach: 220, over: 30 };
export class Embers {
  readonly group = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;
  private readonly glow = new THREE.PointLight(GLOW.colour, 0, GLOW.reach, 1.6);
  private time = 0;

  /** Embers at these points (the building's frame), each in its own time. */
  constructor(points: THREE.Vector3[], seed = 1) {
    const at: number[] = [], phase: number[] = [], rate: number[] = [];
    points.forEach((p, i) => {
      at.push(p.x, p.y + 0.6, p.z);
      phase.push(chance(i, 4, seed) * Math.PI * 2);
      rate.push((Math.PI * 2) / (EMBER.quick + chance(i, 5, seed) * (EMBER.slow - EMBER.quick)));
    });
    const low = points.reduce((m, p) => Math.min(m, p.y), Infinity);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phase, 1));
    geometry.setAttribute('rate', new THREE.Float32BufferAttribute(rate, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, dull: { value: new THREE.Color(EMBER.dull) }, hot: { value: new THREE.Color(EMBER.hot) } },
      vertexShader: /* glsl */ `
        attribute float phase;
        attribute float rate;
        uniform float time;
        varying float heat;
        void main() {
          // A slow breath, held dark longer than bright, with a faint flutter on it.
          float b = 0.5 + 0.5 * sin(time * rate + phase);
          heat = pow(b, 2.5) * (0.85 + 0.15 * sin(time * rate * 3.7 + phase * 2.0));
          gl_PointSize = 1.0 + 1.5 * heat;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: unlitShader(/* glsl */ `
        uniform vec3 dull;
        uniform vec3 hot;
        varying float heat;
        void main() {
          gl_FragColor = vec4(mix(dull, hot, heat) * (0.7 + 2.4 * heat), 1.0);
        }`),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.group.add(new THREE.Points(geometry, this.material));
    this.glow.position.y = (Number.isFinite(low) ? low : 0) + GLOW.over;
    this.group.add(this.glow);
  }

  update(dt: number): void {
    this.time += dt;
    this.material.uniforms.time.value = this.time;
    // The glow breathes unevenly, never out.
    const t = this.time;
    this.glow.intensity = GLOW.strength * (0.45 + 0.2 * Math.sin(t * 1.3) + 0.12 * Math.sin(t * 3.1 + 1.7) + 0.06 * Math.sin(t * 7.9));
  }
}

/**
 * Points of a model (in `frame`'s coordinates) for embers to lie on: `low` of them on its floor
 * (between `floor` shares of its height, within `within` of its length and depth from its middle,
 * inside its walls) and `high` along whatever stands above `roof` of it (the rafters left).
 */
export function onModel(shape: THREE.Object3D, frame: THREE.Object3D, tall: number, long: number, deep: number,
  { low, high, floor, roof, within }: { low: number; high: number; floor: [number, number]; roof: number; within: number }, seed = 1): THREE.Vector3[] {
  frame.updateWorldMatrix(true, true);
  const toFrame = frame.matrixWorld.clone().invert(), p = new THREE.Vector3();
  const floored: THREE.Vector3[] = [], raised: THREE.Vector3[] = [];
  shape.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const position = node.geometry.getAttribute('position') as THREE.BufferAttribute;
    const m = toFrame.clone().multiply(node.matrixWorld);
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i).applyMatrix4(m);
      const share = p.y / tall;
      if (share >= floor[0] && share <= floor[1] && Math.abs(p.x) < long * within && Math.abs(p.z) < deep * within) floored.push(p.clone());
      else if (share > roof) raised.push(p.clone());
    }
  });
  // A few of each, drawn by chance, the same each time.
  const pick = (from: THREE.Vector3[], n: number, k: number) =>
    from.length ? Array.from({ length: n }, (_, i) => from[Math.floor(chance(i, k, seed) * from.length)]) : [];
  return [...pick(floored, low, 11), ...pick(raised, high, 12)];
}
