import * as THREE from 'three';
import { ISO_Y } from '../machi/data';
import { flat } from './paint';
import { ground } from './space';

// The blood of the fallen: as one falls, drops flung from his chest that fly, fall and stay where
// they land, flattened into spots; once he is down, a pool spreading out from under him. They stay
// as long as he lies there. All the drops of all the dead are one mesh, and all the pools another,
// each a copy put where it goes: two draws however many lie on the field, in materials of the
// kind already made, so nothing is compiled when one falls.

/** The drops flung as he falls: how many, how fast out and up, how hard they fall, how big. */
const DROPS = { count: 28, out: [30, 120], up: [50, 130], fall: 400, size: [0.7, 1.6], spot: [1.2, 2.6] };
/** The pool: how wide it spreads (world units), how long it takes, how far it is lifted off the ground. */
const POOL = { wide: [24, 33], spreads: 3.5, lift: 0.7 };
/** Room for how many: beyond it the oldest is taken. */
const ROOM = { drops: 1500, pools: 60 };
const DARK = '#4e0807', RED = '#7a0e0a';

interface Flying { slot: number; at: THREE.Vector3; v: THREE.Vector3; size: number; spot: number; turn: number; owner: number }
interface Pool { slot: number; at: THREE.Vector3; wide: number; turn: number; stretch: number; t: number }

/** A pool's outline: a round, its edge in and out a little, bulging into a lobe or two. */
function puddle(): THREE.BufferGeometry {
  const shape = new THREE.Shape(), n = 28;
  const bumps = [0.13, 0.08, 0.05].map(a => ({ a, k: 2 + Math.floor(Math.random() * 4), phase: Math.random() * 6 }));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 1 + bumps.reduce((s, b) => s + b.a * Math.sin(b.k * t + b.phase), 0);
    if (i === 0) shape.moveTo(Math.cos(t) * r, Math.sin(t) * r);
    else shape.lineTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

export class Blood {
  readonly group = new THREE.Group();
  private readonly drops: THREE.InstancedMesh;
  private readonly pools: THREE.InstancedMesh;
  private flying: Flying[] = [];
  /** Each fallen's drops, as they lie, and his pool: by who he is. */
  private readonly lying = new Map<number, { drops: number[]; pool: Pool | null }>();
  private nextDrop = 0;
  private nextPool = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor() {
    // White, for each copy's own red to show as it is.
    const material = flat('#ffffff');
    // Laid over the ground's own pixels: drawn a little nearer than they lie.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    this.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, ROOM.drops);
    this.pools = new THREE.InstancedMesh(puddle(), material, ROOM.pools);
    for (const [mesh, room] of [[this.drops, ROOM.drops], [this.pools, ROOM.pools]] as const) {
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // None shown until one falls; each its own shade of red, from the first (for its material to be compiled as such).
      for (let i = 0; i < room; i++) {
        mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
        mesh.setColorAt(i, new THREE.Color(Math.random() < 0.5 ? DARK : RED).lerp(new THREE.Color(DARK), Math.random() * 0.5));
      }
    }
    this.group.add(this.pools, this.drops);
  }

  /** Someone falls, `who` (any number that is his alone): drops flung from `chest`, out every way and up. */
  splash(who: number, chest: THREE.Vector3): void {
    this.clear(who);
    this.lying.set(who, { drops: [], pool: null });
    const between = (r: number[]) => r[0] + Math.random() * (r[1] - r[0]);
    for (let i = 0; i < DROPS.count; i++) {
      const a = Math.random() * Math.PI * 2, out = between(DROPS.out);
      this.flying.push({
        slot: this.take('drop'), at: chest.clone(), owner: who,
        v: new THREE.Vector3(Math.cos(a) * out, between(DROPS.up), Math.sin(a) * out),
        size: between(DROPS.size), spot: between(DROPS.spot), turn: Math.random() * Math.PI * 2,
      });
    }
  }

  /** He is down, and his blood pools under him, round `at`; `spread` 0 to spread from nothing, 1 already spread. */
  pool(who: number, at: THREE.Vector3, spread = 0): void {
    const lies = this.lying.get(who) ?? { drops: [], pool: null };
    this.lying.set(who, lies);
    if (lies.pool) return;
    const wide = POOL.wide[0] + Math.random() * (POOL.wide[1] - POOL.wide[0]);
    lies.pool = { slot: this.take('pool'), at: ground(at.x, at.z * ISO_Y, POOL.lift), wide, turn: Math.random() * Math.PI * 2, stretch: 0.8 + Math.random() * 0.4, t: spread * POOL.spreads };
    this.lay(lies.pool);
  }

  /** His blood is gone: he is up again, or taken off the field. */
  clear(who: number): void {
    const lies = this.lying.get(who);
    if (!lies) return;
    for (const slot of lies.drops) this.drops.setMatrixAt(slot, this.m.makeScale(0, 0, 0));
    if (lies.pool) this.pools.setMatrixAt(lies.pool.slot, this.m.makeScale(0, 0, 0));
    this.flying = this.flying.filter(f => f.owner !== who || (this.drops.setMatrixAt(f.slot, this.m.makeScale(0, 0, 0)), false));
    this.lying.delete(who);
    this.drops.instanceMatrix.needsUpdate = this.pools.instanceMatrix.needsUpdate = true;
  }

  update(dt: number): void {
    if (this.flying.length) {
      for (const f of this.flying) {
        f.v.y -= DROPS.fall * dt;
        f.at.addScaledVector(f.v, dt);
        const floor = ground(f.at.x, f.at.z * ISO_Y, 0.5).y;
        if (f.at.y <= floor) {
          // Landed: a flat spot, there for as long as he lies.
          f.at.y = floor;
          this.q.setFromAxisAngle(this.up, f.turn);
          this.drops.setMatrixAt(f.slot, this.m.compose(f.at, this.q, this.s.set(f.spot, 0.12, f.spot * (0.6 + Math.random() * 0.5))));
          this.lying.get(f.owner)?.drops.push(f.slot);
          f.v.set(0, 0, 0);
          f.size = -1;
        } else {
          this.drops.setMatrixAt(f.slot, this.m.compose(f.at, this.q.identity(), this.s.setScalar(f.size)));
        }
      }
      this.flying = this.flying.filter(f => f.size >= 0);
      this.drops.instanceMatrix.needsUpdate = true;
    }
    let spreading = false;
    for (const { pool } of this.lying.values()) {
      if (!pool || pool.t >= POOL.spreads) continue;
      pool.t = Math.min(POOL.spreads, pool.t + dt);
      this.lay(pool);
      spreading = true;
    }
    if (spreading) this.pools.instanceMatrix.needsUpdate = true;
  }

  /** A pool as far as it has spread: quickly at first, slowly at the last. */
  private lay(pool: Pool): void {
    const k = pool.t / POOL.spreads, r = pool.wide * (0.15 + 0.85 * (1 - (1 - k) * (1 - k) * (1 - k)));
    this.q.setFromAxisAngle(this.up, pool.turn);
    this.pools.setMatrixAt(pool.slot, this.m.compose(pool.at, this.q, this.s.set(r * pool.stretch, 1, r)));
    this.pools.instanceMatrix.needsUpdate = true;
  }

  /** The next free copy of a drop or a pool, round and round: past the room, the oldest is taken. */
  private take(kind: 'drop' | 'pool'): number {
    if (kind === 'drop') return this.nextDrop = (this.nextDrop + 1) % ROOM.drops;
    return this.nextPool = (this.nextPool + 1) % ROOM.pools;
  }
}
