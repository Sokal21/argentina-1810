import { expect, test } from 'vitest';
import { overlaps, pushOut, type Footprint } from '../src/world/footprint';

const block: Footprint = { x: 100, y: 100, hw: 13, hh: 6 };
const feet = (x: number, y: number): Footprint => ({ x, y, hw: 7, hh: 3.5 });

test('footprints overlap only when they share ground on both axes', () => {
  expect(overlaps(feet(100, 100), block)).toBe(true);
  expect(overlaps(feet(119, 100), block)).toBe(true);   // 19 apart, 20 allowed
  expect(overlaps(feet(121, 100), block)).toBe(false);
  expect(overlaps(feet(100, 110), block)).toBe(false);  // 10 apart, 9.5 allowed
  expect(overlaps(feet(119, 110), block)).toBe(false);  // clear on one axis is clear
});

test('standing clear, nothing moves', () => {
  expect(pushOut(feet(140, 100), block)).toEqual({ x: 140, y: 100 });
});

test('walking into a side puts her back at that side', () => {
  expect(pushOut(feet(84, 100), block)).toEqual({ x: 80, y: 100 });   // from the left
  expect(pushOut(feet(117, 100), block)).toEqual({ x: 120, y: 100 }); // from the right
  expect(pushOut(feet(100, 93), block)).toEqual({ x: 100, y: 90.5 }); // from above
  expect(pushOut(feet(100, 108), block)).toEqual({ x: 100, y: 109.5 }); // from below
});

test('after being pushed out she no longer overlaps', () => {
  for (const [x, y] of [[84, 100], [117, 98], [100, 93], [105, 107], [90, 95]]) {
    const clear = pushOut(feet(x, y), block);
    expect(overlaps(feet(clear.x, clear.y), block)).toBe(false);
  }
});

test('sliding along a face only corrects the axis she is pressing on', () => {
  // Pressed against the top face while drifting sideways: x is left alone.
  const clear = pushOut(feet(104, 92), block);
  expect(clear).toEqual({ x: 104, y: 90.5 });
});
