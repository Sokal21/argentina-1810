import { expect, test } from 'vitest';
import { Vitals } from '../src/world/vitals';

test('each hit takes one life and falls on the last', () => {
  const v = new Vitals(3, 0, 2);
  expect(v.hit()).toBe(true);
  expect(v.hit()).toBe(true);
  expect(v.standing).toBe(true);
  expect(v.hit()).toBe(true);
  expect(v.life).toBe(0);
  expect(v.standing).toBe(false);
});

test('right after a hit, further hits do nothing for a moment', () => {
  const v = new Vitals(5, 0.6, 2);
  expect(v.hit()).toBe(true);
  expect(v.hit()).toBe(false);   // same instant: a volley cannot stack
  v.update(0.5);
  expect(v.hit()).toBe(false);
  v.update(0.2);
  expect(v.hit()).toBe(true);
  expect(v.life).toBe(3);
});

test('once fallen nothing more lands, and she gets back up at full life', () => {
  const v = new Vitals(1, 0, 2);
  v.hit();
  expect(v.hit()).toBe(false);
  expect(v.update(1.9)).toBe(false);
  expect(v.standing).toBe(false);
  expect(v.update(0.2)).toBe(true);   // the step she rises
  expect(v.standing).toBe(true);
  expect(v.life).toBe(1);
  expect(v.update(0.1)).toBe(false);  // only reported once
});

test('she is protected for a moment after getting up', () => {
  const v = new Vitals(1, 0.6, 1);
  v.hit();
  v.update(1);
  expect(v.hit()).toBe(false);
  v.update(0.7);
  expect(v.hit()).toBe(true);
});
