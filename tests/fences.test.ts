import { expect, test } from 'vitest';
import { edges, palisade, SLICE, walls } from '../src/world/fences';
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
  // The village plot has wild above, below and to its left, and the farm to its right.
  const [line] = edges(map, 'stakes');
  expect(line.closed).toBe(false);
  expect(line.points).toHaveLength(4);
  for (const post of palisade(map)) expect(post.x).toBeLessThan(2 * PLOT_W + 12);
});

test('a zone nobody fenced has no fence', () => {
  expect(palisade({ ...map, zones: { ...map.zones, P: { name: 'Pueblo', safe: true } } })).toEqual([]);
});

const village: WorldMap = {
  ...map,
  plots: [
    '..........',
    '...PPP....',
    '..PPPPP...',
    '.PPPPPPPH.',
    '..PPPPP...',
    '...PPP....',
    '..........',
  ],
};

test('the edge of a fenced zone is one line, open at its gate', () => {
  const lines = edges(village, 'stakes');
  expect(lines).toHaveLength(1);
  expect(lines[0].closed).toBe(false);
});

test('no post of a fence stands on ground that is walked', () => {
  const posts = palisade(village);
  expect(posts.length).toBeGreaterThan(100);
  for (const s of posts) expect(zoneAt(village, s.x, s.y)).toBeUndefined();
});

test('a fence does not follow the steps of the plots: most of its posts stand off their lines', () => {
  const posts = palisade(village);
  const onGrid = posts.filter(s => Math.abs(s.x / PLOT_W - Math.round(s.x / PLOT_W)) * PLOT_W < 12 || Math.abs(s.y / PLOT_H - Math.round(s.y / PLOT_H)) * PLOT_H < 12);
  // Stood along plot sides, as it once was, every post would be within a few pixels of one.
  expect(onGrid.length).toBeLessThan(posts.length * 0.75);
});

test('a fence is the same every time for the same map', () => {
  expect(palisade(village)).toEqual(palisade(village));
});

test("on Cabral's map the village is staked and the chapel walled, and both have a way in", () => {
  const posts = palisade(vado);
  expect(posts.length).toBeGreaterThan(300);
  for (const s of posts) expect(zoneAt(vado, s.x, s.y)).toBeUndefined();
  const slices = walls(vado);
  expect(slices.length).toBeGreaterThan(300);
  for (const s of slices) expect(zoneAt(vado, s.x, s.y)).toBeUndefined();
});

test('a wall has no gaps: each slice of it stands right beside the last', () => {
  const walled: WorldMap = { ...village, zones: { ...village.zones, P: { name: 'Capilla', safe: true, fence: 'wall' } } };
  const slices = walls(walled);
  for (let i = 1; i < slices.length; i++) {
    expect(Math.abs(slices[i].x - slices[i - 1].x)).toBeLessThanOrEqual(SLICE + 2);
    expect(Math.abs(slices[i].y - slices[i - 1].y)).toBeLessThanOrEqual(SLICE + 2);
  }
});
