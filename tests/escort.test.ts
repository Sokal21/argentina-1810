import { expect, test } from 'vitest';
import { BEHIND, Escort, EVERY, REACH } from '../src/world/escort';

const led = (escort: Escort, to: number, seconds: number, speed = 80) => {
  // The leader walks off to the right; the escort is told of it step by step.
  for (let t = 0, x = 0; t < seconds; t += 0.05) { x = Math.min(to, x + speed * 0.05); escort.follow(0.05, { x, y: 0 }); }
};

test('it comes along where it is led, and stops a little way behind', () => {
  const escort = new Escort({ x: 0, y: 0 }, 5, 40);
  led(escort, 300, 30);
  expect(escort.x).toBeGreaterThan(300 - BEHIND - 12);
  expect(escort.x).toBeLessThanOrEqual(300 - BEHIND + 12);
  expect(escort.y).toBe(0);
});

test('it is slower than whoever leads it: left behind, it is still on its way', () => {
  const escort = new Escort({ x: 0, y: 0 }, 5, 40);
  led(escort, 400, 5);
  // Five seconds at forty a second is two hundred at most.
  expect(escort.x).toBeLessThanOrEqual(201);
  expect(escort.x).toBeGreaterThan(150);
});

test('it goes where the leader went, not straight for where he is', () => {
  const escort = new Escort({ x: 0, y: 0 }, 5, 60);
  // Out to the right, then up: the corner is turned, not cut. All the while it is short
  // of the corner it is still on the first stretch.
  const seen: number[] = [];
  const step = (x: number, y: number) => { escort.follow(0.05, { x, y }); if (escort.x < 195) seen.push(escort.y); };
  for (let x = 0; x <= 200; x += 5) step(x, 0);
  for (let y = 0; y >= -200; y -= 5) step(200, y);
  for (let t = 0; t < 12; t += 0.05) step(200, -200);
  expect(seen.length).toBeGreaterThan(10);
  expect(Math.max(...seen.map(Math.abs))).toBeLessThan(1);
  expect(escort.y).toBeLessThan(-100);
});

test('whatever of the enemy is near wears it down, each in its time, until it is lost', () => {
  const escort = new Escort({ x: 0, y: 0 }, 3, 40);
  expect(escort.harm(EVERY, [{ x: REACH + 5, y: 0 }])).toBe(false);
  expect(escort.harm(EVERY / 2, [{ x: 10, y: 0 }])).toBe(false);
  expect(escort.harm(EVERY / 2, [{ x: 10, y: 0 }, { x: -10, y: 0 }])).toBe(true);
  expect(escort.life).toBe(1);
  escort.harm(EVERY, [{ x: 10, y: 0 }]);
  expect(escort.lost).toBe(true);
});

test('lost, it is put back where it began, whole', () => {
  const escort = new Escort({ x: 5, y: 7 }, 2, 40);
  led(escort, 300, 10);
  escort.harm(EVERY, [escort, escort]);
  expect(escort.lost).toBe(true);
  escort.reset();
  expect([escort.x, escort.y, escort.life]).toEqual([5, 7, 2]);
});
