import Phaser from 'phaser';
import { HitFX } from '../fx/HitFX';
import type { Vec } from '../machi/controller';
import type { Footprint } from '../world/footprint';
import { AIM, DYING, LIFE, LOWER, RealistaBrain, SLASH_TIME, type Bounds, type Deed } from './brain';

// The sheets, each a single row of square frames with his feet on the
// bottom row. `ax` is where the middle of his body falls in a frame. All are
// drawn facing right: toward the viewer, or away for the ones from behind.
const SIZE = 90;
const SHEETS = {
  walk:       { src: 'realista/marcha_frente.png',   ax: 42 },
  walk_back:  { src: 'realista/marcha_espalda.png',  ax: 42 },
  shoot:      { src: 'realista/disparo_frente.png',  ax: 42 },
  shoot_back: { src: 'realista/disparo_espalda.png', ax: 42 },
  slash:      { src: 'realista/tajo_frente.png',     ax: 42 },
  slash_back: { src: 'realista/tajo_espalda.png',    ax: 42 },
  death:      { src: 'realista/muerte.png',          ax: 42 },
};
type SheetName = keyof typeof SHEETS;

// The frames from the shot on: the kick, and the musket coming down.
const FIRED = {
  shoot: [5, 6, 7], shoot_back: [4, 5, 7],
};

const SCALE = 1.1;       // he is drawn a little smaller than the heroes
const WALK_FPS = 8;
const RAISE = 0.3;       // seconds of the aim spent bringing the musket up
const FADE = 0.8;        // seconds his body takes to fade
const FLASH = 0.22;      // seconds the red takes to fade
const TORSO = { up: 40, hw: 9, hh: 30 }; // the part of him a spell has to be seen to touch
const BAR_W = 16;        // life bar, in pixels
const BAR_UP = 92;       // how far above his feet the bar sits

/** A royalist soldier on screen: draws what his brain is doing and takes the hits. */
export class Realista {
  /** Invisible box over his body, which the physics engine tests against. */
  readonly zone: Phaser.GameObjects.Zone;

  private brain: RealistaBrain;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private barBack: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private fx?: HitFX;
  private flash = 0;
  private shown = LIFE;
  /** Runs his step, offset so several do not march in time. */
  private clock = Math.random();

  constructor(scene: Phaser.Scene, x: number, y: number, bounds?: Bounds) {
    this.brain = new RealistaBrain(x, y, bounds);
    this.shadow = scene.add.ellipse(x, y, 22, 8, 0x000000, 0.28);
    this.sprite = scene.add.sprite(x, y, SHEETS.walk.src, 0).setScale(SCALE);
    this.zone = scene.add.zone(x, y, TORSO.hw * 2, TORSO.hh * 2);
    scene.physics.add.existing(this.zone);
    this.zone.setData('enemy', this);
    this.barBack = scene.add.rectangle(x, y, BAR_W + 2, 4, 0x14110f, 0.85).setDepth(1e6);
    this.bar = scene.add.rectangle(x, y, BAR_W, 2, 0xd23c2a).setOrigin(0, 0.5).setDepth(1e6);

    if (scene.renderer.type === Phaser.WEBGL) {
      this.sprite.setPostPipeline(HitFX);
      const found = this.sprite.getPostPipeline(HitFX);
      this.fx = (Array.isArray(found) ? found[0] : found) as HitFX;
    }
    this.draw();
  }

  static preload(scene: Phaser.Scene): void {
    for (const { src } of Object.values(SHEETS)) {
      scene.load.spritesheet(src, src, { frameWidth: SIZE, frameHeight: SIZE });
    }
  }

  get alive(): boolean {
    return this.brain.alive;
  }

  /** How strongly he smoulders, from 0 to 1, while he is on fire. */
  set burning(amount: number) {
    if (this.fx) this.fx.burn = amount;
  }

  /** The spot on the ground he stands on, and how far his body reaches from there. */
  get ground(): Vec {
    return { x: this.brain.x, y: this.brain.y };
  }
  readonly girth = 9;

  /** His body as it appears on screen. */
  get body(): Footprint {
    return { x: this.brain.x, y: this.brain.y - TORSO.up, hw: TORSO.hw, hh: TORSO.hh };
  }

  /** Struck by something travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number): void {
    if (!this.alive) return;
    this.brain.hit(dx, dy);
    this.flash = 1;
  }

  /** Advances him. `her` is where she stands, if she can be attacked. Returns what he did this step. */
  update(dt: number, her: Vec | null): Deed {
    const deed = this.brain.update(dt, her);
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt / FLASH);
    this.shown += (this.brain.life - this.shown) * Math.min(1, dt * 14);
    this.draw();
    return deed;
  }

  private draw(): void {
    const b = this.brain;
    const seen = (name: 'walk' | 'shoot' | 'slash'): SheetName => (b.back ? `${name}_back` : name);
    let name: SheetName = seen('walk');
    let frame = 0, alpha = 1;

    switch (b.mode) {
      case 'walk':
        frame = Math.floor(this.clock * WALK_FPS) % 8;
        break;
      case 'aim':
        // Up to his shoulder, then held dead still until the shot.
        name = seen('shoot');
        frame = Math.min(3, Math.floor(b.t / RAISE * 3));
        if (b.t > AIM - 0.06) frame = FIRED[b.back ? 'shoot_back' : 'shoot'][0];
        break;
      case 'lower':
        name = seen('shoot');
        frame = FIRED[b.back ? 'shoot_back' : 'shoot'][Math.min(2, Math.floor(b.t / LOWER * 3))];
        break;
      case 'slash':
        name = seen('slash');
        frame = Math.min(7, Math.floor(b.t / SLASH_TIME * 8));
        break;
      case 'dying':
        name = 'death';
        frame = Math.min(11, Math.floor(b.t / DYING * 12));
        break;
      case 'gone':
        name = 'death';
        frame = 11;
        alpha = Math.max(0, 1 - b.t / FADE);
        break;
    }

    const sheet = SHEETS[name];
    const flip = b.faceX < 0;
    const x = Math.round(b.x), y = Math.round(b.y);
    this.sprite
      .setTexture(sheet.src, frame)
      .setFlipX(flip)
      .setDisplayOrigin(flip ? SIZE - sheet.ax : sheet.ax, SIZE)
      .setPosition(x, y)
      .setDepth(y)
      .setAlpha(alpha)
      .setVisible(alpha > 0);
    const alive = b.alive;
    this.shadow.setPosition(x, y).setDepth(y - 0.5).setVisible(alive);

    this.zone.setPosition(x, y - TORSO.up);
    (this.zone.body as Phaser.Physics.Arcade.Body).enable = alive;
    const hurt = alive && b.life < LIFE;
    this.barBack.setPosition(x, y - BAR_UP).setVisible(hurt);
    this.bar.setPosition(x - BAR_W / 2, y - BAR_UP).setVisible(hurt)
      .setSize(Math.max(0, BAR_W * this.shown / LIFE), 2);

    if (this.fx) this.fx.amount = this.flash;
    else if (this.flash > 0) this.sprite.setTintFill(0xff2a1f);
    else this.sprite.clearTint();
  }
}
