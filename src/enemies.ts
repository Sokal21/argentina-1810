import Phaser from 'phaser';
import { HitFX } from './fx/HitFX';
import type { Footprint } from './world/footprint';

const W = 28;        // width of the cube's base diamond
const RISE = 16;     // height of its sides
const FLASH = 0.22;  // seconds the red takes to fade
const NUDGE = 3;     // pixels it is knocked along the bolt's path, then springs back

/** A stand-in enemy: a stone block that flashes red when a spell hits it. */
export class Enemy {
  /** The ground it stands on: what blocks her from walking through. */
  readonly footprint: Footprint;
  /** Its body as it appears on screen: what a spell has to be seen to touch. */
  readonly body: Footprint;
  /** Invisible box over that body, which the physics engine tests against. */
  readonly zone: Phaser.GameObjects.Zone;
  private sprite: Phaser.GameObjects.Image;
  private fx?: HitFX;
  private flash = 0;
  private push = { x: 0, y: 0 };
  hits = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.footprint = { x, y, hw: W / 2 - 1, hh: W / 4 - 1 };
    scene.add.ellipse(x, y + 2, W + 6, W / 2 + 2, 0x000000, 0.25).setDepth(y - 0.5);
    this.sprite = scene.add.image(x, y, 'cube').setDisplayOrigin(W / 2, RISE + W / 4).setDepth(y);
    this.body = { x, y: y - RISE / 2, hw: W / 2 - 1, hh: (RISE + W / 2) / 2 - 1 };
    this.zone = scene.add.zone(this.body.x, this.body.y, this.body.hw * 2, this.body.hh * 2);
    scene.physics.add.existing(this.zone, true);
    this.zone.setData('enemy', this);

    if (scene.renderer.type === Phaser.WEBGL) {
      this.sprite.setPostPipeline(HitFX);
      const found = this.sprite.getPostPipeline(HitFX);
      this.fx = (Array.isArray(found) ? found[0] : found) as HitFX;
    }
  }

  /** Struck by a spell travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number): void {
    this.hits++;
    this.flash = 1;
    const len = Math.hypot(dx, dy) || 1;
    this.push = { x: dx / len * NUDGE, y: dy / len * NUDGE };
  }

  update(dt: number): void {
    if (this.flash <= 0) return;
    this.flash = Math.max(0, this.flash - dt / FLASH);
    // The knock eases back to rest as the flash fades.
    const { x, y } = this.footprint;
    this.sprite.setPosition(Math.round(x + this.push.x * this.flash), Math.round(y + this.push.y * this.flash));
    if (this.fx) this.fx.amount = this.flash;
    else if (this.flash > 0) this.sprite.setTintFill(0xff2a1f);
    else this.sprite.clearTint();
  }

  /** The block, drawn once: a lit top, a mid left face and a dark right one. */
  static makeTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('cube')) return;
    const tex = scene.textures.createCanvas('cube', W, RISE + W / 2)!;
    const g = tex.getContext();
    const mid = W / 2, top = W / 4;
    const face = (colour: string, points: [number, number][]) => {
      g.fillStyle = colour;
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.fill();
    };
    face('#6d6457', [[0, top], [mid, 2 * top], [mid, 2 * top + RISE], [0, top + RISE]]);
    face('#4f483e', [[W, top], [mid, 2 * top], [mid, 2 * top + RISE], [W, top + RISE]]);
    face('#968c79', [[mid, 0], [W, top], [mid, 2 * top], [0, top]]);
    tex.refresh();
  }
}
