import Phaser from 'phaser';
import type { Cast } from './machi/controller';
import { BOLT_RANGE, BOLT_SPEED, ISO_Y } from './machi/data';

// The colours of the light the attack sheets draw on the branch.
const CYAN = '#46e6fa', PALE = '#bef8fc', WHITE = '#ffffff';

interface Bolt {
  orb: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  /** Position on the ground, and velocity along it. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Height above the ground: it keeps the one the branch released it at. */
  z: number;
  age: number;
}

/** The spells in flight: an orb, the shadow under it and a trail of sparks. */
export class Bolts {
  private live: Bolt[] = [];
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene, private width: number, private height: number) {
    this.makeTextures();
    this.sparks = scene.add.particles(0, 0, 'spark', {
      lifespan: 260, speed: { min: 0, max: 10 }, scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(1e6);
    this.burst = scene.add.particles(0, 0, 'spark', {
      lifespan: { min: 180, max: 340 }, speed: { min: 25, max: 85 }, scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(1e6);
  }

  spawn(cast: Cast): void {
    // Same convention as her own movement: a unit direction on the ground,
    // with the vertical part foreshortened.
    const len = Math.hypot(cast.dx, cast.dy) || 1;
    this.live.push({
      orb: this.scene.add.image(0, 0, 'bolt'),
      shadow: this.scene.add.ellipse(0, 0, 8, 3, 0x000000, 0.22),
      x: cast.x, y: cast.y,
      vx: cast.dx / len * BOLT_SPEED,
      vy: cast.dy / len * BOLT_SPEED * ISO_Y,
      z: cast.height,
      age: 0,
    });
  }

  update(dt: number): void {
    for (const bolt of this.live) {
      bolt.age += dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      const x = Math.round(bolt.x), y = Math.round(bolt.y);
      bolt.orb.setPosition(x, y - bolt.z).setDepth(bolt.y);
      bolt.shadow.setPosition(x, y).setDepth(bolt.y - 0.5);
      this.sparks.emitParticleAt(x, y - bolt.z, 1);
    }

    const spent = (b: Bolt) => b.age * BOLT_SPEED >= BOLT_RANGE
      || b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height;
    for (const bolt of this.live.filter(spent)) {
      this.burst.emitParticleAt(bolt.orb.x, bolt.orb.y, 10);
      bolt.orb.destroy();
      bolt.shadow.destroy();
    }
    this.live = this.live.filter(b => !spent(b));
  }

  // Drawn pixel by pixel instead of loaded, so they match the sheets' light
  // exactly and need no art of their own yet.
  private makeTextures(): void {
    if (this.scene.textures.exists('bolt')) return;
    const size = 9, mid = (size - 1) / 2;
    const orb = this.scene.textures.createCanvas('bolt', size, size)!;
    const g = orb.getContext();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - mid, y - mid);
        if (d > 4.3) continue;
        g.fillStyle = d < 1.2 ? WHITE : d < 2.6 ? PALE : CYAN;
        g.fillRect(x, y, 1, 1);
      }
    }
    orb.refresh();

    const spark = this.scene.textures.createCanvas('spark', 2, 2)!;
    spark.getContext().fillStyle = CYAN;
    spark.getContext().fillRect(0, 0, 2, 2);
    spark.refresh();
  }
}
