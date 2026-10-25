import * as THREE from 'three';
import { NAHUEL } from '../nahuel/brain';
import { soft } from './orbs';
import { glow } from './realista';
import { UPRIGHT } from './space';

// Inti calling up her nahuel in 3D: she beats her kultrún and the light of her spirit gathers about her.
// A pool of its cyan opens on the ground, a soft column of it stands over her, motes rise round her in a
// spiral; each beat throws a ring out over the ground and her light leaps with it; and as the nahuel
// comes, on the last beat, a shaft of that light runs from her to where it comes out, and flares there.
// One light, made once, lent to the flare when the nahuel comes.

const CYAN = new THREE.Color('#46e6fa'), PALE = new THREE.Color('#bef8fc');
/** While she calls: the pool's widest, the column, the motes, the light (steady, and the leap of a beat). */
const CALL = { pool: 150, column: [44, 130 * UPRIGHT], motes: 110, round: 24, high: 110 * UPRIGHT, moteLife: 0.8, light: 1200, beatLight: 3200, reach: 260, over: 45 };
/** The beats, as shares of the call: the last when the nahuel comes. How long a beat's leap and ring last, and how wide the ring opens. */
const BEATS = [0.12, 0.34, NAHUEL.comes / NAHUEL.call], BEAT = { life: 0.45, ring: 80 };
/** As it comes: the shaft's life, the flare's size, its light. */
const COMES = { life: 0.5, flare: 90, light: 5000 };

interface Mote { sprite: THREE.Sprite; t: number; life: number; a: number; r: number; spin: number; rise: number; about: THREE.Vector3 | null }
interface Ring { mesh: THREE.Mesh; t: number; wide: number }

export class Calling3D {
  readonly group = new THREE.Group();
  private readonly light = new THREE.PointLight(CYAN, 0, CALL.reach, 1.2);
  private readonly pool: THREE.Mesh;
  private readonly column: THREE.Sprite;
  private readonly ringShape = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private motes: Mote[] = [];
  private rings: Ring[] = [];
  /** The shaft from her to where the nahuel comes out, and the flare there, while they last. */
  private shaft: { lines: THREE.Group; flare: THREE.Sprite; at: THREE.Vector3; t: number } | null = null;
  private beaten = 0;
  private beat = Infinity;
  private time = 0;

  constructor() {
    this.light.castShadow = false;
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28).rotateX(-Math.PI / 2), this.additive(soft(), CYAN));
    this.column = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.column.center.set(0.5, 0.15);
    this.pool.visible = this.column.visible = false;
    this.group.add(this.light, this.pool, this.column);
  }

  private additive(map: THREE.Texture | null, colour: THREE.Color): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ map, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  }

  /** A mote rising round a spot: round her feet (null, wherever she is), or round a fixed one. */
  private mote(feet: THREE.Vector3, life: number, rise: number, r: number, about: THREE.Vector3 | null = null): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: Math.random() < 0.3 ? PALE : CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sprite.scale.setScalar(4 + Math.random() * 3);
    sprite.position.copy(feet);
    this.group.add(sprite);
    this.motes.push({ sprite, t: 0, life, a: Math.random() * Math.PI * 2, r, spin: 2 + Math.random() * 2, rise, about });
  }

  private ring(at: THREE.Vector3, wide: number): void {
    const mesh = new THREE.Mesh(this.ringShape, this.additive(null, PALE));
    mesh.position.copy(at).y += 0.8;
    this.group.add(mesh);
    this.rings.push({ mesh, t: 0, wide });
  }

  /** Each step: `feet`, where she stands; `share`, how far into her call (null when she is not calling). */
  update(dt: number, feet: THREE.Vector3, share: number | null): void {
    this.time += dt;
    const on = share !== null, k = share ?? 0;
    if (!on) this.beaten = 0;
    // Each beat as the call passes it: a ring out over the ground, and the light leaps.
    while (on && this.beaten < BEATS.length && k >= BEATS[this.beaten]) {
      this.beaten++;
      this.beat = 0;
      this.ring(feet, BEAT.ring);
      for (let i = 0; i < 10; i++) this.mote(feet, 0.4 + Math.random() * 0.3, CALL.high * 0.6, CALL.round * (0.5 + Math.random()));
    }
    this.beat += dt;
    const leap = Math.max(0, 1 - this.beat / BEAT.life);
    this.pool.visible = this.column.visible = on;
    if (on) {
      const open = Math.min(1, k / 0.2);
      this.pool.position.copy(feet).y += 0.6;
      this.pool.scale.setScalar(CALL.pool * open * (1 + 0.15 * leap));
      (this.pool.material as THREE.MeshBasicMaterial).opacity = open;
      this.column.position.copy(feet);
      this.column.scale.set(CALL.column[0] * open * (1 + 0.3 * leap), CALL.column[1], 1);
      this.column.material.opacity = (0.35 + 0.35 * leap) * open;
      if (Math.random() < dt * CALL.motes) this.mote(feet, CALL.moteLife * (0.6 + Math.random() * 0.6), CALL.high, CALL.round * (0.4 + Math.random() * 0.6));
    }
    // Her light: steady while she calls, leaping on each beat; or lent to the flare where the nahuel comes.
    const s = this.shaft;
    const flare = s ? Math.max(0, 1 - s.t / COMES.life) : 0;
    if (s && flare > 0 && !on) {
      this.light.position.copy(s.at).y += CALL.over;
      this.light.intensity = COMES.light * flare * flare;
    } else {
      this.light.position.copy(feet).y += CALL.over;
      this.light.intensity = on ? CALL.light * Math.min(1, k * 3) + CALL.beatLight * leap * leap : 0;
    }
    if (s) {
      s.t += dt;
      for (const line of s.lines.children) ((line as THREE.Line).material as THREE.LineBasicMaterial).opacity = flare * (line.userData.alpha as number);
      s.flare.material.opacity = flare;
      s.flare.scale.setScalar(COMES.flare * (0.5 + 0.5 * (1 - flare)));
      if (s.t >= COMES.life) {
        this.group.remove(s.lines, s.flare);
        for (const line of s.lines.children) { ((line as THREE.Line).material as THREE.Material).dispose(); (line as THREE.Line).geometry.dispose(); }
        s.flare.material.dispose();
        this.shaft = null;
      }
    }
    for (const r of this.rings) {
      r.t += dt;
      const u = Math.min(1, r.t / BEAT.life);
      r.mesh.scale.setScalar(r.wide * (0.2 + 0.8 * u));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - u;
    }
    for (const r of this.rings.filter(r => r.t >= BEAT.life)) { this.group.remove(r.mesh); (r.mesh.material as THREE.Material).dispose(); }
    this.rings = this.rings.filter(r => r.t < BEAT.life);
    for (const m of this.motes) {
      m.t += dt;
      const u = m.t / m.life;
      m.a += m.spin * dt;
      const c = m.about ?? feet;
      m.sprite.position.set(c.x + Math.cos(m.a) * m.r, c.y + u * m.rise, c.z + Math.sin(m.a) * m.r);
      m.sprite.material.opacity = Math.min(1, u * 8) * (1 - u * u);
    }
    for (const m of this.motes.filter(m => m.t >= m.life)) { this.group.remove(m.sprite); m.sprite.material.dispose(); }
    this.motes = this.motes.filter(m => m.t < m.life);
  }

  /** The nahuel comes out at `at`, called from her at `from` (her chest): the shaft between, and the flare. */
  comes(from: THREE.Vector3, at: THREE.Vector3): void {
    if (this.shaft) return;
    const to = at.clone().setY(at.y + 20);
    // Strokes side by side across the screen, as the lightning's: a wide faint one, a bright one, a white core.
    const lines = new THREE.Group();
    for (const [dy, colour, alpha] of [[-2, CYAN, 0.35], [2, CYAN, 0.35], [-1, PALE, 0.75], [1, PALE, 0.75], [0, new THREE.Color('#ffffff'), 1]] as [number, THREE.Color, number][]) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone().setY(from.y + dy), to.clone().setY(to.y + dy)]),
        new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: alpha, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      line.userData.alpha = alpha;
      line.frustumCulled = false;
      lines.add(line);
    }
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: CYAN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flare.position.copy(to);
    this.group.add(lines, flare);
    this.shaft = { lines, flare, at: at.clone(), t: 0 };
    this.ring(at, BEAT.ring * 1.2);
    for (let i = 0; i < 24; i++) this.mote(at, 0.5 + Math.random() * 0.4, CALL.high * 0.8, CALL.round * (0.3 + Math.random()), at.clone());
  }
}
