import { expect, test } from 'vitest';
import { EVERY, FIRST, Growth, STEEPER, STEP, toNext } from '../src/machi/growth';

test('each level takes steeply more than the last', () => {
  expect(toNext(1)).toBe(FIRST);
  for (let level = 1; level < 8; level++) expect(toNext(level + 1) / toNext(level)).toBeCloseTo(STEEPER, 1);
});

test('enough experience is a level, and each level a point', () => {
  const growth = new Growth();
  expect(growth.earn(FIRST - 1)).toBe(0);
  expect([growth.level, growth.points]).toEqual([1, 0]);
  expect(growth.earn(1)).toBe(1);
  expect([growth.level, growth.points, growth.xp]).toEqual([2, 1, 0]);
});

test('a great deal at once is several levels, and what is left over is kept', () => {
  const growth = new Growth();
  expect(growth.earn(toNext(1) + toNext(2) + 7)).toBe(2);
  expect([growth.level, growth.points, growth.xp]).toEqual([3, 2, 7]);
  expect(growth.share).toBeCloseTo(7 / toNext(3));
});

test('a point makes something that much more than it was, and is spent', () => {
  const growth = new Growth();
  expect(growth.put('basic')).toBe(false);
  growth.earn(toNext(1));
  expect(growth.put('basic')).toBe(true);
  expect(growth.gives('basic')).toBeCloseTo(1 + STEP.basic);
  expect(growth.gives('life')).toBe(1);
  expect(growth.points).toBe(0);
  expect(growth.put('life')).toBe(false);
});

test('their greatest power takes a point only once for every five levels', () => {
  const growth = new Growth();
  while (growth.level < EVERY - 1) growth.earn(toNext(growth.level));
  expect(growth.points).toBeGreaterThan(0);
  expect(growth.can('ultimate')).toBe(false);
  growth.earn(toNext(growth.level));
  expect(growth.level).toBe(EVERY);
  expect(growth.put('ultimate')).toBe(true);
  // Not twice, however many points are left.
  expect(growth.points).toBeGreaterThan(0);
  expect(growth.put('ultimate')).toBe(false);
});

test('a low country stops being worth the fighting: the third level is in reach, the sixth is not', () => {
  // The whole of a first map, missions and one clearing of its soldiers, is some eight hundred.
  const growth = new Growth();
  growth.earn(800);
  expect(growth.level).toBe(3);
  // Clearing it ten times over again does not bring another three.
  growth.earn(10 * 48 * 6);
  expect(growth.level).toBeLessThan(6);
});
