import * as THREE from 'three';
import type { Footprint } from '../world/footprint';
import { SHOT } from '../bolts';
import { ISO_Y } from '../machi/data';
import type { MachiController, Vec } from '../machi/controller';
import { middle, type WorldMap } from '../world/zones';
import { AimMarks } from './aim';
import { CabralFigure, THROWN, type Doing } from './cabral';
import { GrenadeMarks, Grenades } from './grenade';
import { Impacts } from './impact';
import { Fury } from './fury';
import { darkenRooms, roomLight, shadeRooms, type House } from './house';
import { Mendings } from './mend';
import { mountPanel } from './panel';
import { People } from './people';
import { Royalists, type Royalist } from './realista';
import { Shots, type Strikes } from './shot';
import { ground, heading, onTheGround, UPRIGHT } from './space';
import { Cart } from './cart';
import { Forest3D } from './forest';
import { IntiFigure } from './inti';
import { Errands } from './errands';
import { seenThrough } from './xray';
import { Strewn } from './strewn';
import { View } from './view';
import { raiseCountry } from './world';

// The game's world, drawn wholly in 3D: the map's country and buildings, those standing about it,
// Cabral and the royalists, the shots and the blows landing. GameScene goes on as it always has
// (the controller, the soldiers' brains, the fury and the experience) and draws none of the world
// itself; it tells this where everything is. Phaser's canvas, over it, draws only the HUD.
// One for each map, kept between games: a WebGL canvas is not to be made afresh every time.

const made = new Map<WorldMap, World3D>();
/** A sergeant's roar felt: how long the camera shakes, and how far (a blow landing is ~2). */
const ROAR = { seconds: 0.45, pixels: 1 };
/** How far under someone's question mark the sign of what F does stands (it was 100 high over everyone, 7 under a standing keeper's). */
const SIGN_UNDER = 7;

/**
 * The two carts left behind the chapel: how far apart across the screen, how far right of their spot
 * (on it, one stood in the belfry), how far down it, which way they look (toward the camera). One
 * behind the other, they hid each other.
 */
const PARKED = { apart: 48, right: 80, down: 24, facing: 0.25 };
/** The life bar over what is brought along: how wide and tall, in world units. */
const LIFE = { wide: 40, tall: 4 };
/** How fast an ox cart turns toward where it heads, a share of the way a second. */
const CART_TURN = 2.5;

export class World3D {
  readonly view: View;
  /** Whoever plays this map: Cabral, or Inti. */
  readonly hero: CabralFigure | IntiFigure;
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
  /** The ground its plants take up, as they stand in 3D: walked round. */
  readonly plants: Footprint[];
  /** Those standing about the map, outdoors. */
  private readonly people: People;
  /** What lies about on it. */
  private readonly strewn: Strewn;
  /** What the story has one do about the map: its rings, its bonfires. */
  private readonly errands: Errands;
  /** The sign over whoever can be talked to, and what it says and over whom. */
  private readonly sign = document.createElement('div');
  private said: { text: string; at: Vec } | null = null;
  /** Where it was last shown, kept while it fades out; how high over the ground. */
  private signAt: { at: Vec; over: number } | null = null;
  /** What his ball is tested against: set by whoever plays on this map. */
  strikes: Strikes = () => null;
  private readonly caster = new THREE.Raycaster();

  /** The 3D world of a map, made the first time it is asked for. */
  static of(map: WorldMap, parent: HTMLElement, hero: 'cabral' | 'inti' = 'cabral'): World3D {
    let world = made.get(map);
    if (!world) made.set(map, world = new World3D(map, parent, hero));
    return world;
  }

  private constructor(map: WorldMap, private readonly parent: HTMLElement, hero: 'cabral' | 'inti') {
    this.hero = hero === 'inti' ? new IntiFigure() : new CabralFigure();
    this.view = new View(parent);
    // The look's panel, while developing: L, since P shows the game's collision boxes.
    if (import.meta.env.DEV) mountPanel(this.view, { key: 'KeyL', hidden: true });
    const country = raiseCountry(map);
    this.houses = country.houses;
    this.plants = country.plants;
    this.people = new People(map);
    this.strewn = new Strewn(map);
    this.errands = new Errands(map);
    // Behind the chapel, the friars' two carts left standing, unyoked, side by side (the hostages' way
    // out): there only once there is reason for them to be (`parked`).
    const parked = map.spots?.find(s => s.id === 'carretas');
    if (parked) {
      const { x, y } = middle(parked.plot);
      for (const side of [-1, 1]) {
        const cart = new Cart(false, false);
        cart.group.visible = false;
        this.parkedCarts.push(cart);
        this.view.scene.add(cart.group);
        void cart.loaded.then(() => cart.update(0, ground(x + PARKED.right + side * PARKED.apart, y + PARKED.down), PARKED.facing));
      }
    }
    this.sign.style.cssText = "opacity:0;transition:opacity 0.25s;position:fixed;left:0;top:0;z-index:12;pointer-events:none;width:max-content;max-width:300px;text-align:center;font:16px/1.25 'Silkscreen',ui-monospace,monospace;color:#f0e3c4;text-shadow:0 2px 0 #14110f,0 0 6px #14110f;transform:translate(-50%,-100%)";
    document.body.appendChild(this.sign);
    this.view.scene.add(country.group, new Forest3D(map).group, this.people.group, this.strewn.group, this.errands.group, this.hero.group, this.royalists.group, this.marks.group);
    // A sergeant's roar is felt: a faint shake of the camera, its rings leaving his feet.
    this.royalists.shoutFelt = () => this.view.jolt(ROAR.seconds, ROAR.pixels);
    for (const house of this.houses) this.view.over.add(...house.asks);
    for (const { sign } of this.people.signs.values()) this.view.over.add(sign);
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

  /** Cabral, if it is he who plays this map. */
  get cabral(): CabralFigure | null {
    return this.hero instanceof CabralFigure ? this.hero : null;
  }

  /** The spot of the 2D ground in the middle of the screen, as last drawn (shaken or not). */
  get centre(): Vec {
    const hit = new THREE.Vector3(), way = this.view.camera.getWorldDirection(new THREE.Vector3());
    new THREE.Ray(this.view.camera.position, way).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit);
    return { x: hit.x, y: hit.z * ISO_Y };
  }

  /** Inti calls the lightning down on a patch. */
  strike(c: Vec, at: Vec): void {
    if (this.hero instanceof IntiFigure) this.hero.strike(c, at);
  }

  /** Shown, or hidden (out of the game); and its sign with it. */
  set shown(on: boolean) {
    this.parent.hidden = !on;
    if (!on) this.hint(null, null);
  }

  /** Cabral, as his controller has him this step, and every royalist as his brain has him. */
  update(dt: number, c: MachiController, doing: Doing, royalists: readonly Royalist[]): void {
    this.hero.update(dt, c, doing);
    // Only those near enough the camera to be seen, or to throw a shadow into its view.
    const across = this.view.camera.right + 260, down = this.view.camera.top + 260;
    this.royalists.update(dt, royalists, (x, y) => Math.abs(x - c.x) < across && Math.abs(y - c.y) < down);
    // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is up.
    const aiming = doing.aimed && c.arming?.kind === 'musket' && c.arming.phase !== 'fire';
    this.marks.show(aiming && this.cabral ? this.cabral.aimFrom(c) : null, aiming ? doing.aimed : null);
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
    this.people.update(dt, c);
    this.errands.update(dt);
    shadeRooms();
    // His rage, about him and over the whole picture: eased in, and out as it ends.
    const rage = doing.rage ?? 0;
    this.fury.update(dt, c, rage);
    this.view.fury += (rage - this.view.fury) * Math.min(1, dt * 6);
  }

  /** Whether this thing is drawn lying on the map, to be picked up. */
  lies(what: string): boolean {
    return this.strewn.lies(what);
  }

  /** It has been picked up: it is gone from the ground. */
  taken(what: string): void {
    this.strewn.taken(what);
  }

  /** Whether something lying on the map is there just now (what waits on the story is not, until it has happened). */
  there(what: string, on: boolean): void {
    this.strewn.there(what, on);
  }

  /** Whether the ring of a place where something can be done is shown: while it can be. */
  open(spot: string, on: boolean): void {
    this.errands.open(spot, on);
  }

  /** The ox carts, by the charge each is: drawn where the 2D game has them, turned the way they go. */
  private readonly carts = new Map<string, { cart: Cart; facing: number }>();

  /**
   * An ox cart, this step (the bell's, `campana`, with the bell in its bed): where it is on the 2D ground and which way it heads there (along the
   * ground), or not shown. It turns toward where it heads by degrees, as a cart does.
   */
  carted(id: string, dt: number, at: Vec | null, toward: Vec): void {
    let one = this.carts.get(id);
    if (!one && at) {
      const cart = new Cart(id === 'campana');
      // Seen through whatever hides it, in red.
      void cart.loaded.then(() => seenThrough(cart.group));
      one = { cart, facing: heading(toward.x, toward.y) };
      this.carts.set(id, one);
      this.view.scene.add(one.cart.group);
    }
    if (!one) return;
    one.cart.group.visible = !!at;
    if (!at) return;
    const want = heading(toward.x, toward.y), turn = Math.atan2(Math.sin(want - one.facing), Math.cos(want - one.facing));
    one.facing += turn * Math.min(1, dt * CART_TURN);
    one.cart.update(dt, ground(at.x, at.y), one.facing);
  }

  /** The friars' carts behind the chapel. */
  private readonly parkedCarts: Cart[] = [];

  /** Whether the friars' carts stand behind the chapel: once whoever asks about them has asked. */
  parked(on: boolean): void {
    for (const cart of this.parkedCarts) cart.group.visible = on;
  }

  /** The life left of what is brought along, by its charge: a bar over it, drawn over everything. */
  private readonly bars = new Map<string, { back: THREE.Sprite; fill: THREE.Sprite }>();

  /**
   * What is brought along, this step: where it is on the 2D ground, how high over it the bar stands (as drawn heights are),
   * and the share of its life it has (the bar shown while it has lost any; null: not shown).
   */
  life(id: string, at: Vec | null, over: number, share: number | null): void {
    let bar = this.bars.get(id);
    if (!bar) {
      const make = (colour: string, order: number) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: colour, depthTest: false, depthWrite: false }));
        s.center.set(0, 0.5);
        s.renderOrder = order;
        this.view.over.add(s);
        return s;
      };
      bar = { back: make('#1c1410', 30), fill: make('#d23c2a', 31) };
      this.bars.set(id, bar);
    }
    const shown = !!at && share !== null && share < 1;
    bar.back.visible = bar.fill.visible = shown;
    if (!shown) return;
    // Over a cart's hide, where it is drawn; over anyone else's head.
    const cart = this.carts.get(id)?.cart;
    const p = cart?.ready ? cart.top() : ground(at.x, at.y, over * UPRIGHT), w = LIFE.wide;
    bar.back.position.copy(p).add(new THREE.Vector3(-w / 2 - 1, 0, 0));
    bar.back.scale.set(w + 2, LIFE.tall + 2, 1);
    bar.fill.position.copy(p).add(new THREE.Vector3(-w / 2, 0, 0));
    bar.fill.scale.set(Math.max(0.01, w * share), LIFE.tall, 1);
  }

  /** One led along by the hero: where they are on the 2D ground. */
  lead(who: string, at: Vec): void {
    this.people.lead(who, at);
  }

  /** Whether this one, standing about the map, may be talked to just now: a sign over them says so. */
  asking(who: string, on: boolean): void {
    this.people.asking(who, on);
  }

  /** Whether this one stands about the map as a model of their own, to be led along. */
  leads(who: string): boolean {
    return this.people.has(who);
  }

  /** A bonfire built at a place: it stands there from now on. */
  build(spot: string): void {
    this.errands.build(spot);
  }

  /** A bonfire lit at a place. */
  light(spot: string): void {
    this.errands.light(spot);
  }

  /** Whoever lies abed in a house, where they lie, on the 2D ground. */
  get abed(): { who: string; x: number; y: number; over: number }[] {
    return this.houses.flatMap(house => house.abed);
  }

  /** Whoever is in a house, where they stand in it, on the 2D ground. */
  get keepers(): { who: string; x: number; y: number; over: number }[] {
    return this.houses.flatMap(house => house.keeps);
  }

  /** What can be done with someone near, said over them (null: nothing), as the 2D game's sign over them. */
  hint(text: string | null, at: Vec | null): void {
    // Whoever stands about and is newly come near says their thing with what they do now and then.
    const was = this.said?.at;
    this.said = text && at ? { text, at } : null;
    if (at && text && (!was || Math.hypot(was.x - at.x, was.y - at.y) >= 1)) this.people.heard(at);
    // It fades in and out, keeping what it said and where while it fades.
    if (this.said) {
      if (this.sign.textContent !== this.said.text) this.sign.textContent = this.said.text;
      // Just under the question mark of whoever is in a house (lower over one who sits); over the head of
      // whoever stands about (lower over one who lies); else as high as a man.
      const { x, y } = this.said.at, near = [...this.keepers, ...this.abed].find(k => Math.hypot(k.x - x, k.y - y) < 1);
      this.signAt = { at: this.said.at, over: near ? near.over - SIGN_UNDER : this.people.over(this.said.at) ?? this.strewn.over(this.said.at) ?? 100 * UPRIGHT };
    }
    this.sign.style.opacity = this.said ? '1' : '0';
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
    const barrel = this.cabral?.barrel() ?? null;
    if (barrel) this.shots.fire(barrel.tip, barrel.way);
  }

  /** His grenade is thrown, as the 2D game lobs it: it leaves his hand as the throw does. */
  lob(from: Vec, to: Vec, throwing: number): void {
    this.grenades.lob(from, to, throwing * THROWN, () => this.cabral?.grenade() ?? null);
  }

  /** A royalist's goes off. */
  volley(who: Royalist): void {
    // From his muzzle, along the 2D game's ball (the one that hurts): level, the way he faces.
    const muzzle = this.royalists.muzzle(who), { dir } = who.mind;
    if (muzzle) this.volleys.fire(muzzle.tip, new THREE.Vector3(dir.x, 0, dir.y).normalize());
  }

  /** Whether a spot of the 2D game's ground is in sight, as the camera now stands (`past`: the share of the view beyond its edges counted in). */
  sees(at: Vec, past = 0): boolean {
    const p = ground(at.x, at.y).project(this.view.camera);
    return Math.abs(p.x) <= 1 + past && Math.abs(p.y) <= 1 + past;
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
    // The trees between the camera and whoever plays are opened about them.
    Forest3D.seeThrough(this.hero.position.clone().setY(this.hero.position.y + 40), this.view.camera, this.view.sunward);
    // The sign over whoever it is for, above their head.
    if (this.signAt) {
      this.view.camera.updateMatrixWorld();
      const p = ground(this.signAt.at.x, this.signAt.at.y, this.signAt.over).project(this.view.camera);
      const box = this.view.renderer.domElement.getBoundingClientRect();
      this.sign.style.left = `${Math.round(box.left + (p.x + 1) / 2 * box.width)}px`;
      this.sign.style.top = `${Math.round(box.top + (1 - p.y) / 2 * box.height)}px`;
    }
    this.view.draw();
  }
}
