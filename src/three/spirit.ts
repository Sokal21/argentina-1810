import * as THREE from 'three';
import { glow } from './realista';

// What marks Inti's nahuel as a spirit in 3D, as SpiritFX does in 2D: a halo of its own cyan round its
// body (a shell of it a little larger, drawn from inside, fading to its edge), its body lit from within
// and pulsing toward white, motes of marsh fire rising off its back and fading, and a pool of its light
// on the ground under it. No light is added to the scene (each one added rebuilds every shader, a
// stutter). `power` fades all of it in and out, as it comes and goes.

const CYAN = new THREE.Color('#46e6fa');
/** The halo: how much larger than the body, how bright. The inner light: how much, how fast it beats. */
const HALO = { wider: 1.12, bright: 0.55 };
const INNER = { low: 0.15, high: 0.4, beat: 3 };
/** The motes: how many kept, how long one lives, how fast it rises, how big. The pool: how wide, how bright. */
const MOTES = { kept: 18, life: [0.7, 1.4], rise: [14, 30], size: [2, 4] };
const POOL = { wide: 70, bright: 0.45 };

interface Mote { sprite: THREE.Sprite; t: number; life: number; rise: number; size: number }

export class Spirit {
  readonly group = new THREE.Group();
  private readonly lit: THREE.MeshToonMaterial[] = [];
  private readonly halo: THREE.ShaderMaterial;
  private readonly motes: Mote[] = [];
  private readonly pool: THREE.Mesh;
  private time = 0;
  /** From 0 (not there) to 1. */
  power = 1;

  /** `body` is the animal's model, already scaled: its meshes get a halo shell each, and are lit within. */
  constructor(private readonly body: THREE.Object3D) {
    this.halo = new THREE.ShaderMaterial({
      uniforms: { colour: { value: CYAN }, power: { value: 1 }, time: { value: 0 } },
      vertexShader: `
        #include <common>
        #include <skinning_pars_vertex>
        varying vec3 vNormal; varying vec3 vView;
        void main() {
          #include <skinbase_vertex>
          #include <begin_vertex>
          #include <beginnormal_vertex>
          #include <skinnormal_vertex>
          #include <skinning_vertex>
          transformed += normalize(objectNormal) * ${(HALO.wider - 1).toFixed(3)} ;
          vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
          vNormal = normalize(normalMatrix * objectNormal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 colour; uniform float power; uniform float time;
        varying vec3 vNormal; varying vec3 vView;
        void main() {
          float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
          float a = pow(rim, 1.6) * ${HALO.bright.toFixed(2)} * power * (0.85 + 0.15 * sin(time * 4.0));
          gl_FragColor = vec4(colour, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    });
    body.traverse(node => {
      if (!(node instanceof THREE.Mesh) || node.userData.spirit) return;
      const material = node.material as THREE.MeshToonMaterial;
      if (material.emissive) this.lit.push(material);
      const shell = node instanceof THREE.SkinnedMesh ? new THREE.SkinnedMesh(node.geometry, this.halo) : new THREE.Mesh(node.geometry, this.halo);
      if (node instanceof THREE.SkinnedMesh && shell instanceof THREE.SkinnedMesh) shell.bind(node.skeleton, node.bindMatrix);
      // The shell is in the body's own units: its widening is a share of them (one unit tall).
      shell.userData.spirit = true;
      shell.frustumCulled = false;
      node.add(shell);
    });
    const spark = (colour: THREE.Color) => new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    for (let i = 0; i < MOTES.kept; i++) {
      const sprite = spark(CYAN);
      sprite.visible = false;
      this.group.add(sprite);
      this.motes.push({ sprite, t: 0, life: 0, rise: 0, size: 0 });
    }
    // Flat on the ground, round (a sprite stood up and the ground cut it square).
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(POOL.wide / 2, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glow(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.group.add(this.pool);
  }

  update(dt: number): void {
    this.time += dt;
    const p = this.power;
    this.halo.uniforms.power.value = p;
    this.halo.uniforms.time.value = this.time;
    const beat = INNER.low + (INNER.high - INNER.low) * (0.5 + 0.5 * Math.sin(this.time * INNER.beat));
    for (const m of this.lit) m.emissive.copy(CYAN).multiplyScalar(beat * p);
    this.body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.body, true), at = box.getCenter(new THREE.Vector3());
    this.pool.position.set(at.x, box.min.y + 0.5, at.z);
    (this.pool.material as THREE.MeshBasicMaterial).opacity = POOL.bright * p;
    // A mote now and then off its back, rising and fading.
    for (const m of this.motes) {
      if (m.sprite.visible) {
        m.t += dt;
        const k = m.t / m.life;
        if (k >= 1) { m.sprite.visible = false; continue; }
        m.sprite.position.y += m.rise * dt;
        m.sprite.material.opacity = p * (1 - k) * Math.min(1, k * 4);
        m.sprite.scale.setScalar(m.size * (1 - k * 0.5));
      } else if (p > 0.05 && Math.random() < dt * 6) {
        const r = (a: number[]) => a[0] + Math.random() * (a[1] - a[0]);
        m.t = 0; m.life = r(MOTES.life); m.rise = r(MOTES.rise); m.size = r(MOTES.size);
        m.sprite.position.set(at.x + (Math.random() - 0.5) * (box.max.x - box.min.x) * 0.8, box.max.y - (box.max.y - box.min.y) * 0.15, at.z + (Math.random() - 0.5) * (box.max.z - box.min.z) * 0.8);
        m.sprite.visible = true;
      }
    }
  }
}
