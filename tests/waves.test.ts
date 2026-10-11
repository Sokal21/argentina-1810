import { expect, test } from 'vitest';
import { BREATH, Waves } from '../src/world/waves';

test('the first wave comes at once, and no other while any of it stands', () => {
  const waves = new Waves([3, 4]);
  expect(waves.update(0.1, 0)).toBe(3);
  expect(waves.update(10, 3)).toBeNull();
  expect(waves.update(10, 1)).toBeNull();
  expect(waves.come).toBe(1);
});

test('the next comes a breath after the last of one is down', () => {
  const waves = new Waves([3, 4]);
  waves.update(0.1, 0);
  expect(waves.update(BREATH / 2, 0)).toBeNull();
  expect(waves.update(BREATH / 2, 0)).toBe(4);
});

test('it is won when the last of the last wave is down, and says so once', () => {
  const waves = new Waves([2]);
  waves.update(0.1, 0);
  expect(waves.update(1, 2)).toBeNull();
  expect(waves.won).toBe(false);
  expect(waves.update(BREATH, 0)).toBe('won');
  expect(waves.won).toBe(true);
  expect(waves.update(BREATH, 0)).toBeNull();
});
