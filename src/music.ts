// The music before playing: it plays over the title (the Cabildo) and the choice of who to play,
// and fades out as the game begins. It is one file, assets/musica/intro.mp3; without it, nothing
// plays. Browsers only let sound start once the page has been touched or a key pressed, so where
// it cannot start at once it starts at the first of those.

const SRC = 'musica/intro.mp3';
const VOLUME = 0.55;
const FADE = 1200;   // milliseconds it takes to fade out

let tune: HTMLAudioElement | null = null;
let wanted = false;

function make(): HTMLAudioElement {
  if (tune) return tune;
  tune = new Audio(SRC);
  tune.loop = true;
  tune.volume = VOLUME;
  // Without the file there is simply no music.
  tune.addEventListener('error', () => { wanted = false; });
  return tune;
}

const tryPlay = () => {
  if (!wanted || !tune) return;
  void tune.play().catch(() => {});
};

/** Starts the music before playing, or as soon as the browser lets it. */
export function startIntroMusic(): void {
  wanted = true;
  const t = make();
  t.volume = VOLUME;
  if (!t.paused) return;
  void t.play().catch(() => {
    // Not allowed yet: at the first touch or key.
    const once = () => { removeEventListener('pointerdown', once, true); removeEventListener('keydown', once, true); tryPlay(); };
    addEventListener('pointerdown', once, true);
    addEventListener('keydown', once, true);
  });
}

/** Fades it out, as the game begins. */
export function stopIntroMusic(): void {
  wanted = false;
  const t = tune;
  if (!t || t.paused) return;
  const from = t.volume, began = performance.now();
  const step = () => {
    const p = Math.min(1, (performance.now() - began) / FADE);
    t.volume = from * (1 - p);
    if (p < 1) requestAnimationFrame(step);
    else { t.pause(); t.currentTime = 0; t.volume = VOLUME; }
  };
  requestAnimationFrame(step);
}
