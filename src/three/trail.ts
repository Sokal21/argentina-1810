import * as THREE from 'three';
import { unlitShader } from './pixels';

// The arc a blade leaves as it cuts: a pale ribbon between where its point and its foot have been
// over the last few frames, fading toward the oldest. Without it, a blade a couple of pixels wide
// sweeping across in a quarter of a second is hard to follow; with it the cut reads as a sweep.

/** Frames the ribbon reaches back over, and how long a part of it takes to fade. */
const LENGTH = 7;
const COLOUR = new THREE.Color('#f4f1e6');
const OPACITY = 0.75;

export class Trail {
  readonly mesh: THREE.Mesh;
  private readonly points: { tip: THREE.Vector3; foot: THREE.Vector3 }[] = [];
  private readonly geometry = new THREE.BufferGeometry();

  /** @param blade what the trail follows: its +X is the blade's length, from `from` to `to` along it */
  constructor(private readonly blade: THREE.Object3D, private readonly from: number, private readonly to: number) {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LENGTH * 2 * 3), 3));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(LENGTH * 2), 1));
    const index: number[] = [];
    for (let i = 0; i < LENGTH - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      index.push(a, b, c, b, d, c);
    }
    this.geometry.setIndex(index);
    this.mesh = new THREE.Mesh(this.geometry, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { colour: { value: COLOUR }, opacity: { value: OPACITY } },
      vertexShader: 'attribute float alpha; varying float vAlpha; void main() { vAlpha = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: unlitShader('uniform vec3 colour; uniform float opacity; varying float vAlpha; void main() { if (vAlpha < 0.02) discard; gl_FragColor = vec4(colour, vAlpha * opacity); }'),
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
  }

  /** Called each frame: `cutting` while the blow is being struck; otherwise the trail dies away. */
  update(cutting: boolean): void {
    const world = this.blade.matrixWorld;
    if (cutting) {
      this.points.unshift({
        tip: new THREE.Vector3(this.to, 0, 0).applyMatrix4(world),
        foot: new THREE.Vector3(this.from, 0, 0).applyMatrix4(world),
      });
    } else if (this.points.length) this.points.pop();
    if (this.points.length > LENGTH) this.points.length = LENGTH;
    const position = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alpha = this.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    for (let i = 0; i < LENGTH; i++) {
      const p = this.points[Math.min(i, this.points.length - 1)];
      const fade = i < this.points.length ? 1 - i / LENGTH : 0;
      if (p) {
        position.setXYZ(i * 2, p.tip.x, p.tip.y, p.tip.z);
        position.setXYZ(i * 2 + 1, p.foot.x, p.foot.y, p.foot.z);
      }
      alpha.setX(i * 2, fade);
      alpha.setX(i * 2 + 1, fade * 0.35);
    }
    position.needsUpdate = alpha.needsUpdate = true;
    this.mesh.visible = this.points.length > 1;
  }
}
