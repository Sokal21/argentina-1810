import * as THREE from 'three';
import { SHOT } from '../bolts';
import type { MachiController, Vec } from '../machi/controller';
import type { WorldMap } from '../world/zones';
import { AimMarks } from './aim';
import { CabralFigure, THROWN, type Doing } from './cabral';
import { GrenadeMarks, Grenades } from './grenade';
import { Impacts } from './impact';
import { Fury } from './fury';
import { Mendings } from './mend';
import { mountPanel } from './panel';
import { raisePeople } from './people';
import { Royalists, type Royalist } from './realista';
import { Shots, type Strikes } from './shot';
import { ground, onTheGround, UPRIGHT } from './space';
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
  private readonly throwing = new GrenadeMarks();
  private readonly grenades: Grenades;
  private readonly impacts: Impacts;
  /** Life or mana coming back to him. */
  private readonly mendings = new Mendings();
  /** His rage, about him. */
  private readonly fury = new Fury();
  /** What his ball is tested against: set by whoever plays on this map. */
  strikes: Strikes = () => null;
  private readonly caster = new THREE.Raycaster();

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
    // Theirs is stopped by the 2D game's word that it struck him (`wounded`), not by a test of its own:
    // drawn from the muzzle on his shoulder, its line ran beside the 2D ball's and passed through him.
    this.volleys = new Shots(this.view.camera, () => null, () => {}, false, SHOT);
    this.impacts = new Impacts(this.view.camera, () => this.view.look);
    this.view.scene.add(this.shots.group, this.volleys.group, this.impacts.group, this.mendings.group, this.fury.group);
    // What its blast hurts, and the shake, are the 2D game's; here it is seen.
    this.grenades = new Grenades(this.view.camera);
    this.view.scene.add(this.grenades.group, this.throwing.group);
  }

  /** Shown, or hidden (out of the game). */
  set shown(on: boolean) {
    this.parent.hidden = !on;
  }

  /** Cabral, as his controller has him this step, and every royalist as his brain has him. */
  update(dt: number, c: MachiController, doing: Doing, royalists: readonly Royalist[]): void {
    this.cabral.update(dt, c, doing);
    // Only those near enough the camera to be seen, or to throw a shadow into its view.
    const across = this.view.camera.right + 260, down = this.view.camera.top + 260;
    this.royalists.update(dt, royalists, (x, y) => Math.abs(x - c.x) < across && Math.abs(y - c.y) < down);
    // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is up.
    const aiming = doing.aimed && c.arming?.kind === 'musket' && c.arming.phase !== 'fire';
    this.marks.show(aiming ? this.cabral.aimFrom(c) : null, aiming ? doing.aimed : null);
    // How far he can throw and the patch it would land on, as the 2D game draws them while a grenade is drawn back.
    const drawing = doing.aimed && c.arming?.kind === 'grenade' && c.arming.phase !== 'fire';
    this.throwing.show(drawing ? c : null, drawing ? doing.aimed : null);
    this.grenades.update(dt);
    this.shots.update(dt);
    this.volleys.update(dt);
    this.impacts.update(dt);
    this.mendings.update(dt, c);
    // His rage, about him and over the whole picture: eased in, and out as it ends.
    const rage = doing.rage ?? 0;
    this.fury.update(dt, c, rage);
    this.view.fury += (rage - this.view.fury) * Math.min(1, dt * 6);
  }

  /** Life or mana comes back to him, in its colour. */
  mend(colour: number): void {
    this.mendings.begin(colour);
  }

  /** His musket goes off: from its muzzle, along its barrel. */
  fire(): void {
    const barrel = this.cabral.barrel();
    if (barrel) this.shots.fire(barrel.tip, barrel.way);
  }

  /** His grenade is thrown, as the 2D game lobs it: it leaves his hand as the throw does. */
  lob(from: Vec, to: Vec, throwing: number): void {
    this.grenades.lob(from, to, throwing * THROWN, () => this.cabral.grenade());
  }

  /** A royalist's goes off. */
  volley(who: Royalist): void {
    const muzzle = this.royalists.muzzle(who);
    if (muzzle) this.volleys.fire(muzzle.tip, muzzle.way);
  }

  /** A royalist's ball strikes Cabral, where he stands: the ball stops on him and he bleeds. */
  wounded(at: Vec): void {
    this.volleys.stop(ground(at.x, at.y, 44 * UPRIGHT));
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
    this.caster.setFromCamera(this.view.pointAt(x, y), this.view.camera);
    return onTheGround(this.caster.ray);
  }

  /** Draws the world with a spot of the 2D ground in the middle of the screen. */
  draw(centre: Vec, dt: number): void {
    this.view.follow(ground(centre.x, centre.y), dt);
    this.view.draw();
  }
}
