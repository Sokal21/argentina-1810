import * as THREE from 'three';
import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';
import type { BuildingModel } from './buildings';
import { model } from './figure';
import { flat } from './paint';
import { ground, UPRIGHT } from './space';

// A building with a model of its own, and a room inside it that is gone into without a cut. The
// room's walls are the model's own: as soon as someone stands within them its roof is lifted off
// (cut away from the ridge down to the top of the walls) and its front wall is cut down low but for
// its foot, door and all; stepping out, they come back. So the walls seen from within are the very
// walls seen from without, plaster, stains and all (plain walls of its own looked another house).
// Within them: a floor, and what stands in the room. Everything is laid out in the building's own
// frame: x along its length, z out of its front, y up.

/** Seconds the roof takes to lift off or come back; how high the front wall's foot stands while inside, as a share of the walls. */
const LIFT = 0.3, LOW = 0.22;
/** How far in from a wall whoever walks is kept (half how wide they stand). */
const KEEP = 7;
/** The warm light within, as from its fire: kept always and dark when nobody is inside (a light come and gone rebuilds every material). */
const HEARTH = { colour: '#ffae6a', strength: 520, reach: 380, high: 90 };
/** How far within the front wall's inside face its window reaches. */
const REVEAL = 16;
/** Where a cut stands when it cuts nothing: far above, or far in front. */
const AWAY = 1e5;

export class House {
  readonly group = new THREE.Group();
  /** A copy of the building showing only its front wall's foot, while inside. */
  private foot: THREE.Object3D | null = null;
  private readonly room = new THREE.Group();
  private readonly hearth = new THREE.PointLight(HEARTH.colour, 0, HEARTH.reach, 1.2);
  /** How far the roof has lifted: 0 standing, 1 off. */
  private lifted = 0;
  /**
   * The cuts, in the world: the building's above a height and in front of its front wall's inside;
   * the foot's behind that and above the foot's height. Always there, put far off when they cut
   * nothing: a material whose number of cuts changes is built anew.
   */
  private readonly roofCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), AWAY);
  private readonly frontCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), AWAY);
  private readonly behindCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), AWAY);
  private readonly footCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), AWAY);
  /** And its underside, never seen from outside but seen from within over the floor: cut always. */
  private readonly undersideCut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  /** The walls as boxes in the building's frame, which nobody walks through. */
  private readonly walls: { x: number; z: number; hw: number; hd: number }[] = [];

  constructor(private readonly where: { x: number; y: number; turn: number }, private readonly spec: BuildingModel) {
    this.group.position.copy(ground(where.x, where.y));
    this.group.rotation.y = where.turn;
    const inside = spec.inside;
    void model(spec.url, spec.tall / UPRIGHT).then(shape => {
      this.group.add(shape);
      if (!inside) return;
      const cut = (o: THREE.Object3D, planes: THREE.Plane[]) => o.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const material = (node.material as THREE.Material).clone();
        // Cut open, its walls are seen from within too; and the roof's shadow goes with the roof.
        material.side = THREE.DoubleSide;
        material.clippingPlanes = planes;
        material.clipShadows = true;
        node.material = material;
      });
      const foot = shape.clone(true);
      cut(shape, [this.roofCut, this.frontCut, this.undersideCut]);
      cut(foot, [this.behindCut, this.footCut, this.undersideCut]);
      foot.visible = false;
      this.foot = foot;
      this.group.add(foot);
    });
    if (!inside) return;
    const { long, deep, thick } = inside.walls;
    // The floor, out under the walls (within them it left the ground showing at their foot).
    const floor = new THREE.Mesh(new THREE.BoxGeometry(long, 1, deep), flat(inside.floor));
    floor.position.y = 0.5;
    floor.receiveShadow = true;
    this.room.add(floor);
    // The walls nobody walks through: the back and the two ends; the front either side of the door.
    const wall = (x: number, z: number, w: number, d: number) => this.walls.push({ x, z, hw: w / 2, hd: d / 2 });
    wall(0, -deep / 2 + thick / 2, long, thick);
    wall(-long / 2 + thick / 2, 0, thick, deep);
    wall(long / 2 - thick / 2, 0, thick, deep);
    const { x: door, wide } = inside.door, left = door - wide / 2, right = door + wide / 2;
    wall((-long / 2 + left) / 2, deep / 2 - thick / 2, left + long / 2, thick);
    wall((right + long / 2) / 2, deep / 2 - thick / 2, long / 2 - right, thick);
    // What stands in it, turned and set where it goes, let down so its slab's top is the floor; and
    // the rest of the floor painted with that slab's own earth.
    void model(inside.furniture, inside.scale / UPRIGHT).then(shape => {
      shape.rotation.y = inside.turn;
      shape.position.set(inside.at[0], 1 - inside.slab, inside.at[1]);
      this.room.add(shape);
      shape.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const uv = floor.geometry.getAttribute('uv') as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, inside.earth[0], inside.earth[1]);
        uv.needsUpdate = true;
        floor.material = node.material;
      });
    });
    // Always there: its doorway is open, and from outside the room is seen through it, in the dark.
    this.hearth.position.set(inside.at[0], HEARTH.high, 0);
    this.group.add(this.room, this.hearth);
  }

  /** Puts the cuts where the roof has lifted to, in the world. */
  private place(): void {
    const inside = this.spec.inside;
    if (!inside) return;
    const { tall, deep, thick } = inside.walls, base = this.group.position.y, k = this.lifted;
    const out = new THREE.Vector3(Math.sin(this.where.turn), 0, Math.cos(this.where.turn)), along = out.dot(this.group.position);
    // From the ridge down to the top of the walls as it lifts; nowhere while it stands.
    this.roofCut.constant = k > 0 ? base + this.spec.tall + (tall - this.spec.tall) * k : AWAY;
    // The front wall, from a little within its inside face outward (its window's sill and bars reach
    // in that far, and were left floating), cut away while lifted; its foot alone shown then.
    const face = deep / 2 - thick - REVEAL;
    if (k > 0) this.frontCut.set(out.clone().negate(), along + face);
    else this.frontCut.set(new THREE.Vector3(0, -1, 0), AWAY);
    this.behindCut.set(out.clone(), -(along + face));
    // The front, wiped down as the roof is lifted: from the ridge (all of it, its eaves too) to its foot.
    this.footCut.set(new THREE.Vector3(0, -1, 0), base + this.spec.tall + (tall * LOW - this.spec.tall) * k);
    this.undersideCut.constant = -(base + 1.5);
    if (this.foot) this.foot.visible = k > 0;
  }

  /** A spot of the 2D ground in the building's frame. */
  private local(at: Vec): { x: number; z: number } {
    const dx = at.x - this.where.x, dz = (at.y - this.where.y) / ISO_Y, c = Math.cos(this.where.turn), s = Math.sin(this.where.turn);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  /** Whether a spot of the 2D ground is within its walls. */
  within(at: Vec): boolean {
    const walls = this.spec.inside?.walls;
    if (!walls) return false;
    const p = this.local(at);
    return Math.abs(p.x) < walls.long / 2 && Math.abs(p.z) < walls.deep / 2;
  }

  /** Whether a spot is in a wall, or too near one to stand. */
  private inWall(at: Vec): boolean {
    const p = this.local(at);
    return this.walls.some(w => Math.abs(p.x - w.x) < w.hw + KEEP && Math.abs(p.z - w.z) < w.hd + KEEP);
  }

  /** Keeps a step from going through its walls, sliding along them: in and out only by the door. */
  hold(from: Vec, to: Vec): Vec {
    if (!this.inWall(to)) return to;
    if (!this.inWall({ x: to.x, y: from.y })) return { x: to.x, y: from.y };
    if (!this.inWall({ x: from.x, y: to.y })) return { x: from.x, y: to.y };
    return from;
  }

  /** Shows it as whoever is played has it: from outside, or from within its walls with its roof lifted off. */
  update(dt: number, at: Vec | null): void {
    if (!this.spec.inside) return;
    const want = at && this.within(at) ? 1 : 0;
    if (this.lifted !== want) {
      this.lifted = want > this.lifted ? Math.min(1, this.lifted + dt / LIFT) : Math.max(0, this.lifted - dt / LIFT);
    }
    this.place();
    this.hearth.intensity = HEARTH.strength * this.lifted;
  }
}
