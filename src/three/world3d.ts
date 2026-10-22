import * as THREE from 'three';
import { SHOT } from '../bolts';
import type { MachiController, Vec } from '../machi/controller';
import type { WorldMap } from '../world/zones';
import { AimMarks } from './aim';
import { CabralFigure, THROWN, type Doing } from './cabral';
import { GrenadeMarks, Grenades } from './grenade';
import { Impacts } from './impact';
import { Fury } from './fury';
import { darkenRooms, roomLight, shadeRooms, type House } from './house';
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
  /** The houses gone into without a cut. */
  private readonly houses: House[];
  /** The sign over whoever can be talked to, and what it says and over whom. */
  private readonly sign = document.createElement('div');
  private said: { text: string; at: Vec } | null = null;
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
    this.houses = country.houses;
    this.sign.hidden = true;
    this.sign.style.cssText = "position:fixed;left:0;top:0;z-index:12;pointer-events:none;white-space:nowrap;font:16px/1 'Silkscreen',ui-monospace,monospace;color:#f0e3c4;text-shadow:0 2px 0 #14110f,0 0 6px #14110f;transform:translate(-50%,-100%)";
    document.body.appendChild(this.sign);
    this.view.scene.add(country.group, raisePeople(map), this.cabral.group, this.royalists.group, this.marks.group);
    for (const house of this.houses) this.view.over.add(house.ask);
    this.view.scene.add(roomLight());
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
    this.warm();
  }

  /**
   * Every effect once, far out of sight, and everything compiled: the first shot, blast, blow or
   * draught in play would otherwise have its materials compiled then, and freeze it.
   */
  private warm(): void {
    const away = { x: -20000, y: -20000 };
    this.grenades.warm(away);
    this.shots.warm(away);
    this.volleys.warm(away);
    this.impacts.spawn(ground(away.x, away.y, 40), ground(away.x + 10, away.y, 40));
    // About him wherever he is, so ended as soon as it is compiled.
    this.mendings.begin(0xffffff);
    this.view.warm();
    this.mendings.stop();
  }

  /** Shown, or hidden (out of the game); and its sign with it. */
  set shown(on: boolean) {
    this.parent.hidden = !on;
    if (!on) this.hint(null, null);
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
    // A house he is within has its roof lifted off.
    darkenRooms();
    for (const house of this.houses) house.update(dt, c);
    shadeRooms();
    // His rage, about him and over the whole picture: eased in, and out as it ends.
    const rage = doing.rage ?? 0;
    this.fury.update(dt, c, rage);
    this.view.fury += (rage - this.view.fury) * Math.min(1, dt * 6);
  }

  /** Whoever keeps a house, where they stand in it, on the 2D ground. */
  get keepers(): { who: string; x: number; y: number }[] {
    return this.houses.flatMap(house => house.keeps ?? []);
  }

  /** What can be done with someone near, said over them (null: nothing), as the 2D game's sign over them. */
  hint(text: string | null, at: Vec | null): void {
    this.said = text && at ? { text, at } : null;
    if (this.sign.textContent !== (text ?? '')) this.sign.textContent = text ?? '';
    this.sign.hidden = !this.said;
  }

  /** Keeps a step out of the houses' walls: in and out only by their doors. */
  hold(from: Vec, to: Vec): Vec {
    return this.houses.reduce((at, house) => house.hold(from, at), to);
  }

  /** Whether a spot is within a house's walls, where nobody else goes yet. */
  housed(at: Vec): boolean {
    return this.houses.some(house => house.within(at));
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

  /** A fallen royalist is taken off the field where he lies, he and his blood. */
  bury(who: Royalist): void {
    this.royalists.bury(who);
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
    // The sign over whoever it is for, above their head.
    if (this.said) {
      this.view.camera.updateMatrixWorld();
      const p = ground(this.said.at.x, this.said.at.y, 100 * UPRIGHT).project(this.view.camera);
      const box = this.view.renderer.domElement.getBoundingClientRect();
      this.sign.style.left = `${Math.round(box.left + (p.x + 1) / 2 * box.width)}px`;
      this.sign.style.top = `${Math.round(box.top + (1 - p.y) / 2 * box.height)}px`;
    }
    this.view.draw();
  }
}
