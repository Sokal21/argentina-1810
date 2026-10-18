import * as THREE from 'three';
import type { MachiController, Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';
import type { WorldMap } from '../world/zones';
import { AimMarks } from './aim';
import { CabralFigure, type Doing } from './cabral';
import { Impacts } from './impact';
import { mountPanel } from './panel';
import { raisePeople } from './people';
import { Royalists, type Royalist } from './realista';
import { Shots, type Strikes } from './shot';
import { ground } from './space';
import { View } from './view';
import { raiseCountry } from './world';

// The game's world, drawn wholly in 3D: the map's country and buildings, those standing about it,
// Cabral and the royalists, the shots and the blows landing. GameScene goes on as it always has
// (the controller, the soldiers' brains, the fury and the experience) and draws none of the world
// itself; it tells this where everything is. Phaser's canvas, over it, draws only the HUD.
// One for each map, kept between games: a WebGL canvas is not to be made afresh every time.

const made = new Map<WorldMap, World3D>();

export class World3D {
  readonly view: View;
  readonly cabral = new CabralFigure();
  readonly royalists = new Royalists();
  private readonly shots: Shots;
  /** The royalists' balls: they stop on whoever they reach, and burst on nothing. */
  private readonly volleys: Shots;
  private readonly marks = new AimMarks();
  private readonly impacts: Impacts;
  /** What his ball is tested against: set by whoever plays on this map. */
  strikes: Strikes = () => null;
  /** And theirs. */
  struck: Strikes = () => null;
  private readonly caster = new THREE.Raycaster();
  private readonly floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  /** The 3D world of a map, made the first time it is asked for. */
  static of(map: WorldMap, parent: HTMLElement): World3D {
    let world = made.get(map);
    if (!world) made.set(map, world = new World3D(map, parent));
    return world;
  }

  private constructor(map: WorldMap, private readonly parent: HTMLElement) {
    this.view = new View(parent);
    // The look's panel, while developing: L, since P shows the game's collision boxes.
    if (import.meta.env.DEV) mountPanel(this.view, { key: 'KeyL', hidden: true });
    const country = raiseCountry(map);
    this.view.scene.add(country.group, raisePeople(map), this.cabral.group, this.royalists.group, this.marks.group);
    // The blast itself is the 2D game's, which hurts; this only shows the ball and what it raises.
    this.shots = new Shots(this.view.camera, (from, to) => this.strikes(from, to), () => {});
    this.volleys = new Shots(this.view.camera, (from, to) => this.struck(from, to), () => {}, false);
    this.impacts = new Impacts(this.view.camera, () => this.view.look);
    this.view.scene.add(this.shots.group, this.volleys.group, this.impacts.group);
  }

  /** Shown, or hidden (out of the game). */
  set shown(on: boolean) {
    this.parent.hidden = !on;
  }

  /** Cabral, as his controller has him this step, and every royalist as his brain has him. */
  update(dt: number, c: MachiController, doing: Doing, royalists: readonly Royalist[]): void {
    this.cabral.update(dt, c, doing);
    this.royalists.update(dt, royalists);
    // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is up.
    const aiming = doing.aimed && c.arming?.kind === 'musket' && c.arming.phase !== 'fire';
    this.marks.show(aiming ? this.cabral.aimFrom(c) : null, aiming ? doing.aimed : null);
    this.shots.update(dt);
    this.volleys.update(dt);
    this.impacts.update(dt);
  }

  /** His musket goes off: from its muzzle, along its barrel. */
  fire(): void {
    const barrel = this.cabral.barrel();
    if (barrel) this.shots.fire(barrel.tip, barrel.way);
  }

  /** A royalist's goes off. */
  volley(who: Royalist): void {
    const muzzle = this.royalists.muzzle(who);
    if (muzzle) this.volleys.fire(muzzle.tip, muzzle.way);
  }

  /** A blow lands on a royalist, struck from where Cabral stands. */
  blow(who: Royalist, from: Vec): void {
    this.impacts.spawn(this.royalists.chest(who, from), ground(from.x, from.y, 50));
  }

  /** The camera shakes, as the 2D game's does when a blow is felt. */
  jolt(seconds: number, pixels: number): void {
    this.view.jolt(seconds, pixels);
  }

  /** The spot of the 2D game's ground under a point of the screen (in the page's pixels). */
  underPointer(x: number, y: number): Vec | null {
    this.caster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), this.view.camera);
    const hit = new THREE.Vector3();
    if (!this.caster.ray.intersectPlane(this.floor, hit)) return null;
    return { x: hit.x, y: hit.z * ISO_Y };
  }

  /** Draws the world with a spot of the 2D ground in the middle of the screen. */
  draw(centre: Vec, dt: number): void {
    this.view.follow(ground(centre.x, centre.y), dt);
    this.view.draw();
  }
}
