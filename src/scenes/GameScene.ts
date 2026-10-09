import Phaser from 'phaser';
import { Bolts, EMBER } from '../bolts';
import { Chonchon } from '../chonchon/Chonchon';
import { Enemy } from '../enemies';
import { HitFX } from '../fx/HitFX';
import { LookFX } from '../fx/LookFX';
import { controls, fx } from '../fx/settings';
import { Keys } from '../input';
import { MachiController, type MachiInput, type Vec } from '../machi/controller';
import { FRAME, ISO_Y, SHEETS } from '../machi/data';
import { overlaps, pushOut, type Footprint } from '../world/footprint';
import { Vitals } from '../world/vitals';

const ZOOM = 2;            // screen pixels per sprite pixel
const WORLD_W = 1280;      // world size, in sprite pixels
const WORLD_H = 800;
const TILE_W = 32, TILE_H = 16; // ground diamond, in sprite pixels
const CHEST = 45;          // height of her chest above her feet, where the light sits
const ARRIVE = 5;          // she stops this close to the pointer instead of jittering on it
const FEET: Pick<Footprint, 'hw' | 'hh'> = { hw: 7, hh: 3.5 }; // the ground she stands on
// The part of her an ember has to be seen to touch: her torso and head, a
// little narrower than drawn so a near miss is a miss.
const TORSO = { up: 40, w: 14, h: 52 };
const LIFE = 5;            // embers she can take
const GRACE = 0.7;         // seconds she cannot be hurt again after a hit
const RECOVER = 1.6;       // seconds she is down before getting back up
const FLASH = 0.25;        // seconds her red flash takes to fade
const BAR = { w: 24, up: 90 }; // her life bar, and how far above her feet it sits
// The echoes she leaves behind while dashing: how often one is dropped, how
// long it lingers, how solid it starts and the colour it is washed with.
const ECHO = { every: 0.03, fade: 260, alpha: 0.55, tint: 0x8fdcf0 };
// Stand-in enemies, as offsets from where she starts.
const CUBES: [number, number][] = [[-150, -40], [160, 70]];
// Where the chonchones start, likewise.
const CHONCHONES: [number, number][] = [[110, -70], [-90, 80]];

export class GameScene extends Phaser.Scene {
  private keys!: Keys;
  private machi!: MachiController;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private bolts!: Bolts;
  private embers!: Bolts;
  private vitals = new Vitals(LIFE, GRACE, RECOVER);
  private hurtbox!: Phaser.GameObjects.Zone;
  private lifeBack!: Phaser.GameObjects.Rectangle;
  private lifeBar!: Phaser.GameObjects.Rectangle;
  private shownLife = LIFE;
  private flash = 0;
  private hitFx?: HitFX;
  private start = { x: WORLD_W / 2, y: WORLD_H / 2 };
  private echoIn = 0;
  private enemies: Enemy[] = [];
  private chonchones: Chonchon[] = [];
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
    Chonchon.preload(this);
  }

  create(): void {
    this.drawGround();

    this.machi = new MachiController({ minX: 12, maxX: WORLD_W - 12, minY: FRAME, maxY: WORLD_H - 6 });
    this.machi.x = this.start.x;
    this.machi.y = this.start.y;
    this.keys = new Keys();

    this.shadow = this.add.ellipse(0, 0, 22, 8, 0x000000, 0.28);
    this.sprite = this.add.sprite(0, 0, SHEETS.idle_front.src, 0);
    this.bolts = new Bolts(this, WORLD_W, WORLD_H);

    if (this.renderer.type === Phaser.WEBGL) {
      (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('HitFX', HitFX);
    }
    this.sprite.setPostPipeline(HitFX);
    if (this.renderer.type === Phaser.WEBGL) {
      const found = this.sprite.getPostPipeline(HitFX);
      this.hitFx = (Array.isArray(found) ? found[0] : found) as HitFX;
    }
    Enemy.setup(this);
    this.enemies = CUBES.map(([dx, dy]) => new Enemy(this, this.machi.x + dx, this.machi.y + dy));
    // The physics engine reports a bolt's spot on the ground entering an
    // enemy's; the bolt ends there and the enemy takes the hit.
    const bounds = { minX: 0, maxX: WORLD_W, minY: 0, maxY: WORLD_H };
    this.chonchones = CHONCHONES.map(([dx, dy]) => new Chonchon(this, this.machi.x + dx, this.machi.y + dy, bounds));
    const zones = [...this.enemies, ...this.chonchones].map(e => e.zone);
    this.physics.add.overlap(this.bolts.bodies, zones, (a, b) => {
      // Phaser hands the pair over in either order when a group meets a
      // single object, so tell them apart by what they carry.
      const pair = [a, b] as Phaser.GameObjects.GameObject[];
      const spot = pair.find(o => o.getData('bolt'));
      const enemy = pair.find(o => o.getData('enemy'))?.getData('enemy') as Enemy | Chonchon | undefined;
      const heading = spot && enemy ? this.bolts.strike(spot) : null;
      if (heading && enemy) enemy.hit(heading.dx, heading.dy);
    });
    // What the enemies throw, and the part of her it can hit.
    this.embers = new Bolts(this, WORLD_W, WORLD_H, EMBER);
    this.hurtbox = this.add.zone(this.machi.x, this.machi.y - TORSO.up, TORSO.w, TORSO.h);
    this.physics.add.existing(this.hurtbox);
    this.hurtbox.setData('machi', true);
    this.physics.add.overlap(this.embers.bodies, this.hurtbox, (a, b) => {
      const spot = ([a, b] as Phaser.GameObjects.GameObject[]).find(o => o.getData('bolt'));
      // An ember that does not hurt her flies on.
      if (spot && this.hurt()) this.embers.strike(spot);
    });
    this.lifeBack = this.add.rectangle(0, 0, BAR.w + 2, 4, 0x14110f, 0.85).setDepth(1e6);
    this.lifeBar = this.add.rectangle(0, 0, BAR.w, 2, 0x8fd16a).setOrigin(0, 0.5).setDepth(1e6);

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
    if (this.vitals.update(dt)) this.rise();
    const standing = this.vitals.standing;
    // Down, she takes no orders.
    this.machi.update(dt, standing ? this.readInput() : { dx: 0, dy: 0, attack: false });
    // Enemies throw at her chest while she is up.
    // She cannot walk through an enemy: each one she stands in pushes her
    // back out the short way. Done here rather than by the physics engine
    // because her position is set by her own controller, not by a velocity.
    const target = standing ? { x: this.machi.x, y: this.machi.y - TORSO.up } : null;
    for (const enemy of this.enemies) {
      const ember = enemy.update(dt, target);
      if (ember) this.embers.spawn(ember);
      if (!enemy.alive) continue;
      const clear = pushOut({ x: this.machi.x, y: this.machi.y, ...FEET }, enemy.footprint);
      this.machi.x = clear.x;
      this.machi.y = clear.y;
    }
    // Chonchones go for where she stands; their teeth miss her mid-dash.
    const feet = standing ? { x: this.machi.x, y: this.machi.y } : null;
    for (const chonchon of this.chonchones) {
      if (chonchon.update(dt, feet)) this.hurt();
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
      const blocker = [...this.enemies, ...this.chonchones].find(e => e.alive && overlaps(reach, e.body));
      if (blocker) blocker.hit(cast.dx, cast.dy * ISO_Y);
      else this.bolts.spawn(cast);
    }
    this.bolts.update(dt);
    this.embers.update(dt);
    this.flash = Math.max(0, this.flash - dt / FLASH);
    this.shownLife += (this.vitals.life - this.shownLife) * Math.min(1, dt * 14);
    this.draw();
    this.trail(dt);
  }

  // While she dashes she leaves copies of herself where she just was, each
  // frozen in the pose she had there and fading out: the eye reads the row of
  // them as speed.
  private trail(dt: number): void {
    if (!this.machi.isDashing) { this.echoIn = 0; return; }
    this.echoIn -= dt;
    if (this.echoIn > 0) return;
    this.echoIn = ECHO.every;
    const s = this.sprite;
    const echo = this.add.image(s.x, s.y, s.texture.key, s.frame.name)
      .setFlipX(s.flipX)
      .setDisplayOrigin(s.displayOriginX, s.displayOriginY)
      .setDepth(s.depth - 0.1)   // just behind her
      .setTint(ECHO.tint)
      .setAlpha(ECHO.alpha);
    this.tweens.add({ targets: echo, alpha: 0, duration: ECHO.fade, onComplete: () => echo.destroy() });
  }

  // Something reached her. Mid-dash, or while she cannot be hurt again, it
  // does nothing; returns whether it counted.
  private hurt(): boolean {
    if (this.machi.isDashing || !this.vitals.hit()) return false;
    this.flash = 1;
    if (!this.vitals.standing) this.fall();
    return true;
  }

  // Placeholder for being defeated: she vanishes, everything in the air
  // bursts, and after a moment she is back where she started.
  private fall(): void {
    this.embers.clear();
    this.bolts.clear();
  }

  private rise(): void {
    this.machi.x = this.start.x;
    this.machi.y = this.start.y;
    this.shownLife = this.vitals.life;
    this.flash = 0;
  }

  // Keyboard input, plus the pointer when steering with it: the left button
  // casts at the pointer and the right one walks toward it, both at any angle.
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
    input.attack ||= pointer.leftButtonDown();
    if (pointer.rightButtonDown()) input.move = toward(this.machi.x, this.machi.y, ARRIVE);
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

    const standing = this.vitals.standing;
    // Flickers while she cannot be hurt again, so the grace can be seen.
    const blink = this.vitals.protected && Math.floor(this.time.now / 70) % 2 === 0;
    this.sprite.setVisible(standing).setAlpha(blink ? 0.45 : 1);
    this.shadow.setVisible(standing);
    if (this.hitFx) this.hitFx.amount = this.flash;
    this.hurtbox.setPosition(x, y - TORSO.up);
    (this.hurtbox.body as Phaser.Physics.Arcade.Body).enable = standing;
    this.lifeBack.setPosition(x, y - BAR.up).setVisible(standing);
    this.lifeBar.setPosition(x - BAR.w / 2, y - BAR.up).setVisible(standing)
      .setSize(Math.max(0, BAR.w * this.shownLife / LIFE), 2);

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
