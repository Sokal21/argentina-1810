import Phaser from 'phaser';
import { BALL, Bolts, EMBER } from '../bolts';
import { Chonchon } from '../chonchon/Chonchon';
import { Enemy } from '../enemies';
import { FIRE_TALL, fireShader } from '../fx/fire';
import { HitFX } from '../fx/HitFX';
import { Lightning } from '../fx/lightning';
import { LookFX } from '../fx/LookFX';
import { controls, fx } from '../fx/settings';
import { Keys } from '../input';
import { Abilities, ground, HEAL, MANA, STRIKE, type Ability } from '../machi/abilities';
import { MachiController, type Arm, type MachiInput, type Strike, type Vec } from '../machi/controller';
import { FRAME, ISO_Y, KITS, type Hero } from '../machi/data';
import { BLOW, FURY, Fury, WOUND } from '../machi/fury';
import { Burning } from '../machi/burning';
import { GRENADE } from '../machi/grenade';
import { MUSKET } from '../machi/musket';
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
const RECOVER = 3.4;       // seconds from her death until she is back: the fall, and a while lying there
const FLASH = 0.25;        // seconds her red flash takes to fade
// The flash of a blade: how long it lasts, how far above the ground it is
// drawn, the colour around its white core and how many pieces its curve is made of.
const CUT = { time: 0.2, up: 24, glow: 0xffb45a, steps: 16 };
// A musket ball's blast: how long it lasts and how far above the ground its fire sits.
const BLAST = { time: 0.3, up: 14 };
// Embers shed each second: by something that is burning, and by a patch of burning ground.
const EMBERS = { shed: 26, patch: 34 };
// What his musket and his grenade cost, and how long each takes to be ready again.
const ARMS: Record<Arm, { cost: number; cooldown: number }> = { musket: MUSKET, grenade: GRENADE };

/** A grenade in the air: where from and to, how long it takes and how high it climbs. */
interface Grenade {
  from: Vec;
  to: Vec;
  t: number;
  time: number;
  arc: number;
  ball: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

/** A patch of burning ground, and how long it has burned. */
interface Fire extends Vec {
  t: number;
  shader?: Phaser.GameObjects.Shader;
}

// The echoes she leaves behind while dashing: how often one is dropped, how
// long it lingers, how solid it starts and the colour it is washed with: the pale blue of her
// spells for Inti, the orange of his fury for Cabral.
const ECHO = { every: 0.03, fade: 260, alpha: 0.55, tint: { inti: 0x8fdcf0, cabral: 0xffa64d } };
// Stand-in enemies, as offsets from where she starts.
const CUBES: [number, number][] = [[-150, -40], [160, 70]];
// A sturdy one among them: where it stands and how much it takes.
const STURDY = { at: [60, -120] as [number, number], life: 40 };
// Where the chonchones start, likewise.
const CHONCHONES: [number, number][] = [[110, -70], [-90, 80]];

export class GameScene extends Phaser.Scene {
  private keys!: Keys;
  /** Who is being played. The controller is theirs; much else is still Inti's alone. */
  private hero: Hero = 'inti';
  private machi!: MachiController;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private bolts!: Bolts;
  private embers!: Bolts;
  /** Musket balls in flight. */
  private balls!: Bolts;
  /** Seconds until the musket can be fired again, and whether its key was down last step. */
  private armWait: Record<Arm, number> = { musket: 0, grenade: 0 };
  /** Which of them he has readied, and which the shot now going off is. */
  private readying: Arm | null = null;
  private loosed: Arm = 'musket';
  /** Grenades in the air, and the patches of ground left burning. */
  private grenades: Grenade[] = [];
  private fires: Fire[] = [];
  /** Enemies on fire: how much longer each burns, and when it next hurts. */
  private alight = new Burning<Enemy | Chonchon>();
  /** Embers drifting up from whatever is burning. */
  private embersUp!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** The attack went down this step; it was down last step; it has fired the musket and must be let go before it cuts. */
  private trigger = false;
  private attackWas = false;
  private spentAttack = false;
  /** The spot on screen the shot under way is aimed through. */
  private shotAt: Vec = { x: 0, y: 0 };
  /** Blasts that have just gone off, for the burst drawn at each. */
  private blasts: { x: number; y: number; r: number; t: number }[] = [];
  private vitals = new Vitals(LIFE, GRACE, RECOVER);
  private hurtbox!: Phaser.GameObjects.Zone;
  private flash = 0;
  private hitFx?: HitFX;
  private start = { x: WORLD_W / 2, y: WORLD_H / 2 };
  private echoIn = 0;
  private enemies: Enemy[] = [];
  private chonchones: Chonchon[] = [];
  private abilities = new Abilities();
  /** Cabral's fury. It ebbs whoever is being played, so swapping away does not keep it. */
  private fury = new Fury();
  private lightning!: Lightning;
  /** Where a strike would fall and where ones already cast are about to. */
  private marks!: Phaser.GameObjects.Graphics;
  private motes!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Blows that have just landed, for the flash drawn where each swept. */
  private cuts: (Strike & { t: number })[] = [];
  private slashes!: Phaser.GameObjects.Graphics;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private marker!: Phaser.GameObjects.Ellipse;
  private look?: LookFX;
  private label = '';

  constructor() {
    super('game');
  }

  /** Who is played is chosen before the game starts. */
  init(data: { hero?: Hero }): void {
    this.hero = data.hero ?? 'inti';
  }

  preload(): void {
    // Several animations share a sheet, so textures are keyed by file.
    const sheets = Object.values(KITS).flatMap(kit => Object.values(kit.sheets));
    for (const { src, w } of new Map(sheets.map(s => [s.src, s])).values()) {
      this.load.spritesheet(src, src, { frameWidth: w ?? FRAME, frameHeight: FRAME });
    }
    Chonchon.preload(this);
  }

  create(): void {
    this.drawGround();

    this.machi = this.enter(this.hero, this.start);
    this.keys = new Keys();

    this.shadow = this.add.ellipse(0, 0, 22, 8, 0x000000, 0.28);
    this.sprite = this.add.sprite(0, 0, KITS[this.hero].sheets.idle_front.src, 0);
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
    // One that takes a great deal of killing, to try things out on.
    this.enemies.push(new Enemy(this, this.machi.x + STURDY.at[0], this.machi.y + STURDY.at[1], STURDY.life));
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
    this.balls = new Bolts(this, WORLD_W, WORLD_H, BALL);
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

    this.lightning = new Lightning(this);
    this.marks = this.add.graphics().setDepth(-1000);
    this.slashes = this.add.graphics().setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    // The grenade: a ball of black iron with its fuse alight.
    const bomb = this.textures.createCanvas('grenade', 5, 6)!;
    const iron = bomb.getContext();
    iron.fillStyle = '#18191b';
    iron.fillRect(1, 1, 3, 5);
    iron.fillRect(0, 2, 5, 3);
    iron.fillStyle = '#4a4d52';
    iron.fillRect(1, 2, 1, 1);
    iron.fillStyle = '#ffb030';
    iron.fillRect(2, 0, 1, 1);
    bomb.refresh();
    // Embers: specks of orange that drift up and wink out.
    const speck = this.textures.createCanvas('burning-speck', 2, 2)!;
    speck.getContext().fillStyle = '#ffffff';
    speck.getContext().fillRect(0, 0, 2, 2);
    speck.refresh();
    this.embersUp = this.add.particles(0, 0, 'burning-speck', {
      lifespan: { min: 500, max: 1100 },
      speedX: { min: -10, max: 10 },
      speedY: { min: -42, max: -16 },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: [0xff7a0a, 0xffa01e, 0xffd060],
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    const spark = this.textures.createCanvas('cut-spark', 2, 2)!;
    spark.getContext().fillStyle = '#ffe2b0';
    spark.getContext().fillRect(0, 0, 2, 2);
    spark.refresh();
    this.sparks = this.add.particles(0, 0, 'cut-spark', {
      lifespan: { min: 160, max: 380 },
      speedX: { min: -60, max: 60 },
      speedY: { min: -80, max: 20 },
      gravityY: 240,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);
    // Green motes for her healing: rising while she works, bursting when done.
    const mote = this.textures.createCanvas('lawen-mote', 2, 2)!;
    mote.getContext().fillStyle = '#8df07a';
    mote.getContext().fillRect(0, 0, 2, 2);
    mote.refresh();
    this.motes = this.add.particles(0, 0, 'lawen-mote', {
      lifespan: { min: 500, max: 900 },
      speedX: { min: -12, max: 12 },
      speedY: { min: -45, max: -15 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(1e6).setBlendMode(Phaser.BlendModes.ADD);

    // While developing, Tab swaps who is played, where they stand.
    if (import.meta.env.DEV) this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      if (!this.vitals.standing || this.machi.isDashing) return;
      this.hero = this.hero === 'inti' ? 'cabral' : 'inti';
      this.abilities.reset();
      this.machi = this.enter(this.hero, this.machi);
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
    if (this.vitals.update(dt)) this.rise();
    const standing = this.vitals.standing;
    // Down, she takes no orders.
    const input = standing ? this.readInput() : { dx: 0, dy: 0, attack: false };
    // With the musket up the attack is its trigger, not a cut: it is kept
    // from the sabre until it has been let go again.
    this.trigger = input.attack && !this.attackWas;
    this.attackWas = input.attack;
    if (this.readying) this.spentAttack = true;
    if (!input.attack) this.spentAttack = false;
    if (this.spentAttack) input.attack = false;
    this.machi.update(dt, input);
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
    this.useAbilities(dt, standing);
    this.fury.update(dt);
    const blow = this.machi.takeStrike();
    if (blow) this.land(blow);
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
    this.balls.update(dt);
    // A musket ball bursts on the first thing it is seen to touch, anywhere
    // along the stretch it flew this step.
    this.balls.sweep(4, (x, y) => {
      const struck = [...this.enemies, ...this.chonchones].find(e => e.alive && overlaps({ x, y, hw: MUSKET.girth, hh: MUSKET.girth }, e.body));
      if (struck) this.blast(struck.ground, MUSKET.radius, MUSKET.damage);
      return !!struck;
    });
    this.lightning.update(dt);
    this.updateGrenades(dt);
    this.drawCuts(dt);
    this.flash = Math.max(0, this.flash - dt / FLASH);
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
      .setTint(ECHO.tint[this.hero])
      .setAlpha(ECHO.alpha);
    this.tweens.add({ targets: echo, alpha: 0, duration: ECHO.fade, onComplete: () => echo.destroy() });
  }

  // His musket and his grenade work alike. While its key is held he readies
  // it and turns to the pointer; the attack then lets it fly, if he has the
  // fury for it. Letting the key go first puts it away. It leaves on the
  // frame the shot or the throw is drawn.
  private useArms(dt: number, held: Record<Arm, boolean>): void {
    this.armWait.musket = Math.max(0, this.armWait.musket - dt);
    this.armWait.grenade = Math.max(0, this.armWait.grenade - dt);
    const pointer = this.input.activePointer;
    // He keeps to the one he has readied for as long as its key is down.
    const want: Arm | null = this.readying && held[this.readying] ? this.readying
      : held.musket ? 'musket' : held.grenade ? 'grenade' : null;
    if (want && !this.machi.isDashing) {
      this.machi.shoulder({ x: pointer.worldX, y: pointer.worldY }, want);
      this.shotAt = { x: pointer.worldX, y: pointer.worldY };
      if (this.trigger && this.skill(want).ready && this.fury.spend(ARMS[want].cost)) {
        this.armWait[want] = ARMS[want].cooldown;
        this.loosed = want;
        this.machi.fire();
      }
    } else if (this.readying) {
      this.machi.lower();
    }
    this.readying = want && this.machi.isShouldering ? want : null;
    if (!this.machi.takeShot()) return;
    const { x, y } = this.machi;
    if (this.loosed === 'grenade') {
      this.lob({ x, y }, this.within({ x, y }, this.shotAt, GRENADE.range));
      return;
    }
    // Aimed from where the barrel is seen to be, through the pointer.
    this.balls.spawn({
      x, y, height: MUSKET.height,
      dx: this.shotAt.x - x, dy: (this.shotAt.y - (y - MUSKET.height)) / ISO_Y,
    });
    this.cameras.main.shake(60, 0.004);
  }

  // A spot on the ground, pulled in to a reach around another if it is beyond it.
  private within(from: Vec, spot: Vec, reach: number): Vec {
    const far = ground(from, spot);
    if (far <= reach) return { ...spot };
    return { x: from.x + (spot.x - from.x) * reach / far, y: from.y + (spot.y - from.y) * reach / far };
  }

  // A grenade leaves his hand for a spot on the ground. The further it has
  // to go the longer it is in the air and the higher it climbs.
  private lob(from: Vec, to: Vec): void {
    const share = ground(from, to) / GRENADE.range;
    this.grenades.push({
      from, to, t: 0,
      time: GRENADE.flight[0] + (GRENADE.flight[1] - GRENADE.flight[0]) * share,
      arc: GRENADE.arc * (0.35 + 0.65 * share),
      ball: this.add.image(from.x, from.y - GRENADE.hand, 'grenade'),
      shadow: this.add.ellipse(from.x, from.y, 6, 3, 0x000000, 0.3),
    });
  }

  // Grenades fly their arcs and go off where they land, leaving the ground
  // burning; fires burn down, hurting what stands in them every so often.
  private updateGrenades(dt: number): void {
    for (const g of this.grenades) {
      g.t += dt;
      const p = Math.min(1, g.t / g.time);
      const x = g.from.x + (g.to.x - g.from.x) * p, y = g.from.y + (g.to.y - g.from.y) * p;
      // It leaves at the height of his hand, comes down to the ground, and arcs between.
      const z = GRENADE.hand * (1 - p) + g.arc * Math.sin(Math.PI * p);
      g.ball.setPosition(Math.round(x), Math.round(y - z)).setDepth(y).setRotation(g.t * 9);
      g.shadow.setPosition(Math.round(x), Math.round(y)).setDepth(y - 0.5);
      if (p < 1) continue;
      g.ball.destroy();
      g.shadow.destroy();
      this.blast(g.to, GRENADE.radius, GRENADE.damage, true);
      this.kindle(g.to);
    }
    this.grenades = this.grenades.filter(g => g.t < g.time);

    for (const fire of this.fires) {
      fire.t += dt;
      fire.shader?.setUniform('life.value', Math.max(0, 1 - fire.t / GRENADE.burns));
      if (fire.t >= GRENADE.burns) continue;
      if (Math.random() < dt * EMBERS.patch) {
        // From somewhere on the patch, which is an ellipse on screen.
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * GRENADE.radius;
        this.embersUp.emitParticleAt(fire.x + Math.cos(a) * r, fire.y + Math.sin(a) * r * ISO_Y, 1);
      }
      // Whatever stands in it, or flies over it, catches.
      for (const enemy of [...this.enemies, ...this.chonchones]) {
        if (enemy.alive && ground(fire, enemy.ground) <= GRENADE.radius + enemy.girth) this.alight.ignite(enemy);
      }
    }

    // What has caught fire goes on burning for a while wherever it goes,
    // hurt every so often, smouldering and shedding embers as it does.
    this.alight.update(dt, enemy => enemy.alive, (enemy, glow, hurt) => {
      enemy.burning = glow;
      const { x, y, hw, hh } = enemy.body;
      if (glow > 0 && Math.random() < dt * EMBERS.shed) {
        this.embersUp.emitParticleAt(x + Phaser.Math.FloatBetween(-hw, hw), y + Phaser.Math.FloatBetween(-hh, hh), 1);
      }
      for (let i = 0; i < hurt; i++) enemy.hit(0, -1);
      if (hurt) this.sparks.emitParticleAt(x, y, 4);
    });
    for (const fire of this.fires.filter(f => f.t >= GRENADE.burns)) fire.shader?.destroy();
    this.fires = this.fires.filter(f => f.t < GRENADE.burns);
  }

  // Sets a patch of ground alight. The flames are a shader on a quad whose
  // lower part lies on the patch and whose upper part they rise into.
  private kindle(at: Vec): void {
    const fire: Fire = { ...at, t: 0 };
    if (this.renderer.type === Phaser.WEBGL) {
      // Drawn wider than the patch itself: its ragged edge and its fading out need the room.
      const w = Math.round(GRENADE.radius * 2 * 1.5), h = Math.round(w * FIRE_TALL);
      fire.shader = this.add.shader(fireShader('fire', Math.random() * 100), at.x, at.y - h / 2 + w / 4, w, h)
        // It lies on the ground: under every sprite, whichever side of it they stand.
        .setDepth(-900);
    }
    this.fires.push(fire);
  }

  // Something going off: everything within the blast is hurt, wherever the
  // thing itself struck.
  private blast(at: Vec, radius: number, damage: number, sets = false): void {
    this.blasts.push({ ...at, r: radius, t: 0 });
    this.cameras.main.shake(110, 0.005);
    for (const enemy of [...this.enemies, ...this.chonchones]) {
      const spot = enemy.ground;
      if (!enemy.alive || ground(at, spot) > radius + enemy.girth) continue;
      for (let i = 0; i < damage; i++) enemy.hit(spot.x - at.x || 1, spot.y - at.y);
      if (sets) this.alight.ignite(enemy);
      const { x, y } = enemy.body;
      this.sparks.emitParticleAt(x, y, 10);
    }
  }

  // A blow lands on everything within its reach and inside its cone, measured
  // along the ground: what flies over that ground is caught too.
  private land(blow: Strike): void {
    this.cuts.push({ ...blow, t: 0 });
    let struck = false;
    for (const enemy of [...this.enemies, ...this.chonchones]) {
      if (!enemy.alive) continue;
      const spot = enemy.ground;
      const x = spot.x - blow.x, y = (spot.y - blow.y) / ISO_Y;
      const far = Math.hypot(x, y);
      if (far > blow.reach + enemy.girth) continue;
      // Something he is standing on top of is hit whichever way he swings.
      const off = far < enemy.girth ? 0 : Math.acos((x * blow.dx + y * blow.dy) / far);
      if (off > blow.arc) continue;
      for (let i = 0; i < blow.damage; i++) enemy.hit(x || blow.dx, y * ISO_Y);
      // Sparks fly off what the blade bites, the way it was swung.
      const { x: bx, y: by } = enemy.body;
      for (let i = 0; i < 9; i++) {
        const spark = this.sparks.emitParticleAt(bx + Phaser.Math.Between(-5, 5), by + Phaser.Math.Between(-6, 6), 1);
        if (!spark) continue;
        spark.velocityX += blow.dx * 90;
        spark.velocityY += blow.dy * 45;
      }
      struck = true;
      this.fury.gain(BLOW);
    }
    // A blow that connects is felt.
    if (struck) this.cameras.main.shake(70, 0.003);
  }

  // The cut itself: a crescent of light that whips across in front of him at
  // chest height and is gone. It follows the cone the blow covers without
  // drawing it: thick in the middle, tapering to nothing at both ends, its
  // head racing round and its tail catching up.
  private drawCuts(dt: number): void {
    this.slashes.clear();
    this.cuts = this.cuts.filter(cut => (cut.t += dt) < CUT.time);
    for (const cut of this.cuts) {
      const p = cut.t / CUT.time;
      const head = Math.min(1, p / 0.4), tail = Math.max(0, (p - 0.3) / 0.7);
      const aim = Math.atan2(cut.dy, cut.dx);
      // A crescent between two arcs, the inner one pulled in most at the middle.
      const crescent = (thick: number) => {
        const outer: Phaser.Math.Vector2[] = [], inner: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= CUT.steps; i++) {
          const u = tail + (head - tail) * i / CUT.steps;
          const a = aim - cut.arc + 2 * cut.arc * u;
          const at = (r: number) => new Phaser.Math.Vector2(
            cut.x + Math.cos(a) * r, cut.y - CUT.up + Math.sin(a) * r * ISO_Y);
          outer.push(at(cut.reach));
          inner.push(at(cut.reach * (1 - thick * Math.sin(Math.PI * u))));
        }
        return [...outer, ...inner.reverse()];
      };
      const fade = 1 - p * p;
      this.slashes.fillStyle(CUT.glow, 0.55 * fade).fillPoints(crescent(0.42), true);
      this.slashes.fillStyle(0xffffff, 0.95 * fade).fillPoints(crescent(0.2), true);
    }
    // A blast: a ball of fire that swells and thins out over the ground it covered.
    this.blasts = this.blasts.filter(blast => (blast.t += dt) < BLAST.time);
    for (const { x, y, r: full, t } of this.blasts) {
      const p = t / BLAST.time, fade = 1 - p * p;
      const r = full * (0.35 + 0.65 * Math.sqrt(p));
      this.slashes.fillStyle(0xff7a1a, 0.55 * fade).fillEllipse(x, y - BLAST.up, r * 2, r * 2 * 0.8);
      this.slashes.fillStyle(0xffe9a8, 0.9 * fade * fade).fillEllipse(x, y - BLAST.up, r * 1.1, r * 1.1 * 0.8);
      this.slashes.lineStyle(2, 0xffffff, 0.8 * fade).strokeEllipse(x, y, r * 2, r * 2 * ISO_Y);
    }
  }

  // Puts a character on the field at a spot, with their own art.
  private enter(hero: Hero, at: Vec): MachiController {
    const body = new MachiController({ minX: 12, maxX: WORLD_W - 12, minY: FRAME, maxY: WORLD_H - 6 }, KITS[hero]);
    body.x = at.x;
    body.y = at.y;
    return body;
  }

  // Her abilities: the keys, what they set off, and the marks on the ground.
  private useAbilities(dt: number, standing: boolean): void {
    // The same keys are each character's own abilities. They are read either
    // way, so a press is not kept for later.
    const pressed = this.keys.abilities();
    const keys = this.hero === 'inti' ? pressed : { strike: false, heal: false };
    const pointer = this.input.activePointer;
    pointer.updateWorldPoint(this.cameras.main);
    const his = this.hero === 'cabral' && standing;
    this.useArms(dt, { musket: his && pressed.strike, grenade: his && pressed.second });
    const at = { x: this.machi.x, y: this.machi.y };
    const events = this.abilities.update(dt, {
      ...keys,
      pointer: { x: pointer.worldX, y: pointer.worldY },
      at,
      free: standing && !this.machi.isDashing,
      hurt: this.vitals.life < LIFE,
    });

    if (events.healing) this.machi.channel(HEAL.time);
    if (this.abilities.isHealing && Math.random() < dt * 40) {
      this.motes.emitParticleAt(at.x + Phaser.Math.Between(-10, 10), at.y - Phaser.Math.Between(10, 70), 1);
    }
    if (events.healed) {
      this.vitals.heal(HEAL.amount);
      for (let i = 0; i < 24; i++) {
        this.motes.emitParticleAt(at.x + Phaser.Math.Between(-14, 14), at.y - Phaser.Math.Between(0, 75), 1);
      }
    }

    for (const patch of events.struck) {
      this.lightning.strike(patch.x, patch.y, STRIKE.radius);
      // Whatever stands on the patch, or flies over it, takes the bolt.
      for (const enemy of [...this.enemies, ...this.chonchones]) {
        const spot = enemy.ground;
        if (!enemy.alive || ground(patch, spot) > STRIKE.radius + enemy.girth) continue;
        for (let i = 0; i < STRIKE.damage; i++) enemy.hit(spot.x - patch.x || 1, spot.y - patch.y);
      }
    }

    // Everything is an ellipse: a circle on the ground, seen from above at an angle.
    const ring = (x: number, y: number, r: number) => [x, y, r * 2, r * 2 * ISO_Y] as const;
    this.marks.clear();
    if (this.readying === 'musket') {
      // The line of the shot, from the barrel out as far as a ball carries, and
      // the size of the blast where the pointer is; dull when it cannot be paid for.
      const colour = this.skill('musket').ready ? 0xffb45a : 0x8a8478;
      const from = { x: at.x, y: at.y - MUSKET.height };
      const dx = pointer.worldX - from.x, dy = (pointer.worldY - from.y) / ISO_Y;
      const far = Math.hypot(dx, dy) || 1;
      this.marks.lineStyle(1, colour, 0.5).lineBetween(
        from.x, from.y, from.x + dx / far * BALL.range, from.y + dy / far * BALL.range * ISO_Y);
      this.marks.lineStyle(1, colour, 0.9).strokeEllipse(...ring(pointer.worldX, pointer.worldY, MUSKET.radius));
    }
    if (this.readying === 'grenade') {
      // How far he can throw, and the patch it would land on and set alight.
      const colour = this.skill('grenade').ready ? 0xffb45a : 0x8a8478;
      const to = this.within(at, { x: pointer.worldX, y: pointer.worldY }, GRENADE.range);
      this.marks.lineStyle(1, colour, 0.35).strokeEllipse(...ring(at.x, at.y, GRENADE.range));
      this.marks.fillStyle(colour, 0.14).fillEllipse(...ring(to.x, to.y, GRENADE.radius));
      this.marks.lineStyle(1, colour, 0.9).strokeEllipse(...ring(to.x, to.y, GRENADE.radius));
    }
    const aim = this.abilities.aim;
    if (aim) {
      // Her reach, and the patch the pointer picks inside it; dull when it cannot be cast.
      const colour = this.abilities.ready('strike') ? 0x46e6fa : 0x8a8478;
      this.marks.lineStyle(1, colour, 0.35).strokeEllipse(...ring(at.x, at.y, STRIKE.range));
      this.marks.fillStyle(colour, 0.14).fillEllipse(...ring(aim.x, aim.y, STRIKE.radius));
      this.marks.lineStyle(1, colour, 0.9).strokeEllipse(...ring(aim.x, aim.y, STRIKE.radius));
    }
    for (const patch of this.abilities.pending) {
      // A ring closes in on the patch and it brightens as the bolt nears.
      const p = patch.t / STRIKE.delay;
      this.marks.fillStyle(0x46e6fa, 0.1 + 0.3 * p).fillEllipse(...ring(patch.x, patch.y, STRIKE.radius));
      this.marks.lineStyle(1, 0xbef8fc, 0.9).strokeEllipse(...ring(patch.x, patch.y, STRIKE.radius));
      this.marks.lineStyle(1, 0xffffff, 0.4 + 0.6 * p)
        .strokeEllipse(...ring(patch.x, patch.y, STRIKE.radius * (2.2 - 1.2 * p)));
    }
  }

  // Something reached her. Mid-dash, or while she cannot be hurt again, it
  // does nothing; returns whether it counted.
  private hurt(): boolean {
    if (this.machi.isDashing || !this.vitals.hit()) return false;
    // Being hurt angers him.
    if (this.hero === 'cabral') this.fury.gain(WOUND);
    // A hit breaks the healing ritual.
    if (this.abilities.interrupt()) this.machi.stopChannel();
    this.flash = 1;
    if (!this.vitals.standing) this.fall();
    return true;
  }

  // She is defeated: she falls dead where she stands, everything in the air
  // bursts, and after a while she is back where she started.
  private fall(): void {
    this.machi.fall();
    this.abilities.reset();
    this.fury.reset();
    this.embers.clear();
    this.bolts.clear();
    this.balls.clear();
    this.readying = null;
  }

  private rise(): void {
    this.machi.rise();
    this.machi.x = this.start.x;
    this.machi.y = this.start.y;
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

  /** How much of her life is left, from 0 to 1. */
  get life(): number {
    return this.vitals.life / LIFE;
  }

  /** How much of her mana is left, from 0 to 1. */
  get mana(): number {
    return this.abilities.mana / MANA;
  }

  /** How much fury he has built up, from 0 to 1. */
  get rage(): number {
    return this.fury.value / FURY;
  }

  /** Who is being played, for the HUD to show what is theirs. */
  get playing(): Hero {
    return this.hero;
  }

  /** An ability's state for the HUD: whether it can be used, and how much cooldown is left (1 to 0). */
  skill(ability: Ability | Arm): { ready: boolean; cooldown: number } {
    if (ability === 'musket' || ability === 'grenade') {
      const { cost, cooldown } = ARMS[ability];
      return {
        ready: this.armWait[ability] === 0 && this.fury.value >= cost,
        cooldown: this.armWait[ability] / cooldown,
      };
    }
    return { ready: this.abilities.ready(ability), cooldown: this.abilities.cooldown(ability) };
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
    const sheet = KITS[this.hero].sheets[pose.sheet];
    this.sprite
      .setTexture(sheet.src, pose.frame)
      .setFlipX(pose.flip)
      // The origin is her feet under the body's centre. Flipping mirrors the
      // frame inside its own box, so the centre moves to the other side.
      .setDisplayOrigin(pose.flip ? (sheet.w ?? FRAME) - ax : ax, FRAME - pose.ay)
      .setPosition(x, y)
      .setDepth(y);
    this.label = pose.sheet + (pose.flip ? ' (espejado)' : '');

    const standing = this.vitals.standing;
    // Flickers while she cannot be hurt again, so the grace can be seen.
    const blink = this.vitals.protected && Math.floor(this.time.now / 70) % 2 === 0;
    // Dead, she stays where she fell; the shadow under her feet goes with her standing.
    this.sprite.setAlpha(blink ? 0.45 : 1);
    this.shadow.setVisible(standing);
    if (this.hitFx) this.hitFx.amount = this.flash;
    this.hurtbox.setPosition(x, y - TORSO.up);
    (this.hurtbox.body as Phaser.Physics.Arcade.Body).enable = standing;

    if (this.look) {
      const cam = this.cameras.main;
      this.look.grain = fx.grain ? 1 : 0;
      this.look.light = fx.light ? 1 : 0;
      this.look.crt = fx.crt ? 1 : 0;
      this.look.snow = fx.snow ? 1 : 0;
      this.look.leaves = fx.leaves ? 1 : 0;
      this.look.scrollX = cam.worldView.x;
      this.look.scrollY = cam.worldView.y;
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
