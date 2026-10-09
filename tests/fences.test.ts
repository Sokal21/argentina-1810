import { expect, test } from 'vitest';
import { APART, fenceRuns, SET_BACK, stakes } from '../src/world/fences';
import { vadoDeLasVizcachas as vado } from '../src/world/maps/vado';
import { PLOT_H, PLOT_W, zoneAt, type WorldMap } from '../src/world/zones';

const map: WorldMap = {
  name: 'Prueba',
  ground: ['#000'],
  zones: { P: { name: 'Pueblo', safe: true, fence: 'stakes' }, H: { name: 'Chacra' } },
  plots: [
    '....',
    '.PH.',
    '....',
  ],
  start: [1, 1],
  objectives: [],
};

test('a fenced zone is closed where it meets ground nobody can cross, and open where it meets another zone', () => {
  const runs = fenceRuns(map);
  // The village plot has wild above, below and to its left, and the farm to its right.
  expect(runs).toHaveLength(3);
  expect(runs.some(r => r.x0 === r.x1 && r.x0 > 2 * PLOT_W - SET_BACK)).toBe(false);
});

test('a zone nobody fenced has no fence', () => {
  expect(fenceRuns({ ...map, zones: { ...map.zones, P: { name: 'Pueblo', safe: true } } })).toEqual([]);
});

test('the posts of a fence going away stand outside the zone, on ground nobody walks', () => {
  const posts = stakes(fenceRuns(map));
  // The one side of the village plot that runs up the screen: its left.
  expect(posts.length).toBeGreaterThan(PLOT_H / APART);
  for (const s of posts) expect(zoneAt(map, s.x, s.y)).toBeUndefined();
});

test('where two stretches meet they share their posts: none stands twice', () => {
  const tall: WorldMap = { ...map, plots: ['....', '.PH.', '.PH.', '....'] };
  const all = stakes(fenceRuns(tall));
  expect(new Set(all.map(s => `${s.x},${s.y}`)).size).toBe(all.length);
});

test("on Cabral's map the village is staked and the chapel walled, and both have a way in", () => {
  const runs = fenceRuns(vado);
  expect(runs.filter(r => r.kind === 'stakes').length).toBeGreaterThan(20);
  expect(runs.filter(r => r.kind === 'wall').length).toBeGreaterThan(20);
});
