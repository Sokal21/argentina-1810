import Phaser from 'phaser';
import { HitFX } from '../fx/HitFX';
import type { Vec } from '../machi/controller';
import type { Footprint } from '../world/footprint';
import { DYING, KINDS, TroopBrain, type Deed, type KindName } from './brain';
import { LOOKS, type Look, type Sheet } from './looks';

// One of the king's other men on screen: draws what its brain is doing and
// takes the hits. Each kind has a sheet for each thing it does, drawn from
// one side only and turned over to face the other way.

const FADE = 0.8;    // seconds his body takes to fade
const FLASH = 0.22;  // seconds the red takes to fade
const KICK = 0.3;    // seconds a shot's recoil is shown for
const BAR_W = 16;

export class Trooper {
  readonly zone: Phaser.GameObjects.Zone;
  readonly brain: TroopBrain;
  private look: Look;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private barBack: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private fx?: HitFX;
  private flash = 0;
  private shown: number;
  private clock = Math.random();
  /** Seconds since he last fired, while the recoil shows. */
  private kick = Infinity;

  constructor(scene: Phaser.Scene, readonly kind: KindName, x: number, y: number) {
    this.brain = new TroopBrain(KINDS[kind], x, y);
    this.look = LOOKS[kind];
    this.shown = this.brain.life;
    const first = this.look.walk ?? this.look.aim ?? this.look.death;
    this.shadow = scene.add.ellipse(x, y, 24, 8, 0x000000, 0.28);
    this.sprite = scene.add.sprite(x, y, first.src, 0).setScale(this.look.scale);
    this.zone = scene.add.zone(x, y, 18, this.look.tall * 0.7);
    scene.physics.add.existing(this.zone);
    this.zone.setData('enemy', this);
    this.barBack = scene.add.rectangle(x, y, BAR_W + 2, 4, 0x14110f, 0.85).setDepth(1e6);
    this.bar = scene.add.rectangle(x, y, BAR_W, 2, 0xd23c2a).setOrigin(0, 0.5).setDepth(1e6);
    this.fx = HitFX.on(this.sprite);
    this.draw();
  }

  static preload(scene: Phaser.Scene): void {
    for (const look of Object.values(LOOKS)) {
      for (const s of [look.walk, look.blow, look.aim, look.rally, look.death]) {
        if (s) scene.load.spritesheet(s.src, s.src, { frameWidth: s.size, frameHeight: s.size });
      }
    }
  }

  get alive(): boolean { return this.brain.alive; }
  set burning(amount: number) { if (this.fx) this.fx.burn = amount; }
  get ground(): Vec { return { x: this.brain.x, y: this.brain.y }; }
  get girth(): number { return this.brain.kind.girth; }
  get body(): Footprint {
    const tall = this.look.tall;
    return { x: this.brain.x, y: this.brain.y - tall * 0.45, hw: 9, hh: tall * 0.35 };
  }

  hit(dx: number, dy: number, amount = 1): void {
    if (!this.alive) return;
    this.brain.hit(dx, dy, amount);
    this.flash = 1;
  }

  /** As the fusilier: holds a post, is sent as one of a wave, is called back, left undrawn, or taken off the field. */
  hold(ground: (x: number, y: number) => boolean): this {
    this.brain.returns = false;
    this.brain.ground = ground;
    return this;
  }
  sent(ground: (x: number, y: number) => boolean): this {
    this.hold(ground);
    this.brain.relentless = true;
    return this;
  }
  revive(): void {
    this.brain.revive();
    this.shown = this.brain.life;
  }
  sleep(): void {
    if (!this.sprite.visible && !this.shadow.visible) return;
    for (const part of [this.sprite, this.shadow, this.barBack, this.bar]) part.setVisible(false);
  }
  hurry(seconds: number): void {
    this.brain.hurry(seconds);
  }
  dismiss(): void {
    this.brain.vanish();
    this.draw();
  }

  update(dt: number, her: Vec | null): Deed {
    const deed = this.brain.update(dt, her);
    if (deed.shot) this.kick = 0;
    this.kick += dt;
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt / FLASH);
    this.shown += (this.brain.life - this.shown) * Math.min(1, dt * 14);
    this.draw();
    return deed;
  }

  private draw(): void {
    const b = this.brain, k = b.kind, look = this.look;
    // Standing: the first frame of whatever he does most.
    let s = look.walk ?? look.aim ?? look.death, frame = 0, alpha = 1;
    const through = (sheet: Sheet, share: number) => Math.min(sheet.frames - 1, Math.floor(share * sheet.frames));
    switch (b.mode) {
      case 'walk':
        if (look.walk) frame = Math.floor(this.clock * (look.walk.fps ?? 8) * (b.hurried ? 1.4 : 1)) % look.walk.frames;
        break;
      case 'aim':
        // The first half of the sheet is the aim, held; the rest is the shot going off.
        if (look.aim) { s = look.aim; frame = through(look.aim, b.t / k.shot!.aim * 0.5); }
        break;
      case 'blow':
        if (look.blow) { s = look.blow; frame = through(look.blow, b.t / k.blow!.time); }
        break;
      case 'rally':
        if (look.rally) { s = look.rally; frame = through(look.rally, b.t / k.rally!.time); }
        break;
      case 'dying':
        s = look.death; frame = through(look.death, b.t / DYING);
        break;
      case 'gone':
        s = look.death; frame = look.death.frames - 1;
        alpha = Math.max(0, 1 - b.t / FADE);
        break;
      default:
        break;
    }
    if (b.alive && b.mode !== 'aim' && look.aim && this.kick < KICK) {
      s = look.aim;
      frame = Math.min(look.aim.frames - 1, Math.floor(look.aim.frames * (0.5 + 0.5 * this.kick / KICK)));
    }
    const flip = b.faceX < 0, x = Math.round(b.x), y = Math.round(b.y);
    this.sprite.setTexture(s.src, frame).setFlipX(flip).setDisplayOrigin(flip ? s.size - s.ax : s.ax, s.size)
      .setPosition(x, y).setDepth(y).setAlpha(alpha).setVisible(alpha > 0);
    const alive = b.alive;
    this.shadow.setPosition(x, y).setDepth(y - 0.5).setVisible(alive);
    this.zone.setPosition(x, y - look.tall * 0.5);
    (this.zone.body as Phaser.Physics.Arcade.Body).enable = alive;
    const hurt = alive && b.life < b.max;
    this.barBack.setPosition(x, y - look.tall - 6).setVisible(hurt);
    this.bar.setPosition(x - BAR_W / 2, y - look.tall - 6).setVisible(hurt).setSize(Math.max(0, BAR_W * this.shown / b.max), 2);
    if (this.fx) this.fx.amount = this.flash;
    else if (this.flash > 0) this.sprite.setTintFill(0xff2a1f);
    else this.sprite.clearTint();
  }
}
