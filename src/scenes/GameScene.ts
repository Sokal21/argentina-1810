import Phaser from 'phaser';
import { Bolts } from '../bolts';
import { Enemy } from '../enemies';
import { HitFX } from '../fx/HitFX';
import { LookFX } from '../fx/LookFX';
import { controls, fx } from '../fx/settings';
import { Keys } from '../input';
import { MachiController, type MachiInput, type Vec } from '../machi/controller';
import { FRAME, ISO_Y, SHEETS } from '../machi/data';
import { overlaps, pushOut, type Footprint } from '../world/footprint';

const ZOOM = 2;            // screen pixels per sprite pixel
const WORLD_W = 1280;      // world size, in sprite pixels
const WORLD_H = 800;
const TILE_W = 32, TILE_H = 16; // ground diamond, in sprite pixels
const CHEST = 45;          // height of her chest above her feet, where the light sits
const ARRIVE = 5;          // she stops this close to the pointer instead of jittering on it
const FEET: Pick<Footprint, 'hw' | 'hh'> = { hw: 7, hh: 3.5 }; // the ground she stands on
// Stand-in enemies, as offsets from where she starts.
const CUBES: [number, number][] = [[-110, -30], [120, -50], [150, 60], [-60, 90], [0, -110]];

export class GameScene extends Phaser.Scene {
  private keys!: Keys;
  private machi!: MachiController;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private bolts!: Bolts;
  private enemies: Enemy[] = [];
  private marker!: Phaser.GameObjects.Ellipse;
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

    if (this.renderer.type === Phaser.WEBGL) {
      (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('HitFX', HitFX);
    }
    Enemy.makeTexture(this);
    this.enemies = CUBES.map(([dx, dy]) => new Enemy(this, this.machi.x + dx, this.machi.y + dy));
    // The physics engine reports a bolt's spot on the ground entering an
    // enemy's; the bolt ends there and the enemy takes the hit.
    this.physics.add.overlap(this.bolts.bodies, this.enemies.map(e => e.zone), (a, b) => {
      // Phaser hands the pair over in either order when a group meets a
      // single object, so tell them apart by what they carry.
      const pair = [a, b] as Phaser.GameObjects.GameObject[];
      const spot = pair.find(o => o.getData('bolt'));
      const enemy = pair.find(o => o.getData('enemy'))?.getData('enemy') as Enemy | undefined;
      const heading = spot && enemy ? this.bolts.strike(spot) : null;
      if (heading && enemy) enemy.hit(heading.dx, heading.dy);
    });
    // P shows the collision boxes.
    this.input.keyboard?.on('keydown-P', () => {
      const world = this.physics.world;
      world.drawDebug = !world.drawDebug;
      if (world.drawDebug && !world.debugGraphic) world.createDebugGraphic();
      world.debugGraphic?.clear();
    });
    // A ring on the pointer, which is exactly where spells pass.
    this.marker = this.add.ellipse(0, 0, 12, 6).setStrokeStyle(1, 0x46e6fa, 0.8).setDepth(1e6);
    this.input.mouse?.disableContextMenu();

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
    this.machi.update(dt, this.readInput());
    // She cannot walk through an enemy: each one she stands in pushes her
    // back out the short way. Done here rather than by the physics engine
    // because her position is set by her own controller, not by a velocity.
    for (const enemy of this.enemies) {
      const clear = pushOut({ x: this.machi.x, y: this.machi.y, ...FEET }, enemy.footprint);
      this.machi.x = clear.x;
      this.machi.y = clear.y;
      enemy.update(dt);
    }
    const cast = this.machi.takeCast();
    if (cast) {
      // The branch reaches well in front of her, so against something she is
      // standing next to the bolt would start already past it. Anything seen
      // between her chest and the branch tip is hit there and then.
      const chestY = this.machi.y - CHEST, tipY = cast.y - cast.height;
      const reach: Footprint = {
        x: (this.machi.x + cast.x) / 2, y: (chestY + tipY) / 2,
        hw: Math.abs(cast.x - this.machi.x) / 2 + 2, hh: Math.abs(tipY - chestY) / 2 + 2,
      };
      const blocker = this.enemies.find(e => overlaps(reach, e.body));
      if (blocker) blocker.hit(cast.dx, cast.dy * ISO_Y);
      else this.bolts.spawn(cast);
    }
    this.bolts.update(dt);
    this.draw();
  }

  // Keyboard input, plus the pointer when steering with it: holding the left
  // button walks toward the pointer and spells fly at it, both at any angle.
  private readInput(): MachiInput {
    const input: MachiInput = this.keys.read();
    this.marker.setVisible(controls.mouse);
    if (!controls.mouse) return input;

    const pointer = this.input.activePointer;
    pointer.updateWorldPoint(this.cameras.main);
    this.marker.setPosition(Math.round(pointer.worldX), Math.round(pointer.worldY));
    // The screen shows the ground foreshortened; undo that to get a true
    // direction on it.
    const toward = (fromX: number, fromY: number, reach: number): Vec | null => {
      const x = pointer.worldX - fromX, y = (pointer.worldY - fromY) / ISO_Y;
      const len = Math.hypot(x, y);
      return len > reach ? { x: x / len, y: y / len } : null;
    };
    input.aim = toward(this.machi.x, this.machi.y - CHEST, 1);
    input.target = { x: pointer.worldX, y: pointer.worldY };
    if (pointer.leftButtonDown()) input.move = toward(this.machi.x, this.machi.y, ARRIVE);
    input.attack ||= pointer.rightButtonDown();
    return input;
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
