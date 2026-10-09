import Phaser from 'phaser';
import { HitFX } from './fx/HitFX';
import type { Cast, Vec } from './machi/controller';
import { ISO_Y } from './machi/data';
import type { Footprint } from './world/footprint';

const W = 28;        // width of the cube's base diamond
const RISE = 16;     // height of its sides
const FLASH = 0.22;  // seconds the red takes to fade
const NUDGE = 3;     // pixels it is knocked along the bolt's path, then springs back
const LIFE = 3;      // spells it takes to destroy
const RESPAWN = 5;   // seconds until a destroyed one comes back, so there is always something to hit
const APPEAR = 0.25; // seconds it takes to grow back in
const SIGHT = 230;   // ground distance at which it starts throwing
const RELOAD: [number, number] = [1.6, 2.8]; // seconds between throws, picked afresh each time
const WINDUP = 0.45; // seconds it squashes down before throwing, as a warning
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
  life: number;

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
  private shown: number;
  /** Seconds since it last appeared; it grows in over the first APPEAR. */
  private age = APPEAR;
  /** Seconds until it next starts a throw. */
  private reload = Phaser.Math.FloatBetween(...RELOAD);
  /** Seconds into the squash before a throw, or null when not throwing. */
  private windup: number | null = null;

  private static chips: Phaser.GameObjects.Particles.ParticleEmitter;

  /** @param max spells it takes to destroy, for one sturdier than the rest */
  constructor(scene: Phaser.Scene, x: number, y: number, private max = LIFE) {
    this.life = this.shown = max;
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

  /** Where it stands, and how far its body reaches from there. */
  get ground(): Vec {
    return this.footprint;
  }
  readonly girth = W / 2;

  /** How strongly it smoulders, from 0 to 1, while it is on fire. */
  set burning(amount: number) {
    if (this.fx) this.fx.burn = amount;
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
    this.windup = null;
    this.reload = Phaser.Math.FloatBetween(...RELOAD);
    this.age = 0;
    this.life = this.shown = this.max;
    this.flash = 0;
    (this.zone.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    for (const part of [this.sprite, this.shadow, this.barBack, this.bar]) part.setVisible(true);
    this.sprite.setPosition(this.footprint.x, this.footprint.y);
    if (this.fx) this.fx.amount = 0;
    else this.sprite.clearTint();
  }

  /**
   * Advances it. `target` is the point on screen it throws at, if there is
   * anyone to throw at; the return value is the ember it lets go this step.
   */
  update(dt: number, target: Vec | null): Cast | null {
    if (this.gone !== null) {
      this.gone += dt;
      if (this.gone >= RESPAWN) this.respawn();
      return null;
    }
    const thrown = this.throwAt(dt, target);
    this.animate(dt);
    return thrown;
  }

  // It waits out its reload, then squashes down for a moment so the throw
  // can be seen coming, and lets go from its top toward where she is then.
  private throwAt(dt: number, target: Vec | null): Cast | null {
    const { x, y } = this.footprint;
    const top = RISE + 4;
    // Ground distance: the vertical gap on screen counts double.
    const near = target && Math.hypot(target.x - x, (target.y - y) / ISO_Y) < SIGHT;
    if (this.windup === null) {
      this.reload -= dt;
      if (this.reload <= 0 && near) this.windup = 0;
      return null;
    }
    this.windup += dt;
    const p = Math.min(1, this.windup / WINDUP);
    this.sprite.setScale(1 + 0.14 * p, 1 - 0.2 * p);
    if (p < 1) return null;
    this.windup = null;
    this.reload = Phaser.Math.FloatBetween(...RELOAD);
    this.sprite.setScale(1);
    if (!target) return null;
    // Aimed from where the ember is seen to start, like her own spells.
    return { x, y, height: top, dx: target.x - x, dy: (target.y - (y - top)) / ISO_Y };
  }

  private animate(dt: number): void {
    if (this.age < APPEAR) {
      this.age = Math.min(APPEAR, this.age + dt);
      const grown = this.age / APPEAR;
      this.sprite.setScale(grown * (2 - grown)); // quick at first, settling at full size
    }

    this.shown += (this.life - this.shown) * Math.min(1, dt * 14);
    this.bar.setSize(Math.max(0, BAR_W * this.shown / this.max), 2);

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
