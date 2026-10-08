import Phaser from 'phaser';
import { EFFECTS, fx, setEffect, type Effect } from './fx/settings';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14110f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [GameScene],
});

// Handy from the browser console while developing.
if (import.meta.env.DEV) (globalThis as { game?: Phaser.Game }).game = game;

// Effect buttons and their number keys; 0 turns everything off.
const bar = document.getElementById('fx')!;
const buttons = new Map<Effect, HTMLButtonElement>();
const refresh = () => buttons.forEach((b, name) => b.classList.toggle('on', fx[name]));

EFFECTS.forEach(([name, label], i) => {
  const b = document.createElement('button');
  b.innerHTML = `<b>${i + 1}</b>${label}`;
  // Keep keyboard focus on the page so WASD and the number keys keep working.
  b.addEventListener('mousedown', e => e.preventDefault());
  b.addEventListener('click', () => { setEffect(name, !fx[name]); refresh(); });
  bar.appendChild(b);
  buttons.set(name, b);
});
refresh();

addEventListener('keydown', e => {
  if (e.repeat) return;
  const digit = /^Digit(\d)$/.exec(e.code);
  if (!digit) return;
  const n = Number(digit[1]);
  if (n === 0) EFFECTS.forEach(([name]) => setEffect(name, false));
  else if (EFFECTS[n - 1]) setEffect(EFFECTS[n - 1][0], !fx[EFFECTS[n - 1][0]]);
  refresh();
});

// Debug readout: which animation is on screen.
const state = document.getElementById('state')!;
game.events.on(Phaser.Core.Events.POST_STEP, () => {
  const scene = game.scene.getScene('game') as GameScene | null;
  if (scene?.state) state.textContent = scene.state;
});
