import Phaser from 'phaser';
import { TitleEmblem } from '../three/emblem';
import { TitleCabildo } from '../three/title';
import { LookFX } from '../fx/LookFX';
import { fx } from '../fx/settings';
import { musicWaiting, playMusic } from '../music';

const W = 960, H = 405;       // the background, which is the scene's whole world
// The plaza by night, its Cabildo painted out and its sky cleared (tools/erase_cabildo.py): the 3D ones show there.
const BACK = 'titulo/plaza.png';
const CABILDO_3D = 'titulo:cabildo3d', SKY_3D = 'titulo:cielo3d';
const LOGO = 'titulo/logo.png';
const SUN = 'titulo/sol.png';
/** The name and the sun as drawn, in pixels; their solids, raised from those drawings; how many of
 * their 3D pictures' pixels go to each drawn one, and how each turns. */
const LOGO_SIZE = { w: 376, h: 147 }, SUN_SIZE = 94;
const LOGO_3D = { url: 'titulo/3d/logo.glb', res: 2, sway: { turn: 0.3, pace: 0.33, nod: 0.1, nodPace: 0.26 } };
const SUN_3D = { url: 'titulo/3d/sol.glb', res: 3, sway: { turn: 0.45, pace: 0.5, nod: 0.12, nodPace: 0.38 } };
const SUN_AT = { x: W / 2, y: 44 };
const LOGO_AT = { x: W / 2, y: 104, scale: 0.8 };
const FADE = 500;             // milliseconds the screen takes to go dark on starting

// Who crosses the plaza. Each is drawn at two sizes, for the far side of the
// plaza by the arches and for the near side: `w`, `h` are a frame of each.
const CAST = {
  caballero: { far: { w: 9, h: 17 }, near: { w: 17, h: 32 }, speed: 0.55, fps: 8 },
  dama:      { far: { w: 8, h: 16 }, near: { w: 14, h: 30 }, speed: 0.45, fps: 8 },
  carruaje:  { far: { w: 56, h: 21 }, near: { w: 106, h: 40 }, speed: 2.4, fps: 11 },
};
type Role = keyof typeof CAST;
// Where feet and wheels touch the ground on each side of the plaza, and how
// fast a walker covers it there, in pixels per second.
const LANES = { far: { y: 357, pace: 14 }, near: { y: 393, pace: 26 } };
type Lane = keyof typeof LANES;
// The crowd: who, where, which way (1 right, -1 left) and how far along they start.
const CROWD: [Role, Lane, 1 | -1, number][] = [
  ['caballero', 'far', 1, 0.15], ['dama', 'far', -1, 0.55], ['caballero', 'far', -1, 0.85],
  ['carruaje', 'far', -1, 0.4],
  ['dama', 'near', 1, 0.3], ['caballero', 'near', -1, 0.7], ['carruaje', 'near', 1, 0.05],
];
const MARGIN = 90;            // how far off either side they go before coming back

interface Walker { sprite: Phaser.GameObjects.Sprite; dir: 1 | -1; speed: number }

/**
 * The title: the Cabildo on the night of the open council, with the game's
 * name over it under the Sol de Mayo. Any key or click starts the game.
 */
export class TitleScene extends Phaser.Scene {
  private walkers: Walker[] = [];
  private sun!: Phaser.GameObjects.Image;
  private halo!: Phaser.GameObjects.Image;
  private logo!: Phaser.GameObjects.Image;
  /** How much smaller than drawn the name and the sun are shown, on a screen too narrow for them. */
  private narrow = 1;
  private look?: LookFX;
  private leaving = false;
  /** The Cabildo in 3D, and the texture its picture is copied into each frame. */
  private cabildo?: TitleCabildo;
  private cabildoTexture?: Phaser.Textures.CanvasTexture;
  private skyTexture?: Phaser.Textures.CanvasTexture;
  /** The name and the sun in 3D, each with the image it is shown in, once loaded. */
  private emblems: { emblem: TitleEmblem; image: Phaser.GameObjects.Image; key: string; shown: boolean; texture?: Phaser.Textures.CanvasTexture }[] = [];
  /** How much smaller than the drawing the name's and the sun's images are shown: 1, or their 3D pictures' `res`. */
  private logoRes = 1;
  private sunRes = 1;
  /** The music is waiting for the first touch, which is spent on it. */
  private hushed = false;

  constructor() {
    super('title');
  }

  preload(): void {
    this.load.image(BACK, BACK);
    this.load.image(LOGO, LOGO);
    this.load.image(SUN, SUN);
    for (const [role, { far, near }] of Object.entries(CAST)) {
      this.load.spritesheet(`${role}-far`, `titulo/${role}_lejos.png`, { frameWidth: far.w, frameHeight: far.h });
      this.load.spritesheet(`${role}-near`, `titulo/${role}_cerca.png`, { frameWidth: near.w, frameHeight: near.h });
    }
  }

  create(): void {
    // Straight into the game, for working on it without sitting through this.
    if (new URLSearchParams(location.search).has('jugar')) { this.play(); return; }

    this.add.image(0, 0, BACK).setOrigin(0, 0).setDepth(-10);
    // The Cabildo in 3D where the painted one stood, at the painting's size, under whoever crosses the plaza.
    this.cabildo = new TitleCabildo(W, H);
    if (this.textures.exists(CABILDO_3D)) this.textures.remove(CABILDO_3D);
    this.cabildoTexture = this.textures.addCanvas(CABILDO_3D, this.cabildo.canvas) ?? undefined;
    this.add.image(0, 0, CABILDO_3D).setOrigin(0, 0).setDepth(-8);
    // And the sky in 3D behind the painted houses.
    if (this.textures.exists(SKY_3D)) this.textures.remove(SKY_3D);
    this.skyTexture = this.textures.addCanvas(SKY_3D, this.cabildo.skyCanvas) ?? undefined;
    this.add.image(0, 0, SKY_3D).setOrigin(0, 0).setDepth(-11);

    this.halo = this.add.image(SUN_AT.x, SUN_AT.y, this.haloTexture()).setDepth(900)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.sun = this.add.image(SUN_AT.x, SUN_AT.y, SUN).setDepth(901);
    this.logo = this.add.image(LOGO_AT.x, LOGO_AT.y, LOGO).setScale(LOGO_AT.scale).setDepth(902);
    // In 3D as soon as their solids have loaded; drawn till then.
    this.emblems = [
      { emblem: new TitleEmblem(LOGO_3D.url, LOGO_SIZE.w, LOGO_SIZE.h, LOGO_3D.res, LOGO_3D.sway), image: this.logo, key: 'titulo:logo3d', shown: false },
      { emblem: new TitleEmblem(SUN_3D.url, SUN_SIZE, SUN_SIZE, SUN_3D.res, SUN_3D.sway), image: this.sun, key: 'titulo:sol3d', shown: false },
    ];

    for (const [role, lane, dir, along] of CROWD) {
      const { speed, fps } = CAST[role];
      const key = `${role}-${lane}`;
      if (!this.anims.exists(key)) {
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(key), frameRate: fps, repeat: -1 });
      }
      const span = W + 2 * MARGIN;
      const sprite = this.add.sprite(-MARGIN + span * along, LANES[lane].y, key)
        .setOrigin(0.5, 1)
        .setFlipX(dir < 0)   // they are drawn heading right
        .setDepth(LANES[lane].y)
        .play({ key, startFrame: Math.floor(along * 8) });
      this.walkers.push({ sprite, dir, speed: speed * LANES[lane].pace });
    }

    if (this.renderer.type === Phaser.WEBGL) {
      (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines.addPostPipeline('LookFX', LookFX);
      const cam = this.cameras.main;
      cam.setPostPipeline(LookFX);
      const found = cam.getPostPipeline(LookFX);
      this.look = (Array.isArray(found) ? found[0] : found) as LookFX;
    }

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.cameras.main.fadeIn(900, 6, 10, 20);

    document.body.classList.add('title');
    playMusic('intro');
    // Where the browser holds the music back until the page is touched, the first touch or key
    // only lets it play, over the Cabildo; the next goes on.
    this.time.delayedCall(250, () => { this.hushed = musicWaiting(); });
    const onward = () => {
      if (this.hushed) { this.hushed = false; return; }
      this.leave();
    };
    this.input.keyboard?.on('keydown', onward);
    this.input.on('pointerdown', onward);
  }

  update(time: number, delta: number): void {
    const t = time / 1000, dt = Math.min(0.05, delta / 1000);
    this.cabildo?.render(t);
    this.cabildoTexture?.refresh();
    this.skyTexture?.refresh();
    for (const e of this.emblems) {
      e.emblem.render(t);
      if (!e.emblem.loaded) continue;
      if (!e.shown) {
        // The drawing gives way to its solid, at the drawing's size.
        if (this.textures.exists(e.key)) this.textures.remove(e.key);
        e.texture = this.textures.addCanvas(e.key, e.emblem.canvas) ?? undefined;
        e.image.setTexture(e.key);
        if (e.image === this.logo) this.logoRes = e.emblem.res; else this.sunRes = e.emblem.res;
        e.shown = true;
        this.layout();
      }
      e.texture?.refresh();
    }
    for (const { sprite, dir, speed } of this.walkers) {
      sprite.x += dir * speed * dt;
      if (sprite.x > W + MARGIN) sprite.x = -MARGIN;
      else if (sprite.x < -MARGIN) sprite.x = W + MARGIN;
    }
    // The sun breathes.
    const breath = 0.5 + 0.5 * Math.sin(t * 1.1);
    this.sun.setScale(this.narrow * (1 + 0.03 * breath) / this.sunRes);
    this.halo.setAlpha(0.35 + 0.3 * breath).setScale(this.narrow * (1 + 0.12 * breath));

    if (this.look) {
      // It is May: autumn in Buenos Aires.
      this.look.leaves = 1;
      this.look.snow = 0;
      this.look.light = 0;
      this.look.grain = fx.grain ? 1 : 0;
      this.look.crt = fx.crt ? 1 : 0;
      this.look.pixel = this.cameras.main.zoom;
    }
  }

  // The picture is shown at its full height, sky to plaza, and as much of
  // its width as the screen has room for: it is drawn wider than any usual
  // screen, with only houses toward its edges.
  private layout(): void {
    const { width, height } = this.scale;
    const zoom = Math.max(width / W, height / H);
    this.cameras.main.setZoom(zoom).centerOn(W / 2, H / 2);
    // On a screen held upright only the middle of the picture shows: the name is brought in to fit
    // it, and it and the sun come down to where the sky has room for them.
    const room = width / zoom * 0.94;
    this.narrow = Math.min(1, room / (LOGO_SIZE.w * LOGO_AT.scale));
    const down = (1 - this.narrow) * 26;
    this.logo.setScale(LOGO_AT.scale * this.narrow / this.logoRes).setY(LOGO_AT.y + down);
    this.sun.setY(SUN_AT.y + down * 2.2);
    this.halo.setY(SUN_AT.y + down * 2.2);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE, 6, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.play());
  }

  // On to choosing who to play. With ?jugar the choice is skipped too, and Cabral is played: he
  // is the only one in 3D so far.
  private play(): void {
    document.body.classList.remove('title');
    const straight = new URLSearchParams(location.search).get('jugar');
    if (straight === null) { this.scene.start('select'); return; }
    document.body.classList.add('playing');
    this.scene.launch('hud');
    this.scene.start('game', { hero: 'cabral' });
  }

  // A soft gold disc that fades out, for the glow behind the sun.
  private haloTexture(): string {
    const key = 'titulo-halo';
    if (this.textures.exists(key)) return key;
    const size = 180;
    const tex = this.textures.createCanvas(key, size, size)!;
    const g = tex.getContext();
    const fade = g.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    fade.addColorStop(0, 'rgba(255, 196, 90, 0.9)');
    fade.addColorStop(0.4, 'rgba(255, 150, 50, 0.35)');
    fade.addColorStop(1, 'rgba(255, 120, 30, 0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, size, size);
    tex.refresh();
    return key;
  }
}
