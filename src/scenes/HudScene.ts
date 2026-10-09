import Phaser from 'phaser';
import { orbShader } from '../fx/orb';
import type { Ability } from '../machi/abilities';
import type { Arm } from '../machi/controller';
import type { Hero } from '../machi/data';
import type { GameScene } from './GameScene';
import { TIPS, type Tip } from './tips';

const MARGIN = 6;    // screen pixels between the frame and the bottom edge
const TALLEST = 0.3; // share of the screen's height the frame may take
// The glow around a full vessel: its size for a glass of radius `r`, and how its strength breathes.
const HALO = { size: 96, r: 31, low: 0.1, high: 0.26 };
const SETTLE = 6;    // how fast a level slides to its new value, per second
const ICON = 30;     // side of a skill's icon
// The note that comes up over a slot when it is pointed at, in its own
// pixels, each two of the screen's.
const NOTE = { w: 184, pad: 7, gap: 5, ink: '#f0e3c4', dim: '#a89a80', back: 0x16120f, edge: 0x0a0807 };
// Pixel type, each drawn at the one size that lands on its grid. The
// blackletter is drawn at half size inside a note, so one of its pixels is
// one pixel of the screen.
const GOTHIC = { family: "'Jacquard 12', Georgia, serif", size: 21, scale: 0.5 };
const CAPS = { family: "'Silkscreen', ui-monospace, monospace", size: 8 };

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
  /** The colour their greatest power charges in, and its picture once it has one. */
  accent: number;
  ultimate?: string;
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
    accent: 0x46e6fa,
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
    accent: 0xff7a00,
    ultimate: 'hud/iconos/furia.png',
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
  /** How charged their greatest power is: a light that rises in the next slot. */
  charge: Phaser.GameObjects.Rectangle;
  /** Its picture, if it has one, and the shade over the part not yet charged. */
  power?: { icon: Phaser.GameObjects.Image; shade: Phaser.GameObjects.Rectangle };
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
    for (const { frame, skills, ultimate } of Object.values(LAYOUTS)) {
      if (ultimate) this.load.image(ultimate, ultimate);
      this.load.image(frame, frame);
      for (const { icon } of skills) this.load.image(icon, icon);
    }
  }

  /** The note on show, and which slot it is for. */
  private note?: { box: Phaser.GameObjects.Container; hero: Hero; slot: number };

  create(): void {
    this.haloTexture();
    for (const [hero, layout] of Object.entries(LAYOUTS) as [Hero, Layout][]) {
      this.panels[hero] = this.build(layout, hero);
    }
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  // One character's panel. Everything is placed in the frame's own pixels,
  // then scaled as one. The liquids go under the frame, so whatever the
  // frame draws across a glass, like the straps of a cage, stays in front.
  private build(layout: Layout, hero: Hero): Panel {
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
        fontFamily: CAPS.family, fontSize: `${CAPS.size}px`,
        color: '#f0e3c4', stroke: '#14110f', strokeThickness: 3,
      }).setOrigin(1, 1);
      box.add([picture, shade, label]);
      return { ability, icon: picture, shade };
    });
    // Their greatest power, in the slot after their skills. With a picture,
    // a shade lies over the part of it not yet charged and lifts from the
    // bottom up; without one, the slot simply fills with light.
    const cx = layout.slot.x + layout.slot.step * layout.skills.length, cy = layout.slot.y;
    const charge = this.add.rectangle(cx, cy + ICON, ICON, 0, layout.accent, 0.85).setOrigin(0, 1);
    box.add(charge);
    let power: Panel['power'];
    if (layout.ultimate) {
      const icon = this.add.image(cx, cy, layout.ultimate).setOrigin(0, 0);
      const shade = this.add.rectangle(cx, cy, ICON, ICON, 0x0c0a08, 0.78).setOrigin(0, 0);
      box.add([icon, shade]);
      power = { icon, shade };
    }
    const key = this.add.text(cx + ICON - 1, cy + ICON, 'R', {
      fontFamily: CAPS.family, fontSize: `${CAPS.size}px`,
      color: '#f0e3c4', stroke: '#14110f', strokeThickness: 3,
    }).setOrigin(1, 1);
    box.add(key);
    // Pointing at a slot brings up a note on what it does.
    for (let i = 0; i <= layout.skills.length; i++) {
      const zone = this.add.zone(layout.slot.x + layout.slot.step * i, layout.slot.y, ICON, ICON)
        .setOrigin(0, 0).setInteractive();
      zone.on('pointerover', () => this.showNote(hero, i));
      zone.on('pointerout', () => this.hideNote(hero, i));
      box.add(zone);
    }
    return { box, layout, glasses, slots, charge, power };
  }

  update(time: number, delta: number): void {
    const game = this.scene.get('game') as GameScene;
    const dt = Math.min(0.05, delta / 1000);
    for (const [hero, panel] of Object.entries(this.panels) as [Hero, Panel][]) {
      const theirs = hero === game.playing;
      panel.box.setVisible(theirs);
      if (!theirs) { if (this.note?.hero === hero) this.hideNote(); continue; }
      for (const slot of panel.slots) {
        const { ready, cooldown } = game.skill(slot.ability);
        slot.shade.setSize(ICON, Math.round(ICON * cooldown));
        // Off cooldown but unpaid for, or busy: there, but dull.
        slot.icon.setTint(ready || cooldown > 0 ? 0xffffff : 0x5a5a5a);
      }
      // Full, it pulses to say so.
      const charged = Phaser.Math.Clamp(game.ultimate, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(time / 1000 * 6);
      if (panel.power) {
        panel.charge.setSize(ICON, 0);
        panel.power.shade.setSize(ICON, Math.round(ICON * (1 - charged)));
        panel.power.icon.setTint(charged >= 1 ? Phaser.Display.Color.GetColor(255, 215 + 40 * pulse, 170 + 85 * pulse) : 0xb0b0b0);
      } else {
        panel.charge.setSize(ICON, Math.round(ICON * charged)).setAlpha(charged >= 1 ? 0.7 + 0.3 * pulse : 0.55);
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
  // The note: a dark plate with its corners nicked off and a rule in the
  // hero's colour, standing over the slot on a small stem. Drawn in whole
  // pixels and enlarged as one, like the rest of the HUD.
  private showNote(hero: Hero, slot: number): void {
    this.note?.box.destroy();
    const panel = this.panels[hero];
    if (!panel || !panel.box.visible) return;
    const tip: Tip = TIPS[hero][slot];
    const { accent } = panel.layout;
    const unit = 2;
    const inner = NOTE.w - NOTE.pad * 2;
    const text = (words: string, colour: string) => this.add.text(0, 0, words, {
      fontFamily: GOTHIC.family, fontSize: `${GOTHIC.size}px`, color: colour,
      wordWrap: { width: inner / GOTHIC.scale },
    }).setScale(GOTHIC.scale).setResolution(window.devicePixelRatio);
    const name = text(tip.name, `#${accent.toString(16).padStart(6, '0')}`);
    const terms = text(tip.terms, NOTE.dim);
    const says = text(tip.says, NOTE.ink);
    name.setPosition(NOTE.pad, NOTE.pad - 3);
    terms.setPosition(NOTE.pad, Math.ceil(name.y + name.displayHeight) - 2);
    const rule = Math.ceil(terms.y + terms.displayHeight) + 1;
    says.setPosition(NOTE.pad, rule + 2);
    const h = Math.ceil(says.y + says.displayHeight) + NOTE.pad - 3;

    const g = this.add.graphics();
    // Edge, then body, each a cross of two rectangles so the corners are nicked.
    const plate = (inset: number, colour: number) => {
      g.fillStyle(colour, 1);
      g.fillRect(inset + 1, inset, NOTE.w - 2 * inset - 2, h - 2 * inset);
      g.fillRect(inset, inset + 1, NOTE.w - 2 * inset, h - 2 * inset - 2);
    };
    plate(0, NOTE.edge);
    plate(1, accent);
    plate(2, NOTE.back);
    g.fillStyle(accent, 0.55).fillRect(NOTE.pad, rule, inner, 1);
    // The stem down to the slot, narrowing a pixel a row.
    const mid = Math.round(NOTE.w / 2);
    for (let row = 0; row < 4; row++) {
      g.fillStyle(NOTE.edge, 1).fillRect(mid - 4 + row, h - 1 + row, 9 - 2 * row, 1);
      if (row < 3) g.fillStyle(row === 0 ? NOTE.back : accent, 1).fillRect(mid - 3 + row, h - 1 + row, 7 - 2 * row, 1);
    }

    const { slot: at } = panel.layout;
    const overX = panel.box.x + (at.x + at.step * slot + ICON / 2) * panel.box.scaleX;
    const overY = panel.box.y + at.y * panel.box.scaleY;
    const x = Phaser.Math.Clamp(Math.round(overX - mid * unit), 4, this.scale.width - NOTE.w * unit - 4);
    const box = this.add.container(x, Math.round(overY - (h + NOTE.gap + 3) * unit), [g, name, terms, says])
      .setScale(unit).setDepth(10);
    this.note = { box, hero, slot };
  }

  private hideNote(hero?: Hero, slot?: number): void {
    if (!this.note) return;
    if (hero !== undefined && (this.note.hero !== hero || this.note.slot !== slot)) return;
    this.note.box.destroy();
    this.note = undefined;
  }

  private layout(): void {
    this.hideNote();
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
