import Phaser from 'phaser';
import { ISO_Y } from '../machi/data';

const SKY = 320;        // how far above the ground a bolt starts
const LIFE = 0.26;      // seconds a bolt is on screen
const REDRAW = 0.045;   // seconds between its changes of shape
const EDGE = 0x46e6fa, GLOW = 0xbef8fc, CORE = 0xffffff;

interface Bolt { x: number; y: number; radius: number; t: number; next: number }

/**
 * Lightning falling on a patch of ground: a jagged line from the sky redrawn
 * a few times as it flickers, a ring thrown out along the ground where it
 * lands, and sparks.
 */
export class Lightning {
  private live: Bolt[] = [];
  private lines: Phaser.GameObjects.Graphics;
  private ground: Phaser.GameObjects.Graphics;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene) {
    // Light adds to what is behind it, so crossing strokes burn white.
    this.lines = scene.add.graphics().setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    this.ground = scene.add.graphics().setDepth(-1000).setBlendMode(Phaser.BlendModes.ADD);
    if (!scene.textures.exists('lightning-spark')) {
      const tex = scene.textures.createCanvas('lightning-spark', 2, 2)!;
      tex.getContext().fillStyle = '#bef8fc';
      tex.getContext().fillRect(0, 0, 2, 2);
      tex.refresh();
    }
    this.sparks = scene.add.particles(0, 0, 'lightning-spark', {
      lifespan: { min: 220, max: 520 },
      speedX: { min: -90, max: 90 },
      speedY: { min: -120, max: -10 },
      gravityY: 260,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** A bolt lands on the patch of this radius centred here. */
  strike(x: number, y: number, radius: number): void {
    this.live.push({ x, y, radius, t: 0, next: 0 });
    this.sparks.emitParticleAt(x, y, 26);
    this.scene.cameras.main.shake(140, 0.004);
  }

  update(dt: number): void {
    let redraw = false;
    for (const bolt of this.live) {
      bolt.t += dt;
      bolt.next -= dt;
      if (bolt.next <= 0) { bolt.next = REDRAW; redraw = true; }
    }
    const before = this.live.length;
    this.live = this.live.filter(b => b.t < LIFE);
    if (this.live.length !== before) redraw = true;

    // The ring is smooth, so it is drawn every step; the bolt only when it
    // changes shape, which is what makes it flicker.
    this.ground.clear();
    for (const { x, y, radius, t } of this.live) {
      const p = t / LIFE;
      const r = radius * (0.5 + 0.8 * p);
      this.ground.fillStyle(GLOW, 0.5 * (1 - p)).fillEllipse(x, y, r * 2, r * 2 * ISO_Y);
      this.ground.lineStyle(2, CORE, 1 - p).strokeEllipse(x, y, r * 2, r * 2 * ISO_Y);
    }
    if (!redraw) return;
    this.lines.clear();
    for (const bolt of this.live) this.draw(bolt);
  }

  // A crooked path down from the sky, with a fork or two, in three strokes:
  // a wide faint one, a narrower bright one and a white core.
  private draw({ x, y, t }: Bolt): void {
    const fade = 1 - t / LIFE;
    const path = this.path(x + Phaser.Math.Between(-30, 30), y - SKY, x, y, 14);
    const forks = [path];
    for (let i = 0; i < 2; i++) {
      const from = path[Phaser.Math.Between(4, path.length - 4)];
      forks.push(this.path(from.x, from.y,
        from.x + Phaser.Math.Between(-55, 55), from.y + Phaser.Math.Between(35, 80), 5));
    }
    for (const [width, colour, alpha] of [[7, EDGE, 0.3], [3, GLOW, 0.75], [1, CORE, 1]] as const) {
      this.lines.lineStyle(width, colour, alpha * fade);
      forks.forEach((points, i) => {
        // Forks are thinner than the trunk: they skip the wide stroke.
        if (i > 0 && width === 7) return;
        this.lines.strokePoints(points);
      });
    }
  }

  private path(x0: number, y0: number, x1: number, y1: number, steps: number): Phaser.Math.Vector2[] {
    const points = [new Phaser.Math.Vector2(x0, y0)];
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      // Wanders most in the middle, and lands exactly on the spot.
      const stray = 16 * Math.sin(k * Math.PI);
      points.push(new Phaser.Math.Vector2(
        Math.round(x0 + (x1 - x0) * k + Phaser.Math.FloatBetween(-stray, stray)),
        Math.round(y0 + (y1 - y0) * k),
      ));
    }
    points.push(new Phaser.Math.Vector2(x1, y1));
    return points;
  }
}
