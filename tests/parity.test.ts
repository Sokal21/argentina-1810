// The Phaser game must move the machi exactly like the canvas prototype in
// demo/index.html, which is where every timing and transition was tuned.
// Both are driven by the same keyboard events and compared step by step.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { Keys } from '../src/input';
import { MachiController } from '../src/machi/controller';

type Handler = (e: { code: string; repeat: boolean; preventDefault(): void }) => void;

/** Just enough of a window to collect key listeners and fire them. */
function fakeWindow() {
  const handlers: Record<string, Handler[]> = {};
  return {
    addEventListener: (name: string, f: Handler) => { (handlers[name] ??= []).push(f); },
    fire: (name: string, code: string) =>
      handlers[name]?.forEach(f => f({ code, repeat: false, preventDefault() {} })),
  };
}

const CANVAS_W = 400, CANVAS_H = 300;

/** Runs the prototype's script with its drawing stubbed out. */
function loadPrototype() {
  const html = readFileSync(new URL('../demo/index.html', import.meta.url), 'utf8');
  const js = html.split('<script>')[1].split('</script>')[0];
  const win = fakeWindow();
  const drawn: number[][] = [];
  const ctx: any = new Proxy({}, {
    get: (t: any, k: string) =>
      k === 'drawImage' ? (...a: number[]) => drawn.push(a)
      : k === 'createImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })
      : k in t ? t[k] : () => {},
    set: (t: any, k: string, v: unknown) => { t[k] = v; return true; },
  });
  const el = () => ({
    getContext: () => ctx, width: CANVAS_W, height: CANVAS_H, textContent: '', dataset: {},
    classList: { toggle() {} }, style: { setProperty() {} },
    querySelectorAll: () => [], appendChild() {}, addEventListener() {},
  });
  const env = {
    document: { getElementById: el, createElement: el, body: el() },
    localStorage: { getItem: () => null, setItem() {} },
    innerWidth: CANVAS_W * 2, innerHeight: CANVAS_H * 2,
    addEventListener: win.addEventListener,
    Image: class { complete = true; naturalHeight = 94; naturalWidth = 0; },
    performance: { now: () => 0 },
    requestAnimationFrame: () => {},
  };
  const api = new Function(...Object.keys(env), `${js}; return { machi, update, drawMachi, SHEETS };`)(
    ...Object.values(env));
  // Frame counts come from the sheets' own table rather than image sizes.
  for (const s of Object.values(api.SHEETS) as any[]) s.img.naturalWidth = s.frames * 94;
  return {
    fire: win.fire,
    step(dt: number) {
      api.update(dt);
      drawn.length = 0;
      const label: string = api.drawMachi(0, 0);
      return {
        sheet: label.replace(' (espejado)', ''),
        flip: label.endsWith('(espejado)'),
        frame: drawn[0][1] / 94,
        x: api.machi.x as number,
        y: api.machi.y as number,
      };
    },
  };
}

function loadGame() {
  const win = fakeWindow();
  const keys = new Keys(win as unknown as Window);
  // The prototype keeps her inside its canvas; give the game the same limits.
  const machi = new MachiController({
    minX: -(CANVAS_W / 2 - 12), maxX: CANVAS_W / 2 - 12,
    minY: -CANVAS_H / 2 + 70, maxY: CANVAS_H / 2 - 6,
  });
  return {
    fire: win.fire,
    step(dt: number) {
      machi.update(dt, keys.read());
      const { sheet, flip, frame, x, y } = machi.pose();
      // The prototype has no standing casts; it plays the walking one on the spot.
      return { sheet: sheet.replace('attack_still_', 'attack_'), flip, frame, x, y };
    },
  };
}

const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];

/** Small deterministic generator, so a failure can be reproduced. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test.each([1, 2, 3, 4, 5])('same poses as the prototype under random key mashing (seed %i)', seed => {
  const a = loadPrototype(), b = loadGame();
  const random = rng(seed);
  const down = new Set<string>();
  const seen = new Set<string>();

  for (let step = 0; step < 6000; step++) {
    // Press or release a random key every few steps, at uneven intervals.
    if (random() < 0.12) {
      const code = KEYS[Math.floor(random() * KEYS.length)];
      const type = down.has(code) ? 'keyup' : 'keydown';
      if (type === 'keydown') down.add(code); else down.delete(code);
      a.fire(type, code);
      b.fire(type, code);
    }
    const dt = 1 / 60 + (random() - 0.5) / 400;
    const pa = a.step(dt), pb = b.step(dt);
    seen.add(pa.sheet);
    expect(pb, `step ${step}`).toEqual({
      ...pa,
      x: expect.closeTo(pa.x, 6),
      y: expect.closeTo(pa.y, 6),
    });
  }
  // The run has to have exercised more than standing still.
  expect(seen.size).toBeGreaterThan(15);
});

test('the game data has the same sheets and turns as the prototype, with the same numbers', async () => {
  const { SHEETS, TURNS } = await import('../src/machi/data');
  const html = readFileSync(new URL('../demo/index.html', import.meta.url), 'utf8');
  const js = html.split('<script>')[1].split('</script>')[0];
  const proto = new Function(
    `${js.slice(js.indexOf('const FPS'), js.indexOf('const SCALE'))}; return { SHEETS, TURNS };`)();
  for (const s of Object.values(proto.SHEETS) as any[]) s.src = s.src.replace('../assets/', '');
  // The game adds where the bolt starts and the standing casts, which the
  // prototype never had.
  const shared = Object.fromEntries(
    Object.entries(SHEETS)
      .filter(([name]) => !name.startsWith('attack_still_'))
      .map(([name, { muzzle: _muzzle, ...sheet }]) => [name, sheet]));
  expect(shared).toEqual(proto.SHEETS);
  expect(TURNS).toEqual(proto.TURNS);
});
