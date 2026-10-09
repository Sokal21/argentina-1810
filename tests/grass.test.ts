import { expect, test } from 'vitest';
import { paintGrass } from '../src/world/grass';

const greens = ['#303b27', '#2e3926', '#333e29', '#2c3624', '#35402a'];

test('a patch of ground is painted all over, and the same every time', () => {
  const patch = paintGrass(128, 64, greens);
  expect(patch.length).toBe(128 * 64 * 4);
  for (let i = 3; i < patch.length; i += 4) expect(patch[i]).toBe(255);
  expect(paintGrass(128, 64, greens)).toEqual(patch);
});

test('another seed paints another patch', () => {
  expect(paintGrass(128, 64, greens, 2)).not.toEqual(paintGrass(128, 64, greens, 1));
});

test('the ground keeps close to the colours it was given', () => {
  const patch = paintGrass(128, 64, greens);
  // Blades and shadows aside, nothing strays from the zone's own greens.
  let own = 0;
  const given = new Set(greens.map(hex => parseInt(hex.slice(1), 16)));
  for (let i = 0; i < patch.length; i += 4) {
    if (given.has((patch[i] << 16) | (patch[i + 1] << 8) | patch[i + 2])) own++;
  }
  expect(own / (128 * 64)).toBeGreaterThan(0.95);
});
