import Phaser from 'phaser';
import { orbShader } from '../fx/orb';
import type { GameScene } from './GameScene';

const FRAME = 'hud/marco.png';
const FRAME_W = 484, FRAME_H = 161;
const R = 31;        // radius of the glass
const MARGIN = 6;    // screen pixels between the frame and the bottom edge
const TALLEST = 0.3; // share of the screen's height the frame may take
const HALO = { size: 96, low: 0.1, high: 0.26 }; // the glow around a full orb, and how its strength breathes
const SETTLE = 6;    // how fast a level slides to its new value, per second

/** What fills an orb: where it sits in the frame, its colours and what it measures. */
interface Orb {
  key: string;
  x: number;
  y: number;
  /** Deep, body and lit colours of the liquid, and the line along its surface. */
  colours: [string, string, string, string];
  read: (game: GameScene) => number;
}

const ORBS: Orb[] = [
  { key: 'life', x: 75, y: 82, colours: ['#571227', '#8a1730', '#c22f48', '#e0607a'], read: g => g.life },
  { key: 'mana', x: 410, y: 82, colours: ['#1f6fa8', '#27c4d6', '#68fef3', '#c8fffa'], read: g => g.mana },
];

/**
 * Her life and mana, drawn over the game: two glass orbs held by roots, and
 * the bar between them where her abilities will go. It is a scene of its own
 * so the game's camera, zoom and screen effects leave it alone.
 */
export class HudScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Container;
  private orbs: { orb: Orb; draw: (level: number) => void; halo: Phaser.GameObjects.Image; shown: number }[] = [];

  constructor() {
    super({ key: 'hud', active: true });
  }

  preload(): void {
    this.load.image(FRAME, FRAME);
  }

  create(): void {
    this.makeTextures();
    // Everything is placed in the frame's own pixels, then scaled as one.
    this.panel = this.add.container(0, 0);
    const halos: Phaser.GameObjects.Image[] = [];
    for (const orb of ORBS) {
      // Its light spills a little over the roots holding it.
      const halo = this.add.image(orb.x, orb.y, 'orb-halo')
        .setTint(Phaser.Display.Color.HexStringToColor(orb.colours[2]).color)
        .setBlendMode(Phaser.BlendModes.ADD);
      halos.push(halo);
      this.orbs.push({ orb, draw: this.liquid(orb), halo, shown: 1 });
    }
    this.panel.add(this.add.image(0, 0, FRAME).setOrigin(0, 0));
    this.panel.add(halos);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  update(time: number, delta: number): void {
    const game = this.scene.get('game') as GameScene;
    const dt = Math.min(0.05, delta / 1000);
    for (const o of this.orbs) {
      const level = Phaser.Math.Clamp(o.orb.read(game), 0, 1);
      o.shown += (level - o.shown) * Math.min(1, dt * SETTLE);
      o.draw(o.shown);
      // The fuller it is the more it glows, breathing slowly.
      const breath = 0.5 + 0.5 * Math.sin(time / 1000 * 1.7);
      o.halo.setAlpha(o.shown * (HALO.low + (HALO.high - HALO.low) * breath));
    }
  }

  // Adds an orb's glass and liquid to the panel, and returns what sets its
  // level. With WebGL that is one shader; without, still pictures.
  private liquid(orb: Orb): (level: number) => void {
    const size = R * 2 + 1;
    if (this.renderer.type === Phaser.WEBGL) {
      const shader = this.add.shader(orbShader(`orb-${orb.key}`, orb.colours), orb.x, orb.y, size, size);
      this.panel.add(shader);
      return level => shader.setUniform('level.value', level);
    }
    const fill = this.add.image(orb.x, orb.y, `orb-${orb.key}`);
    const line = this.add.rectangle(orb.x, orb.y, 0, 1, Phaser.Display.Color.HexStringToColor(orb.colours[3]).color);
    this.panel.add([this.add.image(orb.x, orb.y, 'orb-empty'), fill, line, this.add.image(orb.x, orb.y, 'orb-shine')]);
    return level => {
      // Rows of the glass left empty above the liquid.
      const top = Math.round((1 - level) * size);
      fill.setCrop(0, top, size, size - top);
      // The surface is as wide as the glass is at that height.
      const dy = top - R;
      const half = Math.sqrt(Math.max(0, R * R - dy * dy));
      line.setPosition(orb.x, orb.y + dy)
        .setSize(Math.round(half) * 2, 1)
        .setOrigin(0.5, 0)
        .setVisible(top > 0 && top < size - 1);
    };
  }

  // Bottom centre, at the largest whole scale that leaves room at the sides
  // and does not climb over the middle of the screen, where she is.
  private layout(): void {
    const { width, height } = this.scale;
    const fits = Math.min(width / (FRAME_W * 1.5), height * TALLEST / FRAME_H);
    const scale = Phaser.Math.Clamp(Math.floor(fits), 1, 3);
    this.panel.setScale(scale).setPosition(
      Math.round((width - FRAME_W * scale) / 2),
      Math.round(height - FRAME_H * scale - MARGIN),
    );
  }

  // The glass and what is in it, drawn pixel by pixel: a dark empty orb, a
  // full one of each liquid (cropped to its level when shown) and the shine.
  private makeTextures(): void {
    const size = R * 2 + 1;
    const disc = (key: string, colour: (x: number, y: number, d: number) => string | null) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, size, size)!;
      const g = tex.getContext();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d = Math.hypot(x - R, y - R);
          const c = d <= R + 0.3 ? colour(x - R, y - R, d) : null;
          if (!c) continue;
          g.fillStyle = c;
          g.fillRect(x, y, 1, 1);
        }
      }
      tex.refresh();
    };

    disc('orb-empty', (_x, _y, d) => (d > R - 2 ? 'rgba(10, 8, 7, 0.92)' : 'rgba(20, 17, 15, 0.82)'));
    // The halo: white, fading out from the glass's edge, tinted when used.
    if (!this.textures.exists('orb-halo')) {
      const tex = this.textures.createCanvas('orb-halo', HALO.size, HALO.size)!;
      const g = tex.getContext(), mid = HALO.size / 2;
      const fade = g.createRadialGradient(mid, mid, R - 6, mid, mid, mid);
      fade.addColorStop(0, 'rgba(255, 255, 255, 0)');
      fade.addColorStop(0.25, 'rgba(255, 255, 255, 1)');
      fade.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = fade;
      g.fillRect(0, 0, HALO.size, HALO.size);
      tex.refresh();
    }
    for (const { key, colours: [deep, body, lit] } of ORBS) {
      // Darker toward the rim and the bottom, with a lit pool off-centre.
      disc(`orb-${key}`, (x, y, d) => {
        if (d > R - 3 || Math.hypot(x, y - 6) > R - 5) return deep;
        return Math.hypot((x + 5) / 1.6, y + 2) < 9 ? lit : body;
      });
    }
    disc('orb-shine', (x, y) => {
      if (Math.hypot((x - 11) / 1.7, y + 15) < 3.6) return 'rgba(255, 255, 255, 0.45)';
      return Math.hypot(x - 17, y + 7) < 1.6 ? 'rgba(255, 255, 255, 0.4)' : null;
    });
  }
}
