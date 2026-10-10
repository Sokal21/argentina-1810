import { expect, test } from 'vitest';
import { BEHIND, garrison, leftBehind } from '../src/world/garrison';
import { vadoDeLasVizcachas as vado } from '../src/world/maps/vado';
import { middle, PLOT_W, zoneAt, type WorldMap } from '../src/world/zones';

const map: WorldMap = {
  name: 'Prueba',
  ground: ['#000'],
  zones: { P: { name: 'Pueblo', safe: true }, C: { name: 'Camino', foes: 5 } },
  plots: [
    '..............................',
    '.PPPCCCCCCCCCCCCCCCCCCCCCCCCC.',
    '.PPPCCCCCCCCCCCCCCCCCCCCCCCCC.',
    '.PPPCCCCCCCCCCCCCCCCCCCCCCCCC.',
    '.PPPCCCCCCCCCCCCCCCCCCCCCCCCC.',
    '.PPPCCCCCCCCCCCCCCCCCCCCCCCCC.',
    '..............................',
  ],
  start: [2, 3],
  objectives: [],
};

test('a zone is held by as many soldiers as it says, each on its own ground', () => {
  const posts = garrison(map);
  expect(posts).toHaveLength(5);
  for (const post of posts) expect(zoneAt(map, post.x, post.y)?.name).toBe('Camino');
});

test('a zone that says nothing is held by nobody', () => {
  expect(garrison({ ...map, zones: { ...map.zones, C: { name: 'Camino' } } })).toEqual([]);
});

test('they stand in pickets, not strung out one by one, and none where the hero arrives', () => {
  const posts = garrison(map), start = middle(map.start);
  // Five men in pickets of three at most: two pickets, and every man has another close by.
  for (const post of posts) {
    expect(posts.some(other => other !== post && Math.hypot(other.x - post.x, other.y - post.y) < 120)).toBe(true);
    expect(Math.hypot(post.x - start.x, post.y - start.y)).toBeGreaterThan(4 * PLOT_W);
  }
});

test('the same map is always held the same way', () => {
  expect(garrison(map)).toEqual(garrison(map));
});

test('a post is left behind only when the hero is in another zone and far from it', () => {
  const [post] = garrison(map);
  // Standing right there, or far off but still in the zone, it is not.
  expect(leftBehind(map, post, post)).toBe(false);
  const farEnd = middle([post.x < 15 * PLOT_W ? 28 : 4, 3]);
  expect(Math.hypot(farEnd.x - post.x, farEnd.y - post.y)).toBeGreaterThan(BEHIND);
  expect(leftBehind(map, post, farEnd)).toBe(false);
  // In the village, it depends on how far the post is.
  const village = middle([2, 3]);
  expect(leftBehind(map, post, village)).toBe(Math.hypot(village.x - post.x, village.y - post.y) > BEHIND);
});

test("Cabral's road is held all along, and its two safe places by nobody", () => {
  const posts = garrison(vado);
  expect(posts.length).toBeGreaterThan(40);
  const held = new Set(posts.map(p => p.letter));
  expect(held.has('P')).toBe(false);
  expect(held.has('K')).toBe(false);
  for (const letter of ['H', 'D', 'B', 'M', 'C', 'T', 'S', 'V']) expect(held.has(letter)).toBe(true);
  for (const post of posts) expect(zoneAt(vado, post.x, post.y)).toBeDefined();
});
