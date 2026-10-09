import Phaser from 'phaser';
import type { Cast } from './machi/controller';
import { BOLT_RANGE, BOLT_SPEED, ISO_Y } from './machi/data';

/** What a kind of bolt looks like and how it flies. */
export interface BoltKind {
  /** Name for its textures. */
  key: string;
  /** Edge, middle and core of the orb; the sparks take the edge colour. */
  colours: [string, string, string];
  /** Sprite pixels per second along the ground. */
  speed: number;
  /** Ground distance it covers before fizzling out. */
  range: number;
}

/** Her spell, in the colours of the light the attack sheets draw on the branch. */
export const SPELL: BoltKind = {
  key: 'spell', colours: ['#46e6fa', '#bef8fc', '#ffffff'], speed: BOLT_SPEED, range: BOLT_RANGE,
};
/** What the stand-in enemies throw: slow enough to step out of its way. */
export const EMBER: BoltKind = {
  key: 'ember', colours: ['#e2542a', '#f7a23b', '#ffe9a8'], speed: 95, range: 340,
};

/**
 * A musket ball: many times faster than a spell, trailing powder smoke. It
 * covers more than an enemy's width in one step, so it is tested along its
 * path with `sweep` rather than by the physics engine.
 */
export const BALL: BoltKind = {
  key: 'ball', colours: ['#b9b2a3', '#4a4640', '#2a2724'], speed: 1500, range: 420,
};

/** A royalist's musket ball: fast, but not so fast it cannot be stepped out of. */
export const SHOT: BoltKind = {
  key: 'shot', colours: ['#d8cfb8', '#6b6458', '#2a2724'], speed: 330, range: 330,
};

interface Bolt {
  orb: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  /** Invisible box on the orb that the physics engine tests. */
  spot: Phaser.GameObjects.Zone;
  /** Position on the ground, and velocity along it. */
  x: number;
  y: number;
  /** Where the orb was drawn before this step's move. */
  from: { x: number; y: number };
  vx: number;
  vy: number;
  /** Height above the ground: it keeps the one the branch released it at. */
  z: number;
  age: number;
  /** It struck something and is done, wherever it had got to. */
  spent: boolean;
}

/** The spells in flight: an orb, the shadow under it and a trail of sparks. */
export class Bolts {
  private live: Bolt[] = [];
  /**
   * The orbs' boxes. A spell hits what it is seen to touch: its place on the
   * ground can be far below the orb, and testing that instead made spells
   * pass through whatever the player was pointing at.
   */
  readonly bodies: Phaser.Physics.Arcade.Group;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private scene: Phaser.Scene, private width: number, private height: number,
    private kind: BoltKind = SPELL,
  ) {
    this.makeTextures();
    this.bodies = scene.physics.add.group();
    const spark = `${kind.key}-spark`;
    this.sparks = scene.add.particles(0, 0, spark, {
      lifespan: 260, speed: { min: 0, max: 10 }, scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(1e6);
    this.burst = scene.add.particles(0, 0, spark, {
      lifespan: { min: 180, max: 340 }, speed: { min: 25, max: 85 }, scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(1e6);
  }

  spawn(cast: Cast): void {
    // Same convention as her own movement: a unit direction on the ground,
    // with the vertical part foreshortened.
    const len = Math.hypot(cast.dx, cast.dy) || 1;
    const spot = this.scene.add.zone(cast.x, cast.y - cast.height, 7, 7);
    const bolt: Bolt = {
      orb: this.scene.add.image(0, 0, this.kind.key),
      shadow: this.scene.add.ellipse(cast.x, cast.y, 8, 4, 0x000000, 0.22),
      spot,
      x: cast.x, y: cast.y,
      from: { x: cast.x, y: cast.y - cast.height },
      vx: cast.dx / len * this.kind.speed,
      vy: cast.dy / len * this.kind.speed * ISO_Y,
      z: cast.height,
      age: 0,
      spent: false,
    };
    this.live.push(bolt);
    this.bodies.add(spot);
    spot.setData('bolt', bolt);
  }

  /** The bolt whose spot this is has hit something. Returns its heading on screen. */
  strike(spot: Phaser.GameObjects.GameObject): { dx: number; dy: number } | null {
    const bolt = spot.getData('bolt') as Bolt | undefined;
    if (!bolt || bolt.spent) return null;
    bolt.spent = true;
    return { dx: bolt.vx, dy: bolt.vy };
  }

  update(dt: number): void {
    for (const bolt of this.live) {
      // One that has struck something stays where it did, to burst there.
      if (bolt.spent) continue;
      bolt.age += dt;
      bolt.from = { x: bolt.x, y: bolt.y - bolt.z };
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      const x = Math.round(bolt.x), y = Math.round(bolt.y);
      bolt.orb.setPosition(x, y - bolt.z).setDepth(bolt.y);
      bolt.shadow.setPosition(x, y).setDepth(bolt.y - 0.5);
      bolt.spot.setPosition(x, y - bolt.z);
      this.sparks.emitParticleAt(x, y - bolt.z, 1);
    }

    const spent = (b: Bolt) => b.spent || b.age * this.kind.speed >= this.kind.range
      || b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height;
    for (const bolt of this.live.filter(spent)) {
      this.burst.emitParticleAt(bolt.orb.x, bolt.orb.y, 10);
      bolt.orb.destroy();
      bolt.shadow.destroy();
      bolt.spot.destroy();
    }
    this.live = this.live.filter(b => !spent(b));
  }

  /**
   * Tests each bolt at points along the stretch it flew this step, `every`
   * pixels apart, in order. Where `hit` says it struck something the bolt
   * stops there and is spent. For bolts too fast to be caught where they
   * happen to stand at the end of a step.
   */
  sweep(every: number, hit: (x: number, y: number) => boolean): void {
    for (const bolt of this.live) {
      if (bolt.spent) continue;
      const to = { x: bolt.x, y: bolt.y - bolt.z };
      const far = Math.hypot(to.x - bolt.from.x, to.y - bolt.from.y);
      const steps = Math.max(1, Math.ceil(far / every));
      for (let i = 1; i <= steps && !bolt.spent; i++) {
        const x = bolt.from.x + (to.x - bolt.from.x) * i / steps;
        const y = bolt.from.y + (to.y - bolt.from.y) * i / steps;
        if (!hit(x, y)) continue;
        bolt.spent = true;
        // It goes no further than what it struck: its burst is drawn there.
        bolt.x = x;
        bolt.y = y + bolt.z;
        bolt.orb.setPosition(Math.round(x), Math.round(y));
      }
    }
  }

  /** Ends every bolt in flight, each with its burst. */
  clear(): void {
    for (const bolt of this.live) bolt.spent = true;
    this.update(0);
  }

  // Drawn pixel by pixel instead of loaded, so they match the sheets' light
  // exactly and need no art of their own yet.
  private makeTextures(): void {
    const { key, colours: [edge, middle, core] } = this.kind;
    if (this.scene.textures.exists(key)) return;
    const size = 9, mid = (size - 1) / 2;
    const orb = this.scene.textures.createCanvas(key, size, size)!;
    const g = orb.getContext();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - mid, y - mid);
        if (d > 4.3) continue;
        g.fillStyle = d < 1.2 ? core : d < 2.6 ? middle : edge;
        g.fillRect(x, y, 1, 1);
      }
    }
    orb.refresh();

    const spark = this.scene.textures.createCanvas(`${key}-spark`, 2, 2)!;
    spark.getContext().fillStyle = edge;
    spark.getContext().fillRect(0, 0, 2, 2);
    spark.refresh();
  }
}
