import * as THREE from 'three';
import { chance } from '../world/chance';

// Embers still alight where a house burnt: a few points of fire among the ash, each brightening
// and fading in its own slow time, a pixel or two across; and over them the faintest warm glow,
// wavering. No flames: only what is left smouldering.

/** How dim an ember is at its darkest and how bright at its brightest; the seconds of its slowest and quickest breath. */
const EMBER = { dull: '#5a1206', hot: '#ffa040', slow: 2.6, quick: 1.1 };
/** The glow they cast together: its colour, its strength at most, how far it reaches and how high over them it stands. */
const GLOW = { colour: '#ff7a30', strength: 120, reach: 140, over: 14 };

export class Embers {
  readonly group = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;
  private readonly glow = new THREE.PointLight(GLOW.colour, 0, GLOW.reach, 1.6);
  private time = 0;

  /** `count` embers strewn over a patch `long` by `deep` about the origin (the building's frame), a little over the ground. */
  constructor(count: number, long: number, deep: number, seed = 1) {
    const at: number[] = [], phase: number[] = [], rate: number[] = [];
    for (let i = 0; i < count; i++) {
      // Gathered toward the middle, where the roof fell in, thinning out toward the walls.
      const a = chance(i, 1, seed) * Math.PI * 2, r = Math.sqrt(chance(i, 2, seed)) * 0.5;
      at.push(Math.cos(a) * r * long, 0.6 + chance(i, 3, seed) * 1.6, Math.sin(a) * r * deep);
      phase.push(chance(i, 4, seed) * Math.PI * 2);
      rate.push((Math.PI * 2) / (EMBER.quick + chance(i, 5, seed) * (EMBER.slow - EMBER.quick)));
    }
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
      fragmentShader: /* glsl */ `
        uniform vec3 dull;
        uniform vec3 hot;
        varying float heat;
        void main() {
          gl_FragColor = vec4(mix(dull, hot, heat) * (0.5 + 1.8 * heat), 1.0);
        }`,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.group.add(new THREE.Points(geometry, this.material));
    this.glow.position.y = GLOW.over;
    this.group.add(this.glow);
  }

  update(dt: number): void {
    this.time += dt;
    this.material.uniforms.time.value = this.time;
    // The glow breathes unevenly, never out, never bright.
    const t = this.time;
    this.glow.intensity = GLOW.strength * (0.45 + 0.2 * Math.sin(t * 1.3) + 0.12 * Math.sin(t * 3.1 + 1.7) + 0.06 * Math.sin(t * 7.9));
  }
}
