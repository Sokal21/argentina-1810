import Phaser from 'phaser';
import { SpiritFX } from '../fx/SpiritFX';
import type { Vec } from '../machi/controller';
import { NAHUEL, NahuelBrain, type Prey } from './brain';

// The sheets, each a single row of square frames. `ax` is where the middle
// of its body falls in a frame and `feet` the row its paws stand on. All are
// drawn heading right: toward the viewer, or away for the ones from behind.
const SHEETS = {
  run:         { src: 'nahuel/carrera_frente.png',  size: 96, ax: 48, feet: 96 },
  run_back:    { src: 'nahuel/carrera_espalda.png', size: 100, ax: 50, feet: 100 },
  strike:      { src: 'nahuel/ataque_frente.png',   size: 96, ax: 48, feet: 96 },
  strike_back: { src: 'nahuel/ataque_espalda.png',  size: 100, ax: 50, feet: 100 },
};
type SheetName = keyof typeof SHEETS;

const RUN_FPS = 12;
const LIGHT = 0x46e6fa;   // the light it comes out of and goes back into: her spells' own

/** The nahuel on screen: draws what its brain is doing. */
export class Nahuel {
  private brain = new NahuelBrain();
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  /** Runs its gallop. */
  private clock = 0;
  /** The light it throws on the ground under it. */
  private pool: Phaser.GameObjects.Image;
  private fx?: SpiritFX;

  /** @param zoom screen pixels per sprite pixel, which its light is drawn in blocks of */
  constructor(scene: Phaser.Scene, private sparks: Phaser.GameObjects.Particles.ParticleEmitter, zoom = 2) {
    // A soft round of light, squashed onto the ground.
    if (!scene.textures.exists('nahuel-pool')) {
      const tex = scene.textures.createCanvas('nahuel-pool', 96, 96)!;
      const g = tex.getContext();
      const fade = g.createRadialGradient(48, 48, 0, 48, 48, 48);
      fade.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      fade.addColorStop(0.45, 'rgba(255, 255, 255, 0.32)');
      fade.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = fade;
      g.fillRect(0, 0, 96, 96);
      tex.refresh();
    }
    this.pool = scene.add.image(0, 0, 'nahuel-pool').setTint(LIGHT).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.25, 0.5).setVisible(false);
    this.shadow = scene.add.ellipse(0, 0, 34, 10, 0x000000, 0.28).setVisible(false);
    this.sprite = scene.add.sprite(0, 0, SHEETS.run.src, 0).setVisible(false);

    if (scene.renderer.type === Phaser.WEBGL) {
      (scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('SpiritFX', SpiritFX);
      this.sprite.setPostPipeline(SpiritFX);
      const found = this.sprite.getPostPipeline(SpiritFX);
      this.fx = (Array.isArray(found) ? found[0] : found) as SpiritFX;
      this.fx.pixel = zoom;
    }
  }

  static preload(scene: Phaser.Scene): void {
    for (const { src, size } of Object.values(SHEETS)) {
      scene.load.spritesheet(src, src, { frameWidth: size, frameHeight: size });
    }
  }

  get present(): boolean {
    return this.brain.present;
  }

  /** The spot on the ground under it. */
  get ground(): Vec {
    return { x: this.brain.x, y: this.brain.y };
  }

  /** How much of its time is left, from 1 down to 0. */
  share(time: number): number {
    return this.brain.share(time);
  }

  /** Whether something standing at `spot` would rather go for it than for her. */
  lures(spot: Vec, her: Vec): boolean {
    return this.brain.lures(spot, her);
  }

  /** Calls it up at a spot, for so many seconds, in a burst of her light. */
  summon(at: Vec, time: number): void {
    this.brain.summon(at, time);
    this.burst();
  }

  /** Sends it back at once, as when she falls. */
  dismiss(): void {
    if (this.brain.present) this.brain.summon(this.ground, 0);
  }

  /** Advances it. Returns what its claws came down on this step, if anything. */
  update(dt: number, prey: Prey[], her: Vec): Prey | null {
    const was = this.brain.mode;
    const torn = this.brain.update(dt, prey, her);
    if (was !== 'fade' && this.brain.mode === 'fade') this.burst();
    this.clock += dt;
    this.draw();
    return torn;
  }

  private burst(): void {
    const { x, y } = this.brain;
    for (let i = 0; i < 26; i++) {
      const spark = this.sparks.emitParticleAt(x + Phaser.Math.Between(-22, 22), y - Phaser.Math.Between(0, 40), 1);
      if (spark) spark.tint = LIGHT;
    }
  }

  private draw(): void {
    const b = this.brain;
    if (!b.present) {
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
      this.pool.setVisible(false);
      return;
    }
    let name: SheetName = b.back ? 'run_back' : 'run';
    let frame = 0, alpha = 1;
    switch (b.mode) {
      case 'appear': alpha = Math.min(1, b.t / NAHUEL.appear); break;
      case 'fade': alpha = Math.max(0, 1 - b.t / NAHUEL.fade); break;
      case 'run': frame = Math.floor(this.clock * RUN_FPS) % 8; break;
      case 'strike':
        name = b.back ? 'strike_back' : 'strike';
        frame = Math.min(7, Math.floor(b.t / NAHUEL.strike * 8));
        break;
    }
    const sheet = SHEETS[name];
    const flip = b.faceX < 0;
    const x = Math.round(b.x), y = Math.round(b.y);
    this.sprite
      .setTexture(sheet.src, frame)
      .setFlipX(flip)
      .setDisplayOrigin(flip ? sheet.size - sheet.ax : sheet.ax, sheet.feet)
      .setPosition(x, y)
      .setDepth(y)
      .setAlpha(alpha)
      // Coming and going it is all light; between, itself.
      .setTintFill(LIGHT)
      .setVisible(true);
    if (alpha >= 1) this.sprite.clearTint();
    this.shadow.setPosition(x, y).setDepth(y - 0.5).setAlpha(alpha).setVisible(true);
    // Its light breathes on the ground, and fades in and out with it.
    const breath = 0.5 + 0.5 * Math.sin(this.clock * 2.6);
    this.pool.setPosition(x, y - 4).setDepth(y - 0.6).setAlpha(alpha * (0.2 + 0.12 * breath)).setVisible(true);
    if (this.fx) this.fx.power = alpha;
  }
}
