import { mountShop } from './shop';
import { mountSheet } from './sheet';
import Phaser from 'phaser';
import { controls, EFFECTS, fx, setEffect, setMouseControl, type Effect } from './fx/settings';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { SelectScene } from './scenes/SelectScene';
import { TitleScene } from './scenes/TitleScene';
import { key, mountTouch, touch } from './touch';

// The pixel type is fetched now, so it is there by the time anything is written in it.
void document.fonts.load("8px 'Silkscreen'");
void document.fonts.load("21px 'Jacquard 12'");

// The game is drawn two screen pixels to each of its own, which on a phone leaves room for very
// little of it. Where the screen is small it is drawn as if it were larger and shown smaller: its
// short side is never fewer than this many pixels.
const SHORT = 560;
const shown = () => Math.min(1, Math.min(innerWidth, innerHeight) / SHORT);
const sized = (k: number) => [Math.ceil(innerWidth / k), Math.ceil(innerHeight / k)] as const;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14110f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, width: sized(shown())[0], height: sized(shown())[1], zoom: shown() },
  input: { activePointers: 4 },
  physics: { default: 'arcade' },
  // Only the first starts by itself; it starts the others.
  scene: [TitleScene, SelectScene, GameScene, HudScene],
});

// Handy from the browser console while developing.
if (import.meta.env.DEV) {
  (globalThis as { game?: Phaser.Game }).game = game;
  // The panel and its sliders exist only here; the published build drops them.
  void import('./devPanel').then(({ mountDevPanel }) => mountDevPanel(game));
}

// It fills the window, whatever becomes of it: turned on its side, or the browser's bars coming and going.
const fit = () => {
  const k = shown(), [width, height] = sized(k);
  if (game.scale.zoom !== k) game.scale.setZoom(k);
  if (game.scale.width !== width || game.scale.height !== height) game.scale.resize(width, height);
};
addEventListener('resize', fit);
visualViewport?.addEventListener('resize', fit);

mountTouch(game);
mountSheet(game);
mountShop(game);

// The effects, in the menu that pausing opens, and their number keys; 0 turns everything off.
const bar = document.getElementById('fx')!;
const buttons = new Map<Effect, HTMLButtonElement>();
const mouseButton = document.createElement('button');
const refresh = () => {
  buttons.forEach((b, name) => b.classList.toggle('on', fx[name]));
  mouseButton.classList.toggle('on', controls.mouse);
};

EFFECTS.forEach(([name, label], i) => {
  const b = document.createElement('button');
  b.innerHTML = `<b>${i + 1}</b>${label}`;
  // Keep keyboard focus on the page so WASD and the number keys keep working.
  b.addEventListener('mousedown', e => e.preventDefault());
  b.addEventListener('click', () => { setEffect(name, !fx[name]); refresh(); });
  bar.appendChild(b);
  buttons.set(name, b);
});
mouseButton.className = 'mouse';
mouseButton.innerHTML = '<b>M</b>Apuntar con el mouse';
mouseButton.addEventListener('mousedown', e => e.preventDefault());
mouseButton.addEventListener('click', () => { setMouseControl(!controls.mouse); refresh(); });
bar.appendChild(mouseButton);
refresh();

// Escape stops the game where it is, and starts it again.
const pause = document.getElementById('pause')!;
let paused = false;
// Without keys: the menu is left by its own button.
document.getElementById('resume')!.addEventListener('click', () => key('Escape'));
const togglePause = () => {
  // There is nothing to stop until the game itself is on.
  if (!paused && !game.scene.isActive('game')) return;
  paused = !paused;
  // What it says of the controls is what there is to hand: keys, or the buttons on the screen.
  document.getElementById('keys')!.hidden = touch.on;
  document.getElementById('taps')!.hidden = !touch.on;
  if (paused) game.scene.pause('game');
  else game.scene.resume('game');
  pause.hidden = !paused;
};

addEventListener('keydown', e => {
  // Typing to someone is not pressing the game's keys.
  if (e.repeat || (e.target as { tagName?: string } | null)?.tagName === 'INPUT') return;
  if (e.code === 'Escape') { togglePause(); return; }
  if (e.code === 'KeyM') { setMouseControl(!controls.mouse); refresh(); return; }
  const digit = /^Digit(\d)$/.exec(e.code);
  if (!digit) return;
  const n = Number(digit[1]);
  if (n === 0) EFFECTS.forEach(([name]) => setEffect(name, false));
  else if (EFFECTS[n - 1]) setEffect(EFFECTS[n - 1][0], !fx[EFFECTS[n - 1][0]]);
  refresh();
});

// While developing: which animation is on screen.
const state = document.getElementById('state')!;
if (import.meta.env.DEV) {
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const scene = game.scene.getScene('game') as GameScene | null;
    if (scene?.state) state.textContent = scene.state;
  });
} else state.remove();
