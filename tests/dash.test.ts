import { expect, test } from 'vitest';
import { MachiController, type MachiInput } from '../src/machi/controller';
import { DASH_COOLDOWN, DASH_DISTANCE, DASH_TIME } from '../src/machi/data';

const DT = 1 / 60;
const idle: MachiInput = { dx: 0, dy: 0, attack: false };

function run(machi: MachiController, seconds: number, input: MachiInput): void {
  for (let t = 0; t < seconds; t += DT) machi.update(DT, input);
}

/** Presses dash once, then keeps `held` down until the dash is over. */
function dash(machi: MachiController, held: MachiInput): void {
  machi.update(DT, { ...held, dash: true });
  while (machi.isDashing) machi.update(DT, held);
}

test.each([
  ['right', 1, 0], ['left', -1, 0], ['down', 0, 1], ['up', 0, -1],
  ['down-right', 1, 1], ['down-left', -1, 1], ['up-right', 1, -1], ['up-left', -1, -1],
])('dashing %s covers the dash distance in that direction', (_name, dx, dy) => {
  const machi = new MachiController();
  run(machi, 0.5, { ...idle, dx, dy });
  const x0 = machi.x, y0 = machi.y;
  dash(machi, { ...idle, dx, dy });
  // The screen shows the ground foreshortened, so the vertical part is doubled back.
  const gx = machi.x - x0, gy = (machi.y - y0) * 2;
  expect(Math.hypot(gx, gy)).toBeCloseTo(DASH_DISTANCE, 4);
  expect(Math.atan2(gy, gx)).toBeCloseTo(Math.atan2(dy, dx), 6);
});

test('standing, she dashes the way she is facing', () => {
  const machi = new MachiController();
  run(machi, 0.5, { ...idle, dx: 1 });   // end up facing right
  run(machi, 0.5, idle);
  const x0 = machi.x, y0 = machi.y;
  dash(machi, idle);
  expect(machi.x - x0).toBeCloseTo(DASH_DISTANCE, 4);
  expect(machi.y).toBeCloseTo(y0, 6);
});

test('it is quick: fast at first, slowing to a stop', () => {
  const machi = new MachiController();
  run(machi, 0.5, { ...idle, dx: 1 });
  const x0 = machi.x;
  machi.update(DT, { ...idle, dx: 1, dash: true });
  const first = machi.x - x0;
  let last = 0, steps = 1;
  while (machi.isDashing) {
    const before = machi.x;
    machi.update(DT, { ...idle, dx: 1 });
    last = machi.x - before;
    steps++;
  }
  expect(first).toBeGreaterThan(last * 4);
  expect(steps * DT).toBeCloseTo(DASH_TIME, 1);
});

test('steering and attacking do nothing until it is over', () => {
  const machi = new MachiController();
  run(machi, 0.5, { ...idle, dx: 1 });
  const y0 = machi.y;
  machi.update(DT, { ...idle, dx: 1, dash: true });
  for (let i = 0; i < 6; i++) machi.update(DT, { ...idle, dy: 1, attack: true });
  expect(machi.isDashing).toBe(true);
  expect(machi.y).toBeCloseTo(y0, 6);     // still going right, not down
  expect(machi.isAttacking).toBe(false);
  expect(machi.takeCast()).toBeNull();
});

test('she has to wait a moment before dashing again', () => {
  const machi = new MachiController();
  dash(machi, { ...idle, dx: 1 });
  machi.update(DT, { ...idle, dx: 1, dash: true });
  expect(machi.isDashing).toBe(false);
  run(machi, DASH_COOLDOWN, { ...idle, dx: 1 });
  machi.update(DT, { ...idle, dx: 1, dash: true });
  expect(machi.isDashing).toBe(true);
});

test('a dash cuts a cast short', () => {
  const machi = new MachiController();
  run(machi, 0.3, { ...idle, attack: true });
  expect(machi.isAttacking).toBe(true);
  machi.update(DT, { ...idle, dash: true });
  expect(machi.isAttacking).toBe(false);
});
