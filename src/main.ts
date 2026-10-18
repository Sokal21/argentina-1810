import { mountShop } from './shop';
import { mountSheet } from './sheet';
import Phaser from 'phaser';
import { controls, EFFECTS, fx, setEffect, setMouseControl, type Effect } from './fx/settings';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { SelectScene } from './scenes/SelectScene';
import { TitleScene } from './scenes/TitleScene';
import { key, mountTouch, touch } from './touch';
import { forget } from './save';
import { music, nowPlaying, setMusic } from './music';
import { mountSupport } from './support';

// The pixel type is fetched now, so it is there by the time anything is written in it.
void document.fonts.load("8px 'Silkscreen'");
void document.fonts.load("21px 'Jacquard 12'");

// The game is drawn two screen pixels to each of its own, which on a phone leaves room for very
// little of it. Where the screen is small it is drawn as if it were larger and shown smaller: its
// short side is never fewer than this many pixels.
// On a phone it may have to be fewer, if it does not run smoothly (see `quality` below).
const SHORTS = [560, 440, 440];
const QUALITY = '1810.calidad';
let quality = (() => { try { return Math.min(2, Math.max(0, Number(localStorage.getItem(QUALITY)) || 0)); } catch { return 0; } })();
const shown = () => Math.min(1, Math.min(innerWidth, innerHeight) / SHORTS[quality]);
const sized = (k: number) => [Math.ceil(innerWidth / k), Math.ceil(innerHeight / k)] as const;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14110f',
  // Clear, so that the world drawn in 3D under it shows through (see GameScene); the page is this colour.
  transparent: true,
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
  (globalThis as { musica?: typeof nowPlaying }).musica = nowPlaying;
  // The panel and its sliders exist only here; the published build drops them.
}
// The panel for trying things out: always while developing. In the published game it is turned on
// by opening it once with ?dev, and stays on in that browser until it is opened with ?dev=0.
const devAsked = new URLSearchParams(location.search).get('dev');
try {
  if (devAsked === '0') localStorage.removeItem('1810.dev');
  else if (devAsked !== null) localStorage.setItem('1810.dev', '1');
} catch { /* only this once, then */ }
const devOn = (() => { try { return localStorage.getItem('1810.dev') === '1'; } catch { return false; } })();
if (import.meta.env.DEV || (devAsked !== null && devAsked !== '0') || devOn) {
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

// How smoothly it runs, on a phone. A phone that has been playing a while warms up and slows
// itself down; when the game has run under FLUID frames a second for several seconds together,
// it asks less of it, a step at a time: first it is drawn at fewer pixels, then at thirty frames
// a second, which is steadier than sixty that stumble. The step is kept for next time; the pause
// menu puts it back.
const FLUID = 45, WATCHED = 6;
const NAMES = ['alta', 'liviana', 'liviana, a 30 cuadros'];
const limit = (fps: number) => {
  const loop = game.loop as unknown as { fpsLimit: number; hasFpsLimit: boolean; _limitRate: number; callback: (time: number, delta: number) => void; stop(): void; start(cb: (time: number, delta: number) => void): void };
  if (loop.fpsLimit === fps) return;
  loop.fpsLimit = fps;
  loop.hasFpsLimit = fps > 0;
  loop._limitRate = fps > 0 ? 1000 / fps : 0;
  // The loop chooses how it steps when it starts.
  const step = loop.callback;
  loop.stop();
  loop.start(step);
};
const setQuality = (level: number) => {
  quality = level;
  try { localStorage.setItem(QUALITY, String(level)); } catch { /* kept for this sitting only */ }
  fit();
  limit(level >= 2 ? 30 : 0);
  const shownAs = document.getElementById('quality');
  if (shownAs) shownAs.textContent = `Calidad: ${NAMES[level]}`;
};
game.events.once(Phaser.Core.Events.READY, () => { if (quality >= 2) limit(30); });
const rates: number[] = [];
let settling = 0;
setInterval(() => {
  const playing = game.scene.isActive('game') && document.visibilityState === 'visible';
  if (!touch.on || !playing || quality >= 2) { rates.length = 0; settling = 0; return; }
  // The first seconds of play are not counted: it is still loading and settling.
  if (settling++ < 5) return;
  rates.push(game.loop.actualFps);
  if (rates.length > WATCHED) rates.shift();
  if (rates.length === WATCHED && rates.reduce((a, b) => a + b, 0) / WATCHED < FLUID) {
    rates.length = 0;
    setQuality(quality + 1);
  }
}, 1000);

mountTouch(game);
mountSupport();
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
// What the game asked less of the phone is shown in the pause menu, and touched it goes back to the best.
const qualityButton = document.getElementById('quality')!;
qualityButton.addEventListener('click', () => { setQuality(0); });

// The music: how loud, and silenced or not, kept for next time.
const mute = document.getElementById('mute')!, volume = document.getElementById('volume') as HTMLInputElement, volumeShown = document.getElementById('volume-shown')!;
const showMusic = () => {
  mute.textContent = music.muted ? 'Activar' : 'Silenciar';
  volume.value = String(Math.round(music.volume * 100));
  volume.disabled = music.muted;
  volumeShown.textContent = music.muted ? 'sin' : `${volume.value}%`;
};
mute.addEventListener('click', () => { setMusic({ muted: !music.muted }); showMusic(); });
volume.addEventListener('input', () => { setMusic({ volume: Number(volume.value) / 100 }); showMusic(); });
// Once let go it gives the keyboard back to the game.
volume.addEventListener('change', () => volume.blur());
showMusic();

// Beginning again throws away the game kept for whoever is being played. It asks once more first.
const again = document.getElementById('again')!;
again.addEventListener('click', () => {
  if (!again.classList.contains('sure')) {
    again.classList.add('sure');
    again.textContent = '¿Seguro? Se pierde todo. Tocá de nuevo';
    return;
  }
  forget((game.scene.getScene('game') as GameScene).playing);
  location.reload();
});

// Without keys: the menu is left by its own button.
document.getElementById('resume')!.addEventListener('click', () => key('Escape'));
const togglePause = () => {
  // There is nothing to stop until the game itself is on.
  if (!paused && !game.scene.isActive('game')) return;
  paused = !paused;
  // What it says of the controls is what there is to hand: keys, or the buttons on the screen.
  document.getElementById('keys')!.hidden = touch.on;
  document.getElementById('taps')!.hidden = !touch.on;
  qualityButton.textContent = `Calidad: ${NAMES[quality]}`;
  again.classList.remove('sure');
  again.textContent = 'Empezar de nuevo';
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
