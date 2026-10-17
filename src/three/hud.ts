import Phaser from 'phaser';
import type { Ability } from '../machi/abilities';
import type { Arm } from '../machi/controller';
import type { Hero } from '../machi/data';
import { HudScene } from '../scenes/HudScene';

// The 2D game's HUD, as it is, on a clear canvas over the 3D world. It reads what it shows from
// the scene called 'game'; here that is a stand-in, told each frame what the 3D game knows.

/** What the HUD reads, and the 3D game keeps up to date. */
export interface Readings {
  playing: Hero;
  life: number;
  mana: number;
  rage: number;
  ultimate: number;
  breath: { share: number; winded: boolean };
  draughts: { left: number; ready: boolean };
  growth: { share: number; level: number; points: number };
  pack: { gold: number };
  skill(ability: Ability | Arm): { ready: boolean; cooldown: number };
}

class Reading extends Phaser.Scene {
  constructor(readings: Readings) {
    super('game');
    // Whatever the HUD asks of the game it is asked of what the 3D game keeps.
    for (const key of Object.keys(readings) as (keyof Readings)[]) {
      Object.defineProperty(this, key, { get: () => (typeof readings[key] === 'function' ? (readings[key] as () => unknown).bind(readings) : readings[key]) });
    }
  }

  create(): void {
    this.scene.launch('hud');
  }
}

// As the 2D game sizes itself: drawn as if the screen's short side were at least this many pixels.
const SHORT = 560;

export function mountHud(parent: HTMLElement, readings: Readings): Phaser.Game {
  const shown = () => Math.min(1, Math.min(innerWidth, innerHeight) / SHORT);
  const sized = (k: number) => [Math.ceil(innerWidth / k), Math.ceil(innerHeight / k)] as const;
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    transparent: true,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, width: sized(shown())[0], height: sized(shown())[1], zoom: shown() },
    scene: [new Reading(readings), HudScene],
  });
  addEventListener('resize', () => {
    const k = shown(), [width, height] = sized(k);
    if (game.scale.zoom !== k) game.scale.setZoom(k);
    game.scale.resize(width, height);
  });
  return game;
}
