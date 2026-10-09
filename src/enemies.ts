import Phaser from 'phaser';
import { HitFX } from './fx/HitFX';
import type { Footprint } from './world/footprint';

const W = 28;        // width of the cube's base diamond
const RISE = 16;     // height of its sides
const FLASH = 0.22;  // seconds the red takes to fade
const NUDGE = 3;     // pixels it is knocked along the bolt's path, then springs back
const LIFE = 3;      // spells it takes to destroy
const RESPAWN = 5;   // seconds until a destroyed one comes back, so there is always something to hit
const APPEAR = 0.25; // seconds it takes to grow back in
const BAR_W = 18;    // life bar, in pixels
const BAR_UP = RISE + W / 4 + 6; // how far above its base the bar sits

const STONE = [0x968c79, 0x6d6457, 0x4f483e]; // top, left and right faces

/** A stand-in enemy: a stone block with a life bar that breaks apart when it runs out. */
export class Enemy {
  /** The ground it stands on: what blocks her from walking through. */
  readonly footprint: Footprint;
  /** Its body as it appears on screen: what a spell has to be seen to touch. */
  readonly body: Footprint;
  /** Invisible box over that body, which the physics engine tests against. */
  readonly zone: Phaser.GameObjects.Zone;
  life = LIFE;

  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private barBack: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private fx?: HitFX;
  private flash = 0;
  private push = { x: 0, y: 0 };
  /** Seconds since it was destroyed, or null while it stands. */
  private gone: number | null = null;
  /** Shown life, which slides down to the real one instead of jumping. */
  private shown = LIFE;
  /** Seconds since it last appeared; it grows in over the first APPEAR. */
  private age = APPEAR;

  private static chips: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.footprint = { x, y, hw: W / 2 - 1, hh: W / 4 - 1 };
    this.shadow = scene.add.ellipse(x, y + 2, W + 6, W / 2 + 2, 0x000000, 0.25).setDepth(y - 0.5);
    this.sprite = scene.add.image(x, y, 'cube').setDisplayOrigin(W / 2, RISE + W / 4).setDepth(y);
    this.body = { x, y: y - RISE / 2, hw: W / 2 - 1, hh: (RISE + W / 2) / 2 - 1 };
    this.zone = scene.add.zone(this.body.x, this.body.y, this.body.hw * 2, this.body.hh * 2);
    scene.physics.add.existing(this.zone, true);
    this.zone.setData('enemy', this);

    // The bar: a dark backing one pixel larger all round, and the red left on top.
    this.barBack = scene.add.rectangle(x, y - BAR_UP, BAR_W + 2, 4, 0x14110f, 0.85).setDepth(1e6);
    this.bar = scene.add.rectangle(x - BAR_W / 2, y - BAR_UP, BAR_W, 2, 0xd23c2a).setOrigin(0, 0.5).setDepth(1e6);

    if (scene.renderer.type === Phaser.WEBGL) {
      this.sprite.setPostPipeline(HitFX);
      const found = this.sprite.getPostPipeline(HitFX);
      this.fx = (Array.isArray(found) ? found[0] : found) as HitFX;
    }
  }

  /** It stands and can be hit and walked into. */
  get alive(): boolean {
    return this.gone === null;
  }

  /** Struck by a spell travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number): void {
    if (!this.alive) return;
    this.life--;
    this.flash = 1;
    const len = Math.hypot(dx, dy) || 1;
    this.push = { x: dx / len * NUDGE, y: dy / len * NUDGE };
    if (this.life <= 0) this.destroy(dx / len, dy / len);
  }

  // Breaks into stone chips thrown mostly the way the spell was going, and
  // stops being there: no body to hit, no ground taken.
  private destroy(dx: number, dy: number): void {
    this.gone = 0;
    (this.zone.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
    this.barBack.setVisible(false);
    this.bar.setVisible(false);
    const { x, y } = this.body;
    for (let i = 0; i < 22; i++) {
      const chip = Enemy.chips.emitParticleAt(
        x + Phaser.Math.Between(-9, 9), y + Phaser.Math.Between(-10, 8), 1);
      if (!chip) continue;
      chip.velocityX += dx * 70;
      chip.velocityY += dy * 35;
      chip.tint = Phaser.Utils.Array.GetRandom(STONE);
    }
  }

  private respawn(): void {
    this.gone = null;
    this.age = 0;
    this.life = this.shown = LIFE;
    this.flash = 0;
    (this.zone.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    for (const part of [this.sprite, this.shadow, this.barBack, this.bar]) part.setVisible(true);
    this.sprite.setPosition(this.footprint.x, this.footprint.y);
    if (this.fx) this.fx.amount = 0;
    else this.sprite.clearTint();
  }

  update(dt: number): void {
    if (this.gone !== null) {
      this.gone += dt;
      if (this.gone >= RESPAWN) this.respawn();
      return;
    }

    if (this.age < APPEAR) {
      this.age = Math.min(APPEAR, this.age + dt);
      const grown = this.age / APPEAR;
      this.sprite.setScale(grown * (2 - grown)); // quick at first, settling at full size
    }

    this.shown += (this.life - this.shown) * Math.min(1, dt * 14);
    this.bar.setSize(Math.max(0, BAR_W * this.shown / LIFE), 2);

    if (this.flash <= 0) return;
    this.flash = Math.max(0, this.flash - dt / FLASH);
    // The knock eases back to rest as the flash fades.
    const { x, y } = this.footprint;
    this.sprite.setPosition(Math.round(x + this.push.x * this.flash), Math.round(y + this.push.y * this.flash));
    if (this.fx) this.fx.amount = this.flash;
    else if (this.flash > 0) this.sprite.setTintFill(0xff2a1f);
    else this.sprite.clearTint();
  }

  /** The block, drawn once, and the chips it breaks into. */
  static setup(scene: Phaser.Scene): void {
    if (!scene.textures.exists('cube')) {
      const tex = scene.textures.createCanvas('cube', W, RISE + W / 2)!;
      const g = tex.getContext();
      const mid = W / 2, top = W / 4;
      const face = (colour: number, points: [number, number][]) => {
        g.fillStyle = `#${colour.toString(16).padStart(6, '0')}`;
        g.beginPath();
        points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.fill();
      };
      face(STONE[1], [[0, top], [mid, 2 * top], [mid, 2 * top + RISE], [0, top + RISE]]);
      face(STONE[2], [[W, top], [mid, 2 * top], [mid, 2 * top + RISE], [W, top + RISE]]);
      face(STONE[0], [[mid, 0], [W, top], [mid, 2 * top], [0, top]]);
      tex.refresh();

      // A white square, tinted per chip.
      const chip = scene.textures.createCanvas('chip', 3, 3)!;
      chip.getContext().fillStyle = '#ffffff';
      chip.getContext().fillRect(0, 0, 3, 3);
      chip.refresh();
    }
    // Chips fly up and out, then fall under gravity and fade.
    Enemy.chips = scene.add.particles(0, 0, 'chip', {
      lifespan: { min: 350, max: 650 },
      speedX: { min: -55, max: 55 },
      speedY: { min: -110, max: -30 },
      gravityY: 320,
      scale: { start: 1, end: 0.4 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 90 },
      emitting: false,
    }).setDepth(1e6);
  }
}
