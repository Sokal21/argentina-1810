import * as THREE from 'three';
import { BALL, type BoltKind } from '../bolts';
import { ISO_Y } from '../machi/data';
import { MUSKET } from '../machi/musket';
import { Billboards } from './billboards';
import { retire } from './paint';
import { ground } from './space';

// The musket going off, as the 2D game reckons it and with what 3D can add: a flash at the muzzle
// that really lights him and the ground, a gush of smoke that swells, rises and thins, the ball as
// a short bright streak along the line of the shot, out to a ball's reach; and, where it strikes,
// the blast: a ring opening over the ground as wide as the blast hurts, and dust.

const FLASH = { colour: '#ffd27a', light: 9, reach: 160, life: 0.08, size: 9 };
// The smoke leaves the muzzle in a jet along the barrel, slows, swells and rises: born ahead of it
// and spread wide, it did not seem to come from the muzzle.
const SMOKE = { puffs: 10, life: 1.4, from: 1.5, to: 12, rise: 14, jet: 170, spread: 10, colour: '#b9b2a3' };
const STREAK = { length: 46, colour: '#fff1c4' };
/**
 * A tracer (Roca's burst, the user's "balas trazadoras"): the ball a hot glowing head, and behind it a
 * trail of glow thinning and dimming along its streak, all added as light. How many glows are kept in
 * all, how big the head and how big the trail at its start, how many glows in a trail, how long it is,
 * and its colours, from the head back.
 */
const TRACER = { kept: 160, head: 9, trail: 6, glows: 7, length: 70, colours: ['#fff2c0', '#ffc860', '#ff8a2a', '#e0501a'] };
const BLAST = { life: 0.45, colour: '#ffb45a', dust: 10, dustColour: '#a0906a', dustLife: 0.9 };
/** A ball striking someone: specks of blood flung on the way it went and falling, and a puff of dust off his coat. */
const WOUND = { specks: 14, colours: ['#8a1410', '#b0201a', '#5a0c08'], speed: [40, 130], up: [30, 90], fall: 380, life: [0.45, 0.8], dust: 4, dustColour: '#9a8f7a' };

/** A tracer's glow: a soft round light, white at its heart. */
let soft: THREE.Texture | null = null;
function softGlow(): THREE.Texture {
  if (soft) return soft;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, light = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  light.addColorStop(0, 'rgba(255,255,255,1)');
  light.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  return soft = new THREE.CanvasTexture(canvas);
}

/** Where a ball, flying from one spot of the 2D ground to another, strikes something: or null. */
export type Strikes = (from: { x: number; y: number }, to: { x: number; y: number }) => { x: number; y: number } | null;

interface Ball { at: THREE.Vector3; way: THREE.Vector3; flown: number; streak: THREE.Line; glows: number[] }
interface Puff { mesh: THREE.Mesh; t: number; life: number; v: THREE.Vector3; from: number; to: number; falls?: boolean }

export class Shots {
  readonly group = new THREE.Group();
  private readonly light = new THREE.PointLight(FLASH.colour, 0, FLASH.reach, 1.5);
  private readonly flash: THREE.Mesh;
  private flashing = 0;
  private balls: Ball[] = [];
  private puffs: Puff[] = [];
  private blasts: { ring: THREE.LineLoop; t: number }[] = [];
  private readonly puffShape = new THREE.IcosahedronGeometry(1, 0);
  /** The tracers' glows, one mesh for all of them (only for one that fires tracers). */
  private readonly tracers: Billboards | null;

  /**
   * `bursts`: whether a ball bursts where it strikes, as his does; a royalist's only stops there.
   * `kind`: how fast and how far it flies, as the 2D game's (his ball, or the royalists' slower shot).
   */
  constructor(
    private readonly camera: THREE.Camera, private readonly strikes: Strikes, private readonly blasted: (at: { x: number; y: number }) => void,
    private readonly bursts = true, private readonly kind: Pick<BoltKind, 'speed' | 'range'> = BALL,
    tracers = false,
  ) {
    this.tracers = tracers ? new Billboards(TRACER.kept, softGlow(), true) : null;
    if (this.tracers) this.group.add(this.tracers.mesh);
    this.light.castShadow = false;
    this.flash = new THREE.Mesh(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicMaterial({
      color: FLASH.colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flash.visible = false;
    this.group.add(this.light, this.flash);
  }

  /** The musket goes off at `muzzle`, along `way` (level, on the ground plane). */
  fire(muzzle: THREE.Vector3, way: THREE.Vector3): void {
    const flat = new THREE.Vector3(way.x, 0, way.z).normalize();
    this.flashing = FLASH.life;
    this.light.position.copy(muzzle);
    this.flash.position.copy(muzzle).addScaledVector(flat, 4);
    for (let i = 0; i < SMOKE.puffs; i++) {
      const v = flat.clone().multiplyScalar(SMOKE.jet * (0.25 + Math.random() * 0.75))
        .add(new THREE.Vector3((Math.random() - 0.5) * SMOKE.spread, SMOKE.rise * Math.random(), (Math.random() - 0.5) * SMOKE.spread));
      const mesh = new THREE.Mesh(this.puffShape, new THREE.MeshLambertMaterial({ color: SMOKE.colour, transparent: true, depthWrite: false }));
      mesh.position.copy(muzzle).addScaledVector(flat, Math.random() * 2);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.group.add(mesh);
      this.puffs.push({ mesh, t: 0, life: SMOKE.life * (0.7 + Math.random() * 0.5), v, from: SMOKE.from, to: SMOKE.to * (0.7 + Math.random() * 0.6) });
    }
    const streak = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: STREAK.colour, transparent: true }));
    streak.frustumCulled = false;
    this.group.add(streak);
    // A tracer's glows, its head first: as many as are free.
    const glows: number[] = [];
    if (this.tracers) {
      for (let i = 0; i < TRACER.glows; i++) {
        const g = this.tracers.free();
        if (g < 0) break;
        this.tracers.colour(g, TRACER.colours[Math.min(TRACER.colours.length - 1, Math.floor(i * TRACER.colours.length / TRACER.glows))]);
        this.tracers.put(g, muzzle, 0, 0);
        glows.push(g);
      }
    }
    this.balls.push({ at: muzzle.clone(), way: flat, flown: 0, streak, glows });
  }

  /**
   * The ball nearest a spot has struck someone there (the 2D game says so): it stops, and blood
   * and dust fly off him on the way it went.
   */
  stop(at: THREE.Vector3): void {
    let nearest: Ball | null = null, least = Infinity;
    for (const ball of this.balls) {
      const far = Math.hypot(ball.at.x - at.x, ball.at.z - at.z);
      if (ball.flown < this.kind.range && far < least) { least = far; nearest = ball; }
    }
    const way = nearest?.way ?? new THREE.Vector3(0, 0, 1);
    // It is drawn last reaching him.
    if (nearest) { nearest.flown = this.kind.range; nearest.at.set(at.x, nearest.at.y, at.z); }
    const between = (r: number[]) => r[0] + Math.random() * (r[1] - r[0]);
    for (let i = 0; i < WOUND.specks; i++) {
      const v = way.clone().multiplyScalar(between(WOUND.speed))
        .add(new THREE.Vector3((Math.random() - 0.5) * 70, between(WOUND.up), (Math.random() - 0.5) * 70));
      const mesh = new THREE.Mesh(this.puffShape, new THREE.MeshBasicMaterial({ color: WOUND.colours[i % WOUND.colours.length], transparent: true, depthWrite: false }));
      mesh.position.copy(at);
      this.group.add(mesh);
      const size = 0.9 + Math.random() * 0.9;
      this.puffs.push({ mesh, t: 0, life: between(WOUND.life), v, from: size, to: size * 0.7, falls: true });
    }
    for (let i = 0; i < WOUND.dust; i++) {
      const v = way.clone().multiplyScalar(20 + Math.random() * 30).add(new THREE.Vector3((Math.random() - 0.5) * 20, 10 + Math.random() * 15, (Math.random() - 0.5) * 20));
      const mesh = new THREE.Mesh(this.puffShape, new THREE.MeshLambertMaterial({ color: WOUND.dustColour, transparent: true, depthWrite: false }));
      mesh.position.copy(at);
      this.group.add(mesh);
      this.puffs.push({ mesh, t: 0, life: 0.6 + Math.random() * 0.3, v, from: 1.5, to: 5 });
    }
  }

  /** One fired, striking someone and bursting, at a spot out of sight, for its materials to be compiled before play. */
  warm(at: { x: number; y: number }): void {
    const spot = ground(at.x, at.y, 40);
    this.fire(spot, new THREE.Vector3(1, 0, 0));
    this.stop(spot);
    this.blast(at);
    this.flash.visible = true;
  }

  update(dt: number): void {
    // The flash: gone in a few frames, its light with it.
    this.flashing = Math.max(0, this.flashing - dt);
    const k = this.flashing / FLASH.life;
    this.light.intensity = FLASH.light * k * k * 1000;
    this.flash.visible = k > 0;
    this.flash.scale.setScalar(FLASH.size * (0.6 + k));
    this.flash.quaternion.copy(this.camera.quaternion);
    (this.flash.material as THREE.MeshBasicMaterial).opacity = k;

    for (const ball of this.balls) {
      const step = Math.min(this.kind.speed * dt, this.kind.range - ball.flown);
      const from = ball.at.clone(), to = ball.at.clone().addScaledVector(ball.way, step);
      const struck = this.strikes({ x: from.x, y: from.z * ISO_Y }, { x: to.x, y: to.z * ISO_Y });
      ball.flown += step;
      if (struck) {
        ball.flown = this.kind.range;
        to.set(struck.x, from.y, struck.y / ISO_Y);
        if (this.bursts) this.blast(struck);
      }
      ball.at.copy(to);
      const tail = to.clone().addScaledVector(ball.way, -Math.min(STREAK.length, ball.flown));
      const p = ball.streak.geometry.getAttribute('position') as THREE.BufferAttribute;
      p.setXYZ(0, tail.x, tail.y, tail.z);
      p.setXYZ(1, to.x, to.y, to.z);
      p.needsUpdate = true;
      // Its glows along its streak, from its head back, thinning and dimming.
      const behind = Math.min(TRACER.length, ball.flown);
      ball.glows.forEach((g, i) => {
        const k = i / Math.max(1, TRACER.glows - 1);
        const at = to.clone().addScaledVector(ball.way, -behind * k);
        this.tracers?.put(g, at, i === 0 ? TRACER.head : TRACER.trail * (1 - k * 0.7), i === 0 ? 1 : 0.9 * (1 - k));
      });
    }
    for (const ball of this.balls.filter(b => b.flown >= this.kind.range)) for (const g of ball.glows) this.tracers?.hide(g);
    this.tracers?.commit();
    for (const ball of this.balls.filter(b => b.flown >= this.kind.range)) {
      retire(this.group, [ball.streak], true);
    }
    this.balls = this.balls.filter(b => b.flown < this.kind.range);

    for (const puff of this.puffs) {
      puff.t += dt;
      const s = puff.t / puff.life;
      puff.mesh.position.addScaledVector(puff.v, dt);
      if (puff.falls) {
        // A speck flung off: it flies on and falls, and lies where it lands.
        puff.v.y -= WOUND.fall * dt;
        if (puff.mesh.position.y < 0.5) { puff.mesh.position.y = 0.5; puff.v.set(0, 0, 0); }
      } else {
        // The jet dies quickly; then it drifts up.
        puff.v.multiplyScalar(Math.max(0, 1 - dt * 4));
        puff.v.y += 9 * dt;
      }
      puff.mesh.scale.setScalar(puff.from + (puff.to - puff.from) * (1 - (1 - s) * (1 - s)));
      (puff.mesh.material as THREE.MeshLambertMaterial).opacity = 0.85 * (1 - s);
    }
    for (const puff of this.puffs.filter(p => p.t >= p.life)) {
      retire(this.group, [puff.mesh]);
    }
    this.puffs = this.puffs.filter(p => p.t < p.life);

    for (const blast of this.blasts) {
      blast.t += dt;
      const s = Math.min(1, blast.t / BLAST.life);
      blast.ring.scale.setScalar(MUSKET.radius * (1 - (1 - s) * (1 - s)));
      (blast.ring.material as THREE.LineBasicMaterial).opacity = 1 - s;
    }
    for (const blast of this.blasts.filter(b => b.t >= BLAST.life)) {
      retire(this.group, [blast.ring], true);
    }
    this.blasts = this.blasts.filter(b => b.t < BLAST.life);
  }

  /** The ball bursts at a spot of the 2D ground: the ring of its blast, dust, and whatever it hurts. */
  private blast(at: { x: number; y: number }): void {
    const points = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    });
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: BLAST.colour, transparent: true, depthWrite: false }));
    ring.position.copy(ground(at.x, at.y, 0.6));
    ring.frustumCulled = false;
    this.group.add(ring);
    this.blasts.push({ ring, t: 0 });
    const spot = ground(at.x, at.y, 2);
    for (let i = 0; i < BLAST.dust; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * 60, 25 + Math.random() * 30, Math.sin(a) * 60);
      const mesh = new THREE.Mesh(this.puffShape, new THREE.MeshLambertMaterial({ color: BLAST.dustColour, transparent: true, depthWrite: false }));
      mesh.position.copy(spot);
      this.group.add(mesh);
      this.puffs.push({ mesh, t: 0, life: BLAST.dustLife * (0.6 + Math.random() * 0.6), v, from: 2, to: 8 + Math.random() * 5 });
    }
    this.blasted(at);
  }
}
