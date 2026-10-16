import { expect, test } from 'vitest';
import { DODGE, STAMINA, Stamina } from '../src/machi/stamina';

const run = (s: Stamina, seconds: number, wants = true, moving = true) => {
  let ran = 0;
  for (let t = 0; t < seconds; t += 0.05) if (s.update(0.05, wants, moving)) ran += 0.05;
  return ran;
};
// Runs until out of breath, and says for how long.
const untilWinded = (s: Stamina) => {
  let ran = 0;
  while (!s.winded && ran < 60) { s.update(0.05, true, true); ran += 0.05; }
  return ran;
};

test('running spends it, and it runs out after a few seconds', () => {
  const s = new Stamina();
  const ran = untilWinded(s);
  expect(ran).toBeGreaterThan(3);
  expect(ran).toBeLessThan(5);
  expect(s.winded).toBe(true);
});

test('standing still is not running, and costs nothing', () => {
  const s = new Stamina();
  expect(run(s, 3, true, false)).toBe(0);
  expect(s.value).toBe(STAMINA);
});

test('spent, it cannot run again until a fair part has come back', () => {
  const s = new Stamina();
  untilWinded(s);
  expect(run(s, 0.5)).toBe(0);
  run(s, 3, false);
  expect(s.winded).toBe(false);
  expect(run(s, 0.5)).toBeGreaterThan(0);
});

test('it comes back only after a moment of easing off', () => {
  const s = new Stamina();
  run(s, 2);
  const after = s.value;
  run(s, 0.5, false);
  expect(s.value).toBe(after);
  run(s, 2, false);
  expect(s.value).toBeGreaterThan(after);
});

test('a dodge takes a share at once, and needs only some breath left', () => {
  const s = new Stamina();
  expect(s.dodge()).toBe(true);
  expect(s.value).toBe(STAMINA - DODGE);
  while (s.value > 0) s.dodge();
  expect(s.dodge()).toBe(false);
  expect(s.winded).toBe(true);
});
