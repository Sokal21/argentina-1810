import { expect, test } from 'vitest';
import { bosquePatagonico } from '../src/world/maps/bosque';
import { DEPTH, plantTrees, STANDING, WALL } from '../src/world/trees';
import { PLOT_H, PLOT_W, zoneAt, type WorldMap } from '../src/world/zones';

// Two plots of ground, a camp and a stretch of forest, deep in thick country.
const MARGIN = DEPTH + 2;
const wild = '.'.repeat(2 * MARGIN + 2);
const map: WorldMap = {
  name: 'Prueba',
  ground: ['#000'],
  zones: { C: { name: 'Campamento', safe: true }, B: { name: 'Bosque' } },
  plots: [
    ...Array<string>(MARGIN).fill(wild),
    '.'.repeat(MARGIN) + 'CB' + '.'.repeat(MARGIN),
    ...Array<string>(MARGIN).fill(wild),
  ],
  start: [MARGIN, MARGIN],
  objectives: [],
};

test('the same map is planted the same every time', () => {
  expect(plantTrees(map, 3)).toEqual(plantTrees(map, 3));
});

test('the thick country is walled with great trees right where it meets the ground', () => {
  const trees = plantTrees(map, 3);
  // Every plot touching the two that can be walked holds at least one.
  for (let row = MARGIN - 1; row <= MARGIN + 1; row++) {
    for (let col = MARGIN - 1; col <= MARGIN + 2; col++) {
      if (row === MARGIN && (col === MARGIN || col === MARGIN + 1)) continue;
      const here = trees.filter(t => Math.floor(t.x / PLOT_W) === col && Math.floor(t.y / PLOT_H) === row);
      expect(here.length).toBeGreaterThan(0);
      for (const tree of here) expect(tree.size).toBe(WALL);
    }
  }
});

test('the wall is only so deep, and bare beyond', () => {
  const far = plantTrees(map, 3).map(tree => {
    const col = Math.floor(tree.x / PLOT_W), row = Math.floor(tree.y / PLOT_H);
    return Math.max(Math.abs(row - MARGIN), Math.min(Math.abs(col - MARGIN), Math.abs(col - MARGIN - 1)));
  });
  expect(Math.max(...far)).toBe(DEPTH);
});

test('nothing grows in the camp, and only smaller trees in the forest', () => {
  const trees = plantTrees(bosquePatagonico, 3);
  const standing = trees.filter(t => zoneAt(bosquePatagonico, t.x, t.y));
  expect(standing.length).toBeGreaterThan(0);
  for (const tree of standing) {
    expect(zoneAt(bosquePatagonico, tree.x, tree.y)!.safe).toBeFalsy();
    expect(tree.size).toBe(STANDING);
  }
});

test('each tree is one of the drawings there are', () => {
  for (const tree of plantTrees(bosquePatagonico, 3)) expect([0, 1, 2]).toContain(tree.kind);
});
