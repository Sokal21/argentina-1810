import * as THREE from 'three';
import { glow } from './realista';
import { ground, UPRIGHT } from './space';

// Inti's lightning in 3D, where the 2D game says it falls (fx/lightning.ts drew it flat over the world):
// a crooked bolt down from the sky with a fork or two, redrawn a few times as it flickers, and a light
// that really falls on whatever stands about (the grass, the trees, whoever it strikes, her); where it
// lands, a ring thrown out over the ground, a flash, sparks, and a scorch that fades. While a patch waits
// for its bolt, a light gathers over it. The lights are made once and lent out (each added rebuilds
// every shader).

const CYAN = new THREE.Color('#46e6fa'), PALE = new THREE.Color('#bef8fc'), WHITE = new THREE.Color('#ffffff');
/** The bolt: how high it starts (the 2D game's 320, stood up), how long it shows, how often it changes shape. */
const BOLT = { sky: 320 * UPRIGHT, life: 0.26, redraw: 0.045, steps: 14, stray: 16, lean: 30 };
/** Its light: how strong, how far, how high over the spot; it lingers a little past the bolt. */
const FLASH = { light: 9000, reach: 520, over: 50, linger: 0.2 };
/** Gathering over a waiting patch: how strong at the last, how far, how high. */
const GATHER = { light: 900, reach: 260, over: 30 };
/** Where it lands: the ring's growth (shares of the patch's radius), the ground's flash, the sparks, the scorch. */
const LAND = { ringFrom: 0.5, ringTo: 1.3, pool: 2.6, sparks: 26, speed: [40, 120], up: [40, 130], fall: 300, sparkLife: [0.25, 0.55], scorch: 2.5 };
const DECAY = 1.2;

interface Strike { at: THREE.Vector3; radius: number; t: number; next: number; lines: THREE.Group; glowColumn: THREE.Sprite; ring: THREE.Mesh; pool: THREE.Mesh; light: THREE.PointLight | null }
interface Spark { sprite: THREE.Sprite; v: THREE.Vector3; t: number; life: number }

export class Lightning3D {
  readonly group = new THREE.Group();
  private readonly flashes: THREE.PointLight[] = [];
  private readonly gather: THREE.PointLight;
  private strikes: Strike[] = [];
  private sparks: Spark[] = [];
  private scorches: { mesh: THREE.Mesh; t: number }[] = [];
  private readonly ringShape = new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2);
  private readonly discShape = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);

  constructor() {
    for (let i = 0; i < 2; i++) this.flashes.push(this.light(FLASH.reach));
    this.gather = this.light(GATHER.reach);
  }

  private light(reach: number): THREE.PointLight {
    const light = new THREE.PointLight(PALE, 0, reach, DECAY);
    light.castShadow = false;
    this.group.add(light);
    return light;
  }

  private additive(colour: THREE.Color, map: THREE.Texture | null = glow()): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  }

  /** A bolt falls on the patch of this radius about a spot of the 2D ground. */
  strike(x: number, y: number, radius: number): void {
    const at = ground(x, y);
    const lines = new THREE.Group();
    const glowColumn = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    glowColumn.center.set(0.5, 0);
    glowColumn.position.copy(at);
    glowColumn.scale.set(60, BOLT.sky, 1);
    const ring = new THREE.Mesh(this.ringShape, this.additive(WHITE, null));
    const pool = new THREE.Mesh(this.discShape, this.additive(PALE));
    ring.position.copy(at).y += 0.8;
    pool.position.copy(at).y += 0.6;
    pool.scale.setScalar(radius * LAND.pool);
    const light = this.flashes.find(l => !this.strikes.some(s => s.light === l)) ?? null;
    if (light) light.position.copy(at).y += FLASH.over;
    this.group.add(lines, glowColumn, ring, pool);
    this.strikes.push({ at, radius, t: 0, next: 0, lines, glowColumn, ring, pool, light });
    // Sparks thrown up and out, falling back.
    for (let i = 0; i < LAND.sparks; i++) {
      const a = Math.random() * Math.PI * 2, r = (n: number[]) => n[0] + Math.random() * (n[1] - n[0]), speed = r(LAND.speed);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: PALE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      sprite.position.copy(at).y += 4;
      sprite.scale.setScalar(4);
      this.group.add(sprite);
      this.sparks.push({ sprite, v: new THREE.Vector3(Math.cos(a) * speed, r(LAND.up), Math.sin(a) * speed), t: 0, life: r(LAND.sparkLife) });
    }
    // The ground scorched where it fell, fading.
    const scorch = new THREE.Mesh(this.discShape, new THREE.MeshBasicMaterial({ map: glow(), color: '#000000', transparent: true, depthWrite: false, opacity: 0.55 }));
    scorch.position.copy(at).y += 0.4;
    scorch.scale.setScalar(radius * 0.9);
    this.group.add(scorch);
    this.scorches.push({ mesh: scorch, t: 0 });
  }

  /** A crooked line from one point to another, wandering most in the middle and landing on the spot. */
  private path(from: THREE.Vector3, to: THREE.Vector3, steps: number, stray: number): THREE.Vector3[] {
    const points = [from.clone()];
    for (let i = 1; i < steps; i++) {
      const k = i / steps, s = stray * Math.sin(k * Math.PI);
      points.push(from.clone().lerp(to, k).add(new THREE.Vector3((Math.random() * 2 - 1) * s, 0, (Math.random() * 2 - 1) * s)));
    }
    points.push(to.clone());
    return points;
  }

  /** The bolt in a new shape: a wide faint stroke, a bright one and a white core, and two thinner forks. */
  private draw(s: Strike, fade: number): void {
    for (const child of [...s.lines.children]) {
      s.lines.remove(child);
      const line = child as THREE.Line;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    const top = s.at.clone().add(new THREE.Vector3((Math.random() * 2 - 1) * BOLT.lean, BOLT.sky, 0));
    const trunk = this.path(top, s.at, BOLT.steps, BOLT.stray);
    const forks = [trunk];
    for (let i = 0; i < 2; i++) {
      const from = trunk[4 + Math.floor(Math.random() * (trunk.length - 8))];
      const to = from.clone().add(new THREE.Vector3((Math.random() * 2 - 1) * 55, -(35 + Math.random() * 45) * UPRIGHT, (Math.random() * 2 - 1) * 30));
      forks.push(this.path(from, to, 5, 8));
    }
    // Strokes side by side across the screen (the camera only looks down, so across is along x).
    const strokes: [number[], THREE.Color, number][] = [[[-2, 2], CYAN, 0.35], [[-1, 1], PALE, 0.75], [[0], WHITE, 1]];
    forks.forEach((points, i) => {
      for (const [offsets, colour, alpha] of strokes) {
        if (i > 0 && offsets.length > 1 && Math.abs(offsets[0]) > 1) continue;
        for (const dx of offsets) {
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => p.clone().setX(p.x + dx))),
            new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: alpha * fade, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
          line.frustumCulled = false;
          s.lines.add(line);
        }
      }
    });
  }

  /** Each step: the bolts flickering out, their light, the rings and sparks, and the light gathering over patches still waiting (`waiting`: how far along each is, 0 to 1). */
  update(dt: number, waiting: readonly { x: number; y: number; share: number }[]): void {
    for (const s of this.strikes) {
      s.t += dt;
      s.next -= dt;
      const p = Math.min(1, s.t / BOLT.life);
      if (s.t < BOLT.life && s.next <= 0) { s.next = BOLT.redraw; this.draw(s, 1 - p * 0.6); }
      s.lines.visible = s.t < BOLT.life;
      s.glowColumn.material.opacity = s.t < BOLT.life ? 0.35 * (1 - p) * (0.6 + 0.4 * Math.random()) : 0;
      const r = s.radius * (LAND.ringFrom + (LAND.ringTo - LAND.ringFrom) * p);
      s.ring.scale.setScalar(r);
      (s.ring.material as THREE.MeshBasicMaterial).opacity = 1 - p;
      (s.pool.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - p);
      // The light flickers with the bolt, and lingers a moment past it.
      const k = Math.max(0, 1 - s.t / (BOLT.life + FLASH.linger));
      if (s.light) s.light.intensity = FLASH.light * k * k * (s.t < BOLT.life ? 0.7 + 0.3 * Math.random() : 1);
    }
    const over = (s: Strike) => s.t >= BOLT.life + FLASH.linger;
    for (const s of this.strikes.filter(over)) {
      if (s.light) s.light.intensity = 0;
      this.draw(s, 0);
      for (const thing of [s.lines, s.glowColumn, s.ring, s.pool]) this.group.remove(thing);
      s.glowColumn.material.dispose();
      (s.ring.material as THREE.Material).dispose();
      (s.pool.material as THREE.Material).dispose();
    }
    this.strikes = this.strikes.filter(s => !over(s));
    for (const sp of this.sparks) {
      sp.t += dt;
      sp.v.y -= LAND.fall * dt;
      sp.sprite.position.addScaledVector(sp.v, dt);
      sp.sprite.material.opacity = Math.max(0, 1 - sp.t / sp.life);
    }
    for (const sp of this.sparks.filter(sp => sp.t >= sp.life)) { this.group.remove(sp.sprite); sp.sprite.material.dispose(); }
    this.sparks = this.sparks.filter(sp => sp.t < sp.life);
    for (const sc of this.scorches) {
      sc.t += dt;
      (sc.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * Math.max(0, 1 - sc.t / LAND.scorch);
    }
    for (const sc of this.scorches.filter(sc => sc.t >= LAND.scorch)) { this.group.remove(sc.mesh); (sc.mesh.material as THREE.Material).dispose(); }
    this.scorches = this.scorches.filter(sc => sc.t < LAND.scorch);
    // Over the patch nearest its bolt, a light gathering, quicker and quicker.
    const next = [...waiting].sort((a, b) => b.share - a.share)[0];
    this.gather.intensity = next ? GATHER.light * next.share * next.share * (0.85 + 0.15 * Math.sin(next.share * 60)) : 0;
    if (next) this.gather.position.copy(ground(next.x, next.y, GATHER.over));
  }
}
