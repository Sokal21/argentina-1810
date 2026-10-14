import { expect, test } from 'vitest';
import { Story } from '../src/story/story';
import { LIMIT, markup, shut, standing, told } from '../src/story/standing';
import { RULES, VADO } from '../src/story/vado';

test('the village way raises the village and sinks the friars and his name', () => {
  const s = standing(['hecha:entregar', 'hecha:campana', 'hecha:rehenes']);
  expect(s.pueblo).toBeGreaterThan(3);
  expect(s.frailes).toBeLessThan(-3);
  expect(s.fama).toBeLessThan(0);
});

test('the friars way does the opposite, and leaves him a better name', () => {
  const s = standing(['hecha:amparar', 'hecha:fogatas', 'hecha:escolta']);
  expect(s.frailes).toBeGreaterThan(3);
  expect(s.pueblo).toBeLessThan(0);
  expect(s.fama).toBeGreaterThan(0);
});

test('it is worked out from the story as it is played, and kept within bounds', () => {
  const story = new Story(VADO, RULES);
  for (const q of ['hijo', 'entregar', 'campana', 'rehenes']) story.finish(q);
  const s = standing(story.happened);
  expect(Math.abs(s.pueblo)).toBeLessThanOrEqual(LIMIT);
  expect(s.pueblo).toBeGreaterThan(0);
});

test('dearer from those who dislike him, the village shuts its door after the rebato', () => {
  expect(markup(-4)).toBeGreaterThan(1);
  expect(markup(4)).toBeLessThan(1);
  expect(shut('pueblo', standing([]), h => h === 'final:rebato')).toBe(true);
  expect(shut('pueblo', standing([]), () => false)).toBe(false);
  expect(told(standing([]), standing(['hecha:hijo']))).toEqual(['El pueblo te mira mejor.', 'Se habla mejor de vos.']);
});
