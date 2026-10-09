import Phaser from 'phaser';
import { orbShader } from '../fx/orb';
import type { Ability } from '../machi/abilities';
import type { Arm } from '../machi/controller';
import type { Hero } from '../machi/data';
import type { GameScene } from './GameScene';

const MARGIN = 6;    // screen pixels between the frame and the bottom edge
const TALLEST = 0.3; // share of the screen's height the frame may take
// The glow around a full vessel: its size for a glass of radius `r`, and how its strength breathes.
const HALO = { size: 96, r: 31, low: 0.1, high: 0.26 };
const SETTLE = 6;    // how fast a level slides to its new value, per second
const ICON = 30;     // side of a skill's icon

/** A glass of liquid: where it sits in its frame, its size, its colours and what it measures. */
interface Vessel {
  key: string;
  x: number;
  y: number;
  /** Radius of the round of glass the liquid shows through. */
  r: number;
  /** Deep, body and lit colours of the liquid, and the line along its surface. */
  colours: [string, string, string, string];
  read: (game: GameScene) => number;
}

interface Skill { ability: Ability | Arm; icon: string; key: string }

/** One character's HUD: its frame, what fills it and where its skills go. */
interface Layout {
  frame: string;
  w: number;
  h: number;
  vessels: Vessel[];
  /** Corner of the first skill's icon, and the gap to the next. */
  slot: { x: number; y: number; step: number };
  skills: Skill[];
}

const LIFE = ['#571227', '#8a1730', '#c22f48', '#e0607a'] as Vessel['colours'];

const LAYOUTS: Record<Hero, Layout> = {
  // Inti's: two orbs held by roots, life and mana.
  inti: {
    frame: 'hud/marco.png', w: 484, h: 161,
    vessels: [
      { key: 'life', x: 75, y: 82, r: 31, colours: LIFE, read: g => g.life },
      { key: 'mana', x: 410, y: 82, r: 31, colours: ['#1f6fa8', '#27c4d6', '#68fef3', '#c8fffa'], read: g => g.mana },
    ],
    slot: { x: 146, y: 72, step: 54 },
    skills: [
      { ability: 'strike', icon: 'hud/iconos/rayo.png', key: 'Q' },
      { ability: 'heal', icon: 'hud/iconos/lawen.png', key: 'E' },
    ],
  },
  // Cabral's: a soldier's kit of wood, stone and iron, with flasks in iron
  // cages. His fury takes the place of mana, a loud orange.
  cabral: {
    frame: 'hud/marco_cabral.png', w: 444, h: 140,
    vessels: [
      { key: 'life-flask', x: 48.5, y: 78, r: 36, colours: LIFE, read: g => g.life },
      { key: 'fury', x: 395, y: 78, r: 36, colours: ['#a83400', '#ff7a00', '#ffc21a', '#fff1a8'], read: g => g.rage },
    ],
    slot: { x: 127, y: 58, step: 54.5 },
    skills: [
      { ability: 'musket', icon: 'hud/iconos/mosquete.png', key: 'Q' },
      { ability: 'grenade', icon: 'hud/iconos/granada.png', key: 'E' },
    ],
  },
};

interface Panel {
  box: Phaser.GameObjects.Container;
  layout: Layout;
  glasses: { vessel: Vessel; draw: (level: number) => void; halo: Phaser.GameObjects.Image; shown: number }[];
  slots: { ability: Skill['ability']; icon: Phaser.GameObjects.Image; shade: Phaser.GameObjects.Rectangle }[];
}

/**
 * What the player needs to keep an eye on, drawn over the game: two glasses
 * of liquid for life and for what pays for abilities, and the bar between
 * them where the abilities go. Each character has a frame of their own. It
 * is a scene of its own so the game's camera, zoom and screen effects leave
 * it alone.
 */
export class HudScene extends Phaser.Scene {
  private panels = {} as Record<Hero, Panel>;

  constructor() {
    super('hud');
  }

  preload(): void {
    for (const { frame, skills } of Object.values(LAYOUTS)) {
      this.load.image(frame, frame);
      for (const { icon } of skills) this.load.image(icon, icon);
    }
  }

  create(): void {
    this.haloTexture();
    for (const [hero, layout] of Object.entries(LAYOUTS) as [Hero, Layout][]) {
      this.panels[hero] = this.build(layout);
    }
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  // One character's panel. Everything is placed in the frame's own pixels,
  // then scaled as one. The liquids go under the frame, so whatever the
  // frame draws across a glass, like the straps of a cage, stays in front.
  private build(layout: Layout): Panel {
    const box = this.add.container(0, 0);
    const halos: Phaser.GameObjects.Image[] = [];
    const glasses = layout.vessels.map(vessel => {
      // Its light spills a little over what holds it.
      const halo = this.add.image(vessel.x, vessel.y, 'orb-halo')
        .setScale(vessel.r / HALO.r)
        .setTint(Phaser.Display.Color.HexStringToColor(vessel.colours[2]).color)
        .setBlendMode(Phaser.BlendModes.ADD);
      halos.push(halo);
      return { vessel, draw: this.liquid(box, vessel), halo, shown: NaN };
    });
    box.add(this.add.image(0, 0, layout.frame).setOrigin(0, 0));
    box.add(halos);

    const slots = layout.skills.map(({ ability, icon, key }, i) => {
      const x = layout.slot.x + layout.slot.step * i, y = layout.slot.y;
      const picture = this.add.image(x, y, icon).setOrigin(0, 0);
      // A shade drawn down over the icon, which lifts as the cooldown runs out.
      const shade = this.add.rectangle(x, y, ICON, 0, 0x0c0a08, 0.72).setOrigin(0, 0);
      const label = this.add.text(x + ICON - 1, y + ICON, key, {
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '9px', fontStyle: 'bold',
        color: '#f0e3c4', stroke: '#14110f', strokeThickness: 3,
      }).setOrigin(1, 1);
      box.add([picture, shade, label]);
      return { ability, icon: picture, shade };
    });
    return { box, layout, glasses, slots };
  }

  update(time: number, delta: number): void {
    const game = this.scene.get('game') as GameScene;
    const dt = Math.min(0.05, delta / 1000);
    for (const [hero, panel] of Object.entries(this.panels) as [Hero, Panel][]) {
      const theirs = hero === game.playing;
      panel.box.setVisible(theirs);
      if (!theirs) continue;
      for (const slot of panel.slots) {
        const { ready, cooldown } = game.skill(slot.ability);
        slot.shade.setSize(ICON, Math.round(ICON * cooldown));
        // Off cooldown but unpaid for, or busy: there, but dull.
        slot.icon.setTint(ready || cooldown > 0 ? 0xffffff : 0x5a5a5a);
      }
      for (const glass of panel.glasses) {
        const level = Phaser.Math.Clamp(glass.vessel.read(game), 0, 1);
        // The first time it is seen it is simply at its level; after that it slides.
        if (Number.isNaN(glass.shown)) glass.shown = level;
        glass.shown += (level - glass.shown) * Math.min(1, dt * SETTLE);
        glass.draw(glass.shown);
        // The fuller it is the more it glows, breathing slowly.
        const breath = 0.5 + 0.5 * Math.sin(time / 1000 * 1.7);
        glass.halo.setAlpha(glass.shown * (HALO.low + (HALO.high - HALO.low) * breath));
      }
    }
  }

  // Adds a vessel's glass and liquid to a panel, and returns what sets its
  // level. With WebGL that is the orb shader; without, a plain fill.
  private liquid(box: Phaser.GameObjects.Container, vessel: Vessel): (level: number) => void {
    const { x, y, r } = vessel;
    const size = r * 2 + 1;
    if (this.renderer.type === Phaser.WEBGL) {
      const shader = this.add.shader(orbShader(`orb-${vessel.key}`, vessel.colours), x, y, size, size);
      box.add(shader);
      return level => shader.setUniform('level.value', level);
    }
    const fill = this.add.graphics();
    box.add(fill);
    const colour = Phaser.Display.Color.HexStringToColor(vessel.colours[1]).color;
    return level => {
      // The glass, dark, and the rows of it the liquid reaches, each as wide
      // as the round is at that height.
      fill.clear().fillStyle(0x14110f, 0.85).fillCircle(x, y, r).fillStyle(colour, 1);
      for (let dy = Math.round(r - level * 2 * r); dy <= r; dy++) {
        const half = Math.sqrt(Math.max(0, r * r - dy * dy));
        fill.fillRect(x - half, y + dy, half * 2, 1);
      }
    };
  }

  // Bottom centre, at the largest whole scale that leaves room at the sides
  // and does not climb over the middle of the screen, where the fighting is.
  private layout(): void {
    const { width, height } = this.scale;
    for (const { box, layout: { w, h } } of Object.values(this.panels)) {
      const fits = Math.min(width / (w * 1.5), height * TALLEST / h);
      const scale = Phaser.Math.Clamp(Math.floor(fits), 1, 3);
      box.setScale(scale).setPosition(Math.round((width - w * scale) / 2), Math.round(height - h * scale - MARGIN));
    }
  }

  // The halo: white, fading out from the glass's edge, tinted when used.
  private haloTexture(): void {
    if (this.textures.exists('orb-halo')) return;
    const tex = this.textures.createCanvas('orb-halo', HALO.size, HALO.size)!;
    const g = tex.getContext(), mid = HALO.size / 2;
    const fade = g.createRadialGradient(mid, mid, HALO.r - 6, mid, mid, mid);
    fade.addColorStop(0, 'rgba(255, 255, 255, 0)');
    fade.addColorStop(0.25, 'rgba(255, 255, 255, 1)');
    fade.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = fade;
    g.fillRect(0, 0, HALO.size, HALO.size);
    tex.refresh();
  }
}
