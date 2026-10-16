// The music. One tune at a time, each looping: over the title (the Cabildo) and the choice of who
// to play, `intro`; while playing, the hero's own, if they have one (`cabral`). One fades into the
// next. How loud it is, and whether it is heard at all, is set in the pause menu and kept.
// Browsers only let sound start once the page has been touched or a key pressed, so where it
// cannot start at once it starts at the first of those.

const TUNES = { intro: 'music/intro.mp3', cabral: 'music/cabral.mp3' } as const;
export type Tune = keyof typeof TUNES;
const KEPT = '1810.musica';
const FADE = 1200;   // milliseconds one tune takes to fade out

/** How loud, from 0 to 1, and whether it is muted. */
export const music = (() => {
  try { return { volume: 0.55, muted: false, ...JSON.parse(localStorage.getItem(KEPT) ?? '{}') } as { volume: number; muted: boolean }; }
  catch { return { volume: 0.55, muted: false }; }
})();

const players = new Map<Tune, HTMLAudioElement>();
let current: Tune | null = null;
let waiting = false;

const level = () => (music.muted ? 0 : music.volume);

function player(tune: Tune): HTMLAudioElement {
  let p = players.get(tune);
  if (!p) {
    p = new Audio(TUNES[tune]);
    p.loop = true;
    players.set(tune, p);
  }
  return p;
}

function fadeOut(p: HTMLAudioElement): void {
  const from = p.volume, began = performance.now();
  const step = () => {
    // Started again meanwhile: leave it.
    if (players.get(current as Tune) === p) return;
    const k = Math.min(1, (performance.now() - began) / FADE);
    p.volume = from * (1 - k);
    if (k < 1) requestAnimationFrame(step);
    else { p.pause(); p.currentTime = 0; }
  };
  requestAnimationFrame(step);
}

function start(): void {
  if (!current) return;
  const p = player(current);
  p.volume = level();
  if (!p.paused) return;
  void p.play().catch(() => {
    // Not allowed yet: at the first touch or key.
    if (waiting) return;
    waiting = true;
    const once = () => { waiting = false; removeEventListener('pointerdown', once, true); removeEventListener('keydown', once, true); start(); };
    addEventListener('pointerdown', once, true);
    addEventListener('keydown', once, true);
  });
}

/** Plays a tune, fading out whatever was playing; nothing stops the music. */
export function playMusic(tune: Tune | null): void {
  if (tune === current) { start(); return; }
  const was = current ? players.get(current) : undefined;
  current = tune;
  if (was && !was.paused) fadeOut(was);
  start();
}

/** Sets how loud it is and whether it is heard, and keeps it. */
export function setMusic(change: Partial<typeof music>): void {
  Object.assign(music, change);
  try { localStorage.setItem(KEPT, JSON.stringify(music)); } catch { /* this sitting only */ }
  if (current) player(current).volume = level();
}

/** What is playing, for whoever is trying things out. */
export function nowPlaying(): { tune: Tune | null; paused: boolean; volume: number } {
  const p = current ? players.get(current) : undefined;
  return { tune: current, paused: !p || p.paused, volume: p?.volume ?? 0 };
}
