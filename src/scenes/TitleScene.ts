import Phaser from 'phaser';
import { LookFX } from '../fx/LookFX';
import { fx } from '../fx/settings';

const W = 960, H = 405;       // the background, which is the scene's whole world
const BACK = 'titulo/cabildo.png';
const LOGO = 'titulo/logo.png';
const SUN = 'titulo/sol.png';
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
  private lamps!: Phaser.GameObjects.Image;
  private sun!: Phaser.GameObjects.Image;
  private halo!: Phaser.GameObjects.Image;
  private look?: LookFX;
  private leaving = false;

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
    this.lamps = this.add.image(0, 0, this.lampsTexture()).setOrigin(0, 0).setDepth(-9)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.halo = this.add.image(SUN_AT.x, SUN_AT.y, this.haloTexture()).setDepth(900)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.sun = this.add.image(SUN_AT.x, SUN_AT.y, SUN).setDepth(901);
    this.add.image(LOGO_AT.x, LOGO_AT.y, LOGO).setScale(LOGO_AT.scale).setDepth(902);

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
    this.input.keyboard?.once('keydown', () => this.leave());
    this.input.once('pointerdown', () => this.leave());
  }

  update(time: number, delta: number): void {
    const t = time / 1000, dt = Math.min(0.05, delta / 1000);
    for (const { sprite, dir, speed } of this.walkers) {
      sprite.x += dir * speed * dt;
      if (sprite.x > W + MARGIN) sprite.x = -MARGIN;
      else if (sprite.x < -MARGIN) sprite.x = W + MARGIN;
    }
    // Torches and lamps never burn evenly: two beats and a little noise.
    this.lamps.setAlpha(0.16 + 0.07 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1) + 0.04 * Math.random());
    // The sun breathes.
    const breath = 0.5 + 0.5 * Math.sin(t * 1.1);
    this.sun.setScale(1 + 0.03 * breath);
    this.halo.setAlpha(0.35 + 0.3 * breath).setScale(1 + 0.12 * breath);

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
    this.cameras.main.setZoom(Math.max(width / W, height / H)).centerOn(W / 2, H / 2);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE, 6, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.play());
  }

  // On to choosing who to play. With ?jugar the choice is skipped too:
  // ?jugar=cabral plays him, anything else plays Inti.
  private play(): void {
    document.body.classList.remove('title');
    const straight = new URLSearchParams(location.search).get('jugar');
    if (straight === null) { this.scene.start('select'); return; }
    document.body.classList.add('playing');
    this.scene.launch('hud');
    this.scene.start('game', { hero: straight === 'cabral' ? 'cabral' : 'inti' });
  }

  // Only the lit parts of the background, to add over it at a strength that
  // wavers: what glows orange in the picture is what flickers.
  private lampsTexture(): string {
    const key = 'titulo-luces';
    if (this.textures.exists(key)) return key;
    const source = this.textures.get(BACK).getSourceImage() as HTMLImageElement;
    const tex = this.textures.createCanvas(key, W, H)!;
    const g = tex.getContext();
    g.drawImage(source, 0, 0);
    const image = g.getImageData(0, 0, W, H);
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const warm = d[i] > 150 && d[i] > d[i + 2] * 2.2 && d[i + 1] > 60;
      if (!warm) d[i + 3] = 0;
    }
    g.putImageData(image, 0, 0);
    tex.refresh();
    return key;
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
