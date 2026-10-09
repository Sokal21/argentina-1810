import Phaser from 'phaser';
import type { Hero } from '../machi/data';

// The screen is laid out on a canvas of this size, shown as large as fits.
const W = 460, H = 410;
const CARD_Y = 196;     // centre of the cards
const APART = 104;      // each card's centre, from the middle of the screen
const FADE = 350;       // milliseconds to fade in and out
const DIM = 0x4a4654;   // tint of the card that is not chosen
const SMALL = 0.93;     // and its size beside the chosen one
const TURN = 0.16;       // seconds a card takes to come forward or fall back
const FPS = 8;            // of a card's animation, which only the chosen one plays
const ICON = 0.6;       // ability icons are drawn for the HUD, larger than wanted here

interface Card {
  hero: Hero;
  name: string;
  calling: string;
  accent: number;
  icons: string[];
  /** Size of one frame of its animated picture. */
  w: number;
  h: number;
}

const CARDS: Card[] = [
  { hero: 'inti', name: 'INTI', calling: 'Machi · maná', accent: 0x46e6fa, w: 183, h: 320,
    icons: ['hud/iconos/rayo.png', 'hud/iconos/lawen.png'] },
  { hero: 'cabral', name: 'CABRAL', calling: 'Granadero · furia', accent: 0xff7a00, w: 178, h: 314,
    icons: ['hud/iconos/mosquete.png', 'hud/iconos/granada.png'] },
];

// The river at nightfall behind it all, and the stretch of shore with the
// camp, which is animated and laid back over the same spot.
const BACK = { src: 'seleccion/fondo.png', w: 480, h: 270 };
const CAMP = { src: 'seleccion/campamento.png', x: 176, y: 58, w: 300, h: 150, fps: 8 };

const SERIF = "Georgia, 'Times New Roman', serif";
const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`;

interface Shown {
  card: Card;
  picture: Phaser.GameObjects.Sprite;
  border: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  calling: Phaser.GameObjects.Text;
  icons: Phaser.GameObjects.Image[];
  /** How far forward it is: 1 chosen, 0 in shadow. */
  lit: number;
}

/** Who to play: one card each, side by side; the chosen one lit, the other in shadow. */
export class SelectScene extends Phaser.Scene {
  private shown: Shown[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private back!: Phaser.GameObjects.Container;
  private chosen = 0;
  private leaving = false;

  constructor() {
    super('select');
  }

  preload(): void {
    this.load.image(BACK.src, BACK.src);
    this.load.spritesheet(CAMP.src, CAMP.src, { frameWidth: CAMP.w, frameHeight: CAMP.h });
    for (const { hero, icons, w, h } of CARDS) {
      this.load.spritesheet(`select-${hero}`, `seleccion/${hero}.png`, { frameWidth: w, frameHeight: h });
      for (const icon of icons) this.load.image(icon, icon);
    }
  }

  create(): void {
    this.shown = [];
    this.texts = [];
    this.leaving = false;
    this.cameras.main.setBackgroundColor(0x0d0b12);

    // Laid out about its own centre, so it can be sized to cover the screen.
    if (!this.anims.exists(CAMP.src)) {
      this.anims.create({ key: CAMP.src, frames: this.anims.generateFrameNumbers(CAMP.src), frameRate: CAMP.fps, repeat: -1 });
    }
    this.back = this.add.container(W / 2, H / 2, [
      this.add.image(0, 0, BACK.src),
      this.add.sprite(CAMP.x - BACK.w / 2, CAMP.y - BACK.h / 2, CAMP.src).setOrigin(0).play(CAMP.src),
    ]);

    this.texts.push(this.add.text(W / 2, 16, 'ELEGÍ TU DESTINO', {
      fontFamily: SERIF, fontSize: '15px', color: '#e2c478', stroke: '#0d0b12', strokeThickness: 3,
    }).setOrigin(0.5).setLetterSpacing(4));
    this.texts.push(this.add.text(W / 2, H - 10, '◄ ►  elegir     ·     ENTER o clic  jugar', {
      fontFamily: SERIF, fontSize: '9px', color: '#b8ad98', stroke: '#0d0b12', strokeThickness: 2,
    }).setOrigin(0.5).setLetterSpacing(1));

    CARDS.forEach((card, i) => {
      const x = W / 2 + (i === 0 ? -APART : APART);
      const key = `select-${card.hero}`;
      if (!this.anims.exists(key)) {
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(key), frameRate: FPS, repeat: -1 });
      }
      const picture = this.add.sprite(x, CARD_Y, key, 0).setInteractive({ useHandCursor: true });
      const border = this.add.rectangle(x, CARD_Y, picture.width + 4, picture.height + 4)
        .setStrokeStyle(2, card.accent).setFillStyle();
      const below = CARD_Y + picture.height / 2;
      const left = x - picture.width / 2;
      const name = this.add.text(left + 2, below + 14, card.name, {
        fontFamily: SERIF, fontSize: '16px', color: '#f0e3c4', stroke: '#0d0b12', strokeThickness: 3,
      }).setOrigin(0, 0.5).setLetterSpacing(3);
      const calling = this.add.text(left + 2, below + 29, card.calling, {
        fontFamily: SERIF, fontSize: '9px', color: hex(card.accent), stroke: '#0d0b12', strokeThickness: 2,
      }).setOrigin(0, 0.5).setLetterSpacing(1);
      const icons = card.icons.map((icon, n) =>
        this.add.image(x + picture.width / 2 - 10 - (card.icons.length - 1 - n) * 21, below + 20, icon).setScale(ICON));
      this.texts.push(name, calling);
      this.shown.push({ card, picture, border, name, calling, icons, lit: i === this.chosen ? 1 : 0 });

      // Pointing at a card chooses it; clicking it plays it.
      picture.on('pointerover', () => this.choose(i));
      picture.on('pointerdown', () => { this.choose(i); this.leave(); });
    });

    const keys = this.input.keyboard;
    keys?.on('keydown-LEFT', () => this.choose(0));
    keys?.on('keydown-A', () => this.choose(0));
    keys?.on('keydown-RIGHT', () => this.choose(1));
    keys?.on('keydown-D', () => this.choose(1));
    keys?.on('keydown-ENTER', () => this.leave());
    keys?.on('keydown-SPACE', () => this.leave());

    for (const shown of this.shown) this.show(shown);
    this.choose(this.chosen);
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.cameras.main.fadeIn(FADE, 6, 10, 20);
  }

  // The chosen card comes to life; the other stops where it began.
  private choose(index: number): void {
    if (this.leaving) return;
    this.chosen = index;
    this.shown.forEach(({ picture }, i) => {
      if (i !== index) picture.stop().setFrame(0);
      else if (!picture.anims.isPlaying) picture.play(picture.texture.key);
    });
  }

  // The chosen card comes forward and the other falls back, a little at a
  // time: quick at first, settling at the end.
  update(_time: number, delta: number): void {
    const step = Math.min(0.05, delta / 1000) / TURN;
    this.shown.forEach((shown, i) => {
      const to = i === this.chosen ? 1 : 0;
      if (shown.lit === to) return;
      shown.lit = to > shown.lit ? Math.min(1, shown.lit + step) : Math.max(0, shown.lit - step);
      this.show(shown);
    });
  }

  private show({ picture, border, name, calling, icons, lit }: Shown): void {
    const p = lit * lit * (3 - 2 * lit);
    const size = SMALL + (1 - SMALL) * p;
    picture.setScale(size);
    border.setScale(size).setAlpha(p);
    // From shadow to its own colours, each channel on its own.
    const shade = (shift: number) => {
      const dim = (DIM >> shift) & 0xff;
      return Math.round(dim + (255 - dim) * p) << shift;
    };
    picture.setTint(shade(16) | shade(8) | shade(0));
    name.setAlpha(0.35 + 0.65 * p);
    calling.setAlpha(0.3 + 0.7 * p);
    for (const icon of icons) icon.setAlpha(0.3 + 0.7 * p);
  }

  // Shown as large as fits, in whole pixels where there is room, so the
  // cards stay crisp; the lettering is drawn at the size it is seen at.
  private layout(): void {
    const { width, height } = this.scale;
    const fit = Math.min(width / W, height / H);
    const zoom = fit >= 1 ? Math.floor(fit * 2) / 2 : fit;
    this.cameras.main.setZoom(zoom).centerOn(W / 2, H / 2);
    // The river covers the whole screen, whatever its shape, at a whole
    // number of screen pixels to each of its own.
    this.back.setScale(Math.ceil(Math.max(width / BACK.w, height / BACK.h)) / zoom);
    for (const text of this.texts) text.setResolution(Math.max(1, zoom) * window.devicePixelRatio);
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(FADE, 6, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      document.body.classList.add('playing');
      this.scene.launch('hud');
      this.scene.start('game', { hero: CARDS[this.chosen].hero });
    });
  }
}
