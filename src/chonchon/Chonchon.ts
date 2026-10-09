import Phaser from 'phaser';
import { HitFX } from '../fx/HitFX';
import type { Vec } from '../machi/controller';
import { ISO_Y } from '../machi/data';
import type { Footprint } from '../world/footprint';
import { BITE_TIME, ChonchonBrain, DYING, LIFE, WINDUP, type Bounds } from './brain';

// The sheets, each a single row of square frames. `ax`, `ay` are where the
// middle of its face falls in a frame.
const SHEETS = {
  fly:      { src: 'chonchon/vuelo.png',         size: 68, ax: 39, ay: 40 },
  fly_back: { src: 'chonchon/vuelo_espalda.png', size: 66, ax: 33, ay: 37 },
  dive:     { src: 'chonchon/picada.png',        size: 68, ax: 39, ay: 40 },
  dive_back: { src: 'chonchon/picada_espalda.png', size: 66, ax: 33, ay: 37 },
  bite:     { src: 'chonchon/mordida.png',       size: 68, ax: 39, ay: 40 },
  death:    { src: 'chonchon/muerte.png',        size: 68, ax: 39, ay: 40 },
};
type SheetName = keyof typeof SHEETS;

const FLAP_FPS = 10;
// The bite sheet relaxes between opening and snapping, which reads as a
// hesitation; holding the open mouth instead makes one clean snap.
const BITE_ORDER = [0, 1, 2, 2, 4, 5];
// The dives are drawn pointing down and to the right, or seen from behind up
// and to the right, at these angles; turning the sprite by the difference
// points it wherever it dives. With both, and their mirror images, that is
// never much of a turn.
const DRAWN_AIM = { dive: Math.PI / 4, dive_back: -0.66 };
// The warning's frames. From behind, the fourth has the tongue come apart.
const WINDUP_ORDER = { dive: [0, 1, 2, 3], dive_back: [0, 1, 2, 2] };
const TURN_BACK = 0.2;   // seconds it takes to level out after a dive
const HEAP = 27;         // height to draw the last frame of its fall at, so the heap lies on the ground
const FADE = 0.6;        // seconds the heap takes to fade
const FLASH = 0.22;      // seconds the red takes to fade
const HEAD = { hw: 9, hh: 10 }; // the part of it a spell has to be seen to touch
const BAR_W = 14;        // life bar, in pixels
const BAR_UP = 24;       // how far above its face the bar sits

/** A chonchón on screen: draws what its brain is doing and takes the hits. */
export class Chonchon {
  /** Invisible box over its head, which the physics engine tests against. */
  readonly zone: Phaser.GameObjects.Zone;

  private brain: ChonchonBrain;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private barBack: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private fx?: HitFX;
  private flash = 0;
  private shown = LIFE;
  /** Runs the wing beat, offset so several do not flap in step. */
  private clock = Math.random();
  /** The turn it left its last dive with, which it eases out of. */
  private tilt = 0;
  /** Height it was at when it was brought down. */
  private fellFrom = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, bounds?: Bounds) {
    this.brain = new ChonchonBrain(x, y, bounds);
    this.shadow = scene.add.ellipse(x, y, 16, 6, 0x000000, 0.25);
    this.sprite = scene.add.sprite(x, y, SHEETS.fly.src, 0);
    this.zone = scene.add.zone(x, y, HEAD.hw * 2, HEAD.hh * 2);
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
    for (const { src, size } of Object.values(SHEETS)) {
      scene.load.spritesheet(src, src, { frameWidth: size, frameHeight: size });
    }
  }

  get alive(): boolean {
    return this.brain.alive;
  }

  /** Its head as it appears on screen. */
  get body(): Footprint {
    return { x: this.brain.x, y: this.brain.y - this.brain.z, ...HEAD };
  }

  /** Struck by a spell travelling along (dx, dy) on screen. */
  hit(dx: number, dy: number): void {
    if (!this.alive) return;
    this.fellFrom = this.brain.z;
    this.brain.hit(dx, dy);
    this.flash = 1;
  }

  /** Advances it. `her` is where she stands, if she can be attacked. Returns true when it bites her. */
  update(dt: number, her: Vec | null): boolean {
    const bitten = this.brain.update(dt, her);
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt / FLASH);
    this.shown += (this.brain.life - this.shown) * Math.min(1, dt * 14);
    this.draw();
    return bitten;
  }

  private draw(): void {
    const b = this.brain;
    let name: SheetName = b.back ? 'fly_back' : 'fly';
    let frame = Math.floor(this.clock * FLAP_FPS) % 8;
    let z = b.z, alpha = 1, tilt = 0;
    let flip = b.faceX < 0;

    // On screen it points along its heading with the vertical part
    // foreshortened. The art points to the right, or to the left when mirrored.
    const diving = b.back ? 'dive_back' : 'dive';
    const aim = () => {
      flip = b.dir.x < 0;
      const angle = Math.atan2(b.dir.y * ISO_Y, b.dir.x);
      const drawn = DRAWN_AIM[diving];
      return Phaser.Math.Angle.Wrap(angle - (flip ? Math.PI - drawn : drawn));
    };

    switch (b.mode) {
      case 'windup': {
        // The warning: its tongue swings round to point at her.
        const p = Math.min(1, b.t / WINDUP);
        name = diving;
        frame = WINDUP_ORDER[diving][Math.min(3, Math.floor(p * 4))];
        tilt = aim() * p;
        break;
      }
      case 'dive':
        name = diving;
        frame = Math.min(7, 4 + Math.floor(b.t * 16));
        tilt = this.tilt = aim();
        break;
      case 'recover':
        tilt = this.tilt * Math.max(0, 1 - b.t / TURN_BACK);
        break;
      case 'bite':
        name = 'bite';
        frame = BITE_ORDER[Math.min(5, Math.floor(b.t / BITE_TIME * 6))];
        break;
      case 'dying': {
        const p = Math.min(1, b.t / DYING);
        name = 'death';
        frame = Math.min(7, Math.floor(p * 8));
        z = this.fellFrom + (HEAP - this.fellFrom) * p;
        break;
      }
      case 'gone':
        name = 'death';
        frame = 7;
        z = HEAP;
        alpha = Math.max(0, 1 - b.t / FADE);
        break;
    }

    const sheet = SHEETS[name];
    const x = Math.round(b.x), y = Math.round(b.y);
    const up = Math.round(z);
    this.sprite
      .setTexture(sheet.src, frame)
      .setFlipX(flip)
      .setDisplayOrigin(flip ? sheet.size - sheet.ax : sheet.ax, sheet.ay)
      .setPosition(x, y - up)
      .setRotation(tilt)
      .setDepth(y)
      .setAlpha(alpha)
      .setVisible(alpha > 0);
    // The shadow tightens as it comes down.
    const spread = 1 + z / 80;
    this.shadow.setPosition(x, y).setDepth(y - 0.5).setScale(spread, spread)
      .setAlpha(alpha).setVisible(alpha > 0);

    const alive = b.alive;
    this.zone.setPosition(x, y - up);
    (this.zone.body as Phaser.Physics.Arcade.Body).enable = alive;
    const hurt = alive && b.life < LIFE;
    this.barBack.setPosition(x, y - up - BAR_UP).setVisible(hurt);
    this.bar.setPosition(x - BAR_W / 2, y - up - BAR_UP).setVisible(hurt)
      .setSize(Math.max(0, BAR_W * this.shown / LIFE), 2);

    if (this.fx) this.fx.amount = this.flash;
    else if (this.flash > 0) this.sprite.setTintFill(0xff2a1f);
    else this.sprite.clearTint();
  }
}
