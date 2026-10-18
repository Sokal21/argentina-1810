// Watch Cabral's cut in the 3D game itself, frame by frame, as the camera sees it.
//
//   node tools/look/blow.mjs OUT_DIR [--arrow ArrowDown] [--slow 0.04] [--shots 16]
//
// Opens 3d.html (the dev server must be running on 5180) in a headless Chromium, slows the game
// down, cuts with an arrow (ArrowDown: toward the camera, so he is seen from the front), and saves
// a picture of the middle of the screen every so often while the cut lasts, and a sheet of them.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [out, ...rest] = process.argv.slice(2);
const opts = Object.fromEntries(rest.reduce((a, v, i, all) => (i % 2 ? a : [...a, [v.replace(/^--/, ''), all[i + 1]]]), []));
const ARROW = opts.arrow ?? 'ArrowDown', SLOW = Number(opts.slow ?? 0.04), SHOTS = Number(opts.shots ?? 16);
const CUT = 0.5;  // seconds the cut lasts in the game
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto('http://localhost:5180/3d.html');
await page.waitForFunction(() => globalThis.cabral && globalThis.view, null, { timeout: 30000 });
await page.waitForTimeout(4000); // the model and its clips
await page.evaluate(s => { globalThis.slow = s; }, SLOW);
await page.keyboard.down(ARROW);
const every = (CUT / SLOW) * 1000 / SHOTS;
// Cabral stands in the middle of the screen; his feet a little below it.
const clip = { x: 640 - 90, y: 400 - 130, width: 180, height: 180 };
// Pictures until the cut is over, as the game itself counts it: the page renders slowly here.
await page.evaluate(() => { globalThis.cut = []; });
for (let i = 0; i < SHOTS; i++) {
  if (i === 1) await page.keyboard.up(ARROW);
  await page.screenshot({ path: `${out}/f_${i}.png`, clip });
  if (i > 3 && !(await page.evaluate(() => globalThis.cabral.isSwinging))) break;
  await page.waitForTimeout(every);
}
await browser.close();
console.log('WROTE', out);
