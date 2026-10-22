import * as THREE from 'three';
import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';
import type { BuildingModel } from './buildings';
import { asks } from './asks';
import { model } from './figure';
import { Motion } from './motion';
import { flat } from './paint';
import { ground, UPRIGHT } from './space';

// A building with a model of its own, and a room inside it that is gone into without a cut. The
// room's walls are the model's own: as soon as someone stands within them its roof is lifted off
// (cut away from the ridge down to the top of the walls) and its front wall is cut down low but for
// its foot, door and all, and, where it is asked for, so is a side wall that faces the camera too,
// with whatever stands beyond it (a lean-to); stepping out, they come back. So the walls seen from within are the very
// walls seen from without, plaster, stains and all (plain walls of its own looked another house).
// Within them: a floor, and what stands in the room. Everything is laid out in the building's own
// frame: x along its length, z out of its front, y up.

/** Seconds the roof takes to lift off or come back; how high the front wall's foot stands while inside, as a share of the walls. */
const LIFT = 0.3, LOW = 0.22;
/** How far in from a wall whoever walks is kept (half how wide they stand). */
const KEEP = 7;
/**
 * The light within (its fire, its candles: the building's `light`) is kept always and dark when
 * nobody is inside: a light come and gone rebuilds every material. It wavers as a flame does; its
 * flames' glows are this wide.
 */
const FLAME = { wide: 7, colour: '#ffcf80' };
/** How far within the front wall's inside face its window reaches. */
const REVEAL = 16;
/** The sign over a keeper: how high over the floor, and how near (on the 2D ground) whoever comes must be before it gives way to what F does. */
const ASK = { over: 122, near: 110 };
/** How far round toward the camera a side wall's outside must turn (the sine of its turn) to be cut like the front. */
const SIDEWAYS = 0.25;
/** Where a cut stands when it cuts nothing: far above, or far in front. */
const AWAY = 1e5;

/** A flame's glow: a soft round light, white at its heart, made once. */
let glowing: THREE.Texture | null = null;
function glow(): THREE.Texture {
  if (glowing) return glowing;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, light = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  light.addColorStop(0, 'rgba(255,255,255,1)');
  light.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = light;
  g.fillRect(0, 0, size, size);
  return glowing = new THREE.CanvasTexture(canvas);
}

export class House {
  readonly group = new THREE.Group();
  /** A copy of the building showing only its front wall's foot, while inside; and one for its side wall's. */
  private foot: THREE.Object3D | null = null;
  private sideFoot: THREE.Object3D | null = null;
  /** Which side wall faces the camera as well as the front (its length's way, +1 or -1), if either does. */
  private readonly side: number;
  private readonly room = new THREE.Group();
  private readonly hearth = new THREE.PointLight('#ffffff', 0, 1, 1.2);
  private readonly flames: THREE.Sprite[] = [];
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
  /** The same for the side wall that faces the camera: beyond its inside face, cut; its foot's copy, kept beyond it. */
  private readonly sideCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), AWAY);
  private readonly besideCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), AWAY);
  /** And its underside, never seen from outside but seen from within over the floor: cut always. */
  private readonly undersideCut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  /** The walls as boxes in the building's frame, which nobody walks through. */
  private readonly walls: { x: number; z: number; hw: number; hd: number }[] = [];
  /** Who keeps it, standing within, and how they move. */
  private keeper: { body: THREE.Object3D; motion: Motion; facing: number } | null = null;
  /**
   * The sign over their head that they can be talked to, bobbing; and the clock it bobs by. Not in
   * the house's group but in the view's `over`, whoever draws it adding it there: it is placed in the world.
   */
  readonly ask = asks();
  private time = 0;

  constructor(private readonly where: { x: number; y: number; turn: number }, private readonly spec: BuildingModel) {
    this.group.position.copy(ground(where.x, where.y));
    this.group.rotation.y = where.turn;
    this.ask.visible = false;
    // The camera looks from +Z: a side whose outside turns that way hides the room as the front does.
    const toward = spec.inside?.side ? -Math.sin(where.turn) : 0;
    this.side = toward > SIDEWAYS ? 1 : toward < -SIDEWAYS ? -1 : 0;
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
      const foot = shape.clone(true), sideFoot = this.side ? shape.clone(true) : null;
      cut(shape, [this.roofCut, this.frontCut, this.sideCut, this.undersideCut]);
      cut(foot, [this.behindCut, this.footCut, this.undersideCut]);
      foot.visible = false;
      this.foot = foot;
      this.group.add(foot);
      if (sideFoot) {
        cut(sideFoot, [this.besideCut, this.footCut, this.undersideCut]);
        sideFoot.visible = false;
        this.sideFoot = sideFoot;
        this.group.add(sideFoot);
      }
    });
    if (!inside) return;
    const { long, deep, thick } = inside.walls;
    // The floor, out under the walls (within them it left the ground showing at their foot).
    const floor = new THREE.Mesh(new THREE.BoxGeometry(long, 1, deep), flat(inside.floor));
    floor.position.y = 0.5;
    // Lit from within, not by the moon through its walls: the room takes none of the world's shadow.
    floor.receiveShadow = false;
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
        node.receiveShadow = false;
        const uv = floor.geometry.getAttribute('uv') as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, inside.earth[0], inside.earth[1]);
        uv.needsUpdate = true;
        floor.material = node.material;
      });
    });
    // Always there: its doorway is open, and from outside the room is seen through it, in the dark.
    // Whoever keeps it, breathing where they stand, turned toward the room.
    const keeper = inside.keeper;
    if (keeper) {
      void model(keeper.url, keeper.drawn).then(body => {
        body.position.set(keeper.at[0], 1, keeper.at[1]);
        this.keeper = { body, motion: new Motion(body), facing: 0 };
        this.keeper.motion.play('reposo_mixamo');
        this.room.add(body);
      });
    }
    const { at, colour, reach, flames } = inside.light;
    this.hearth.position.set(...at);
    this.hearth.color.set(colour);
    this.hearth.distance = reach;
    for (const spot of flames ?? []) {
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: FLAME.colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      flame.position.set(...spot);
      flame.scale.setScalar(FLAME.wide);
      this.flames.push(flame);
      this.room.add(flame);
    }
    this.group.add(this.room, this.hearth);
  }

  /** Puts the cuts where the roof has lifted to, in the world. */
  private place(): void {
    const inside = this.spec.inside;
    if (!inside) return;
    const { tall, long, deep, thick } = inside.walls, base = this.group.position.y, k = this.lifted;
    const out = new THREE.Vector3(Math.sin(this.where.turn), 0, Math.cos(this.where.turn)), along = out.dot(this.group.position);
    // From the ridge down to the top of the walls as it lifts; nowhere while it stands.
    this.roofCut.constant = k > 0 ? base + this.spec.tall + (tall - this.spec.tall) * k : AWAY;
    // The front wall, from a little within its inside face outward (its window's sill and bars reach
    // in that far, and were left floating), cut away while lifted; its foot alone shown then.
    const face = deep / 2 - thick - REVEAL;
    if (k > 0) this.frontCut.set(out.clone().negate(), along + face);
    else this.frontCut.set(new THREE.Vector3(0, -1, 0), AWAY);
    this.behindCut.set(out.clone(), -(along + face));
    // The side wall that faces the camera, likewise, and all beyond it.
    if (this.side) {
      const outward = new THREE.Vector3(Math.cos(this.where.turn), 0, -Math.sin(this.where.turn)).multiplyScalar(this.side);
      const by = outward.dot(this.group.position), sideFace = long / 2 - thick - REVEAL;
      if (k > 0) this.sideCut.set(outward.clone().negate(), by + sideFace);
      else this.sideCut.set(new THREE.Vector3(0, -1, 0), AWAY);
      this.besideCut.set(outward, -(by + sideFace));
    }
    // The front, wiped down as the roof is lifted: from the ridge (all of it, its eaves too) to its foot.
    this.footCut.set(new THREE.Vector3(0, -1, 0), base + this.spec.tall + (tall * LOW - this.spec.tall) * k);
    this.undersideCut.constant = -(base + 1.5);
    if (this.foot) this.foot.visible = k > 0;
    if (this.sideFoot) this.sideFoot.visible = k > 0;
  }

  /** Where whoever keeps it stands, on the 2D ground, and who they are. */
  get keeps(): { who: string; x: number; y: number } | null {
    const keeper = this.spec.inside?.keeper;
    if (!keeper) return null;
    const [lx, lz] = keeper.at, c = Math.cos(this.where.turn), s = Math.sin(this.where.turn);
    // The building's frame to the ground's: turned about the upright, as the group is.
    const dx = lx * c + lz * s, dz = -lx * s + lz * c;
    return { who: keeper.who, x: this.where.x + dx, y: this.where.y + dz * ISO_Y };
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
    // A flame never burns evenly: two beats and a little noise, its glows with it.
    this.time += dt;
    const waver = 0.84 + 0.09 * Math.sin(this.time * 9.1) + 0.05 * Math.sin(this.time * 15.7 + 1.3) + 0.04 * Math.random();
    this.hearth.intensity = this.spec.inside.light.strength * this.lifted * waver;
    this.flames.forEach((flame, i) => {
      flame.material.opacity = 0.55 + 0.45 * this.lifted * (waver + 0.08 * Math.sin(this.time * 11 + i * 2.1));
      flame.scale.setScalar(FLAME.wide * (0.85 + 0.25 * waver));
    });
    // Whoever keeps it turns toward whoever comes in, and back to the room when they go.
    if (this.keeper && this.spec.inside?.keeper) {
      const [lx, lz] = this.spec.inside.keeper.at, p = at && this.within(at) ? this.local(at) : null;
      const want = p ? Math.atan2(p.x - lx, p.z - lz) : 0;
      this.keeper.facing += Math.atan2(Math.sin(want - this.keeper.facing), Math.cos(want - this.keeper.facing)) * Math.min(1, dt * 5);
      this.keeper.body.rotation.y = this.keeper.facing;
      this.keeper.motion.update(dt);
      // Their sign, over their head, once whoever comes is within the walls; gone once they are near
      // enough to talk (the sign of what F does says the rest).
      const keeps = this.keeps;
      this.ask.visible = !!at && !!keeps && this.within(at) && Math.hypot(at.x - keeps.x, (at.y - keeps.y) / ISO_Y) > ASK.near;
      this.room.updateWorldMatrix(true, false);
      this.ask.position.copy(this.room.localToWorld(new THREE.Vector3(lx, ASK.over + Math.sin(this.time * 3) * 2, lz)));
    }
  }
}
