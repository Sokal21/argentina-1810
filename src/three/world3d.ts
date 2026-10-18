import type { MachiController, Vec } from '../machi/controller';
import type { WorldMap } from '../world/zones';
import { AimMarks } from './aim';
import { CabralFigure, type Doing } from './cabral';
import { mountPanel } from './panel';
import { Shots, type Strikes } from './shot';
import { ground } from './space';
import { View } from './view';
import { raiseCountry } from './world';

// The game's world drawn in 3D, under the 2D game's canvas: the map's country and Cabral, his
// musket's shot and its marks. The game goes on as it always has (GameScene keeps the controller,
// the enemies, the story); it tells this where things are, and draws on top whatever is still 2D.
// One for each map, kept between games: a WebGL canvas is not to be made afresh every time.

const made = new Map<WorldMap, World3D>();

export class World3D {
  readonly view: View;
  readonly cabral = new CabralFigure();
  private readonly shots: Shots;
  private readonly marks = new AimMarks();
  /** What the ball is tested against: set by whoever plays on this map. */
  strikes: Strikes = () => null;

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
    this.view.scene.add(country.group, this.cabral.group, this.marks.group);
    // The blast itself is the 2D game's, which hurts; this only shows the ball and what it raises.
    this.shots = new Shots(this.view.camera, (from, to) => this.strikes(from, to), () => {});
    this.view.scene.add(this.shots.group);
  }

  /** Shown, or hidden (indoors, or out of the game). */
  set shown(on: boolean) {
    this.parent.hidden = !on;
  }

  /** Screen pixels to each unit of the world. */
  get scale(): number {
    return this.view.pixel / this.view.look.far;
  }

  /** The grid the picture moves on: the camera stands on whole multiples of it, in the 2D game's units. */
  get grain(): number {
    return this.view.look.far;
  }

  /** Cabral, as his controller has him this step; `aimed` and the rest are what it does not know. */
  update(dt: number, c: MachiController, doing: Doing & { shown: boolean }): void {
    this.cabral.group.visible = doing.shown;
    this.cabral.update(dt, c, doing);
    // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is up.
    const aiming = doing.shown && doing.aimed && c.arming?.kind === 'musket' && c.arming.phase !== 'fire';
    this.marks.show(aiming ? this.cabral.aimFrom(c) : null, aiming ? doing.aimed : null);
    this.shots.update(dt);
  }

  /** His musket goes off: from its muzzle, along its barrel. */
  fire(): void {
    const barrel = this.cabral.barrel();
    if (barrel) this.shots.fire(barrel.tip, barrel.way);
  }

  /** Draws the world with a spot of the 2D ground in the middle of the screen. */
  draw(centre: Vec, dt: number): void {
    this.view.follow(ground(centre.x, centre.y), dt);
    this.view.draw();
  }
}
