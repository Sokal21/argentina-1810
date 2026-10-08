import Phaser from 'phaser';
import { Bolts } from '../bolts';
import { LookFX } from '../fx/LookFX';
import { fx } from '../fx/settings';
import { Keys } from '../input';
import { MachiController } from '../machi/controller';
import { FRAME, SHEETS } from '../machi/data';

const ZOOM = 2;            // screen pixels per sprite pixel
const WORLD_W = 1280;      // world size, in sprite pixels
const WORLD_H = 800;
const TILE_W = 32, TILE_H = 16; // ground diamond, in sprite pixels
const CHEST = 45;          // height of her chest above her feet, where the light sits

export class GameScene extends Phaser.Scene {
  private keys!: Keys;
  private machi!: MachiController;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private bolts!: Bolts;
  private look?: LookFX;
  private label = '';

  constructor() {
    super('game');
  }

  preload(): void {
    // Several animations share a sheet, so textures are keyed by file.
    for (const src of new Set(Object.values(SHEETS).map(s => s.src))) {
      this.load.spritesheet(src, src, { frameWidth: FRAME, frameHeight: FRAME });
    }
  }

  create(): void {
    this.drawGround();

    this.machi = new MachiController({ minX: 12, maxX: WORLD_W - 12, minY: FRAME, maxY: WORLD_H - 6 });
    this.machi.x = WORLD_W / 2;
    this.machi.y = WORLD_H / 2;
    this.keys = new Keys();

    this.shadow = this.add.ellipse(0, 0, 22, 8, 0x000000, 0.28);
    this.sprite = this.add.sprite(0, 0, SHEETS.idle_front.src, 0);
    this.bolts = new Bolts(this, WORLD_W, WORLD_H);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setRoundPixels(true);
    // Follow her feet, framed a little above them so her body is centred.
    cam.startFollow(this.shadow, true, 1, 1, 0, CHEST);

    if (this.renderer.type === Phaser.WEBGL) {
      const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      renderer.pipelines.addPostPipeline('LookFX', LookFX);
      cam.setPostPipeline(LookFX);
      const found = cam.getPostPipeline(LookFX);
      this.look = (Array.isArray(found) ? found[0] : found) as LookFX;
      this.look.pixel = ZOOM;
    }

    this.draw();
  }

  update(_time: number, delta: number): void {
    // A long frame (tab in the background) must not teleport her.
    const dt = Math.min(0.05, delta / 1000);
    this.machi.update(dt, this.keys.read());
    const cast = this.machi.takeCast();
    if (cast) this.bolts.spawn(cast);
    this.bolts.update(dt);
    this.draw();
  }

  /** Name of the animation on screen, for the debug readout. */
  get state(): string {
    return this.label;
  }

  private draw(): void {
    const pose = this.machi.pose();
    const x = Math.round(pose.x), y = Math.round(pose.y);
    const ax = Math.round(pose.ax);

    // Things further down the screen are in front.
    this.shadow.setPosition(x, y - 1).setDepth(y - 0.5);
    this.sprite
      .setTexture(SHEETS[pose.sheet].src, pose.frame)
      .setFlipX(pose.flip)
      // The origin is her feet under the body's centre. Flipping mirrors the
      // frame inside its own box, so the centre moves to the other side.
      .setDisplayOrigin(pose.flip ? FRAME - ax : ax, FRAME - pose.ay)
      .setPosition(x, y)
      .setDepth(y);
    this.label = pose.sheet + (pose.flip ? ' (espejado)' : '');

    if (this.look) {
      const cam = this.cameras.main;
      this.look.grain = fx.grain ? 1 : 0;
      this.look.light = fx.light ? 1 : 0;
      this.look.crt = fx.crt ? 1 : 0;
      this.look.lightX = (x - cam.worldView.x) * cam.zoom;
      this.look.lightY = (y - CHEST - cam.worldView.y) * cam.zoom;
    }
  }

  // Diamonds on a staggered grid, each in one of five close greens picked by
  // a hash of its cell, drawn once into a texture the size of the world.
  private drawGround(): void {
    const tex = this.textures.createCanvas('ground', WORLD_W, WORLD_H)!;
    const g = tex.getContext();
    g.fillStyle = '#2b3524';
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    const greens = ['#303b27', '#2e3926', '#333e29', '#2c3624', '#35402a'];
    const cols = Math.ceil(WORLD_W / TILE_W) + 2, rows = Math.ceil(WORLD_H / TILE_H) + 2;
    for (let r = -1; r <= rows * 2; r++) {
      for (let c = -1; c <= cols * 2; c++) {
        if ((r + c) % 2 === 0) continue;
        const x = c * TILE_W / 2, y = r * TILE_H / 2;
        g.fillStyle = greens[Math.abs((c * 73856093) ^ (r * 19349663)) % greens.length];
        g.beginPath();
        g.moveTo(x, y - TILE_H / 2); g.lineTo(x + TILE_W / 2, y);
        g.lineTo(x, y + TILE_H / 2); g.lineTo(x - TILE_W / 2, y);
        g.fill();
      }
    }
    tex.refresh();
    this.add.image(0, 0, 'ground').setOrigin(0, 0).setDepth(-1e6);
  }
}
