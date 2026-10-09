import { expect, test } from 'vitest';
import { bosquePatagonico } from '../src/world/maps/bosque';
import { plantTrees, STANDING, WALL } from '../src/world/trees';
import { PLOT_H, PLOT_W, zoneAt, type WorldMap } from '../src/world/zones';

const grass = ['#000'];
const map: WorldMap = {
  name: 'Prueba',
  zones: { C: { name: 'Campamento', safe: true, ground: grass }, B: { name: 'Bosque', ground: grass } },
  plots: [
    '..........',
    '..........',
    '..........',
    '..........',
    '....CB....',
    '..........',
    '..........',
    '..........',
    '..........',
  ],
  start: [4, 4],
  objectives: [],
};

test('the same map is planted the same every time', () => {
  expect(plantTrees(map, 3)).toEqual(plantTrees(map, 3));
});

test('the thick country is walled with great trees right where it meets the ground', () => {
  const trees = plantTrees(map, 3);
  // Every plot touching the two that can be walked holds at least one.
  for (let row = 3; row <= 5; row++) {
    for (let col = 3; col <= 6; col++) {
      if (row === 4 && (col === 4 || col === 5)) continue;
      const here = trees.filter(t => Math.floor(t.x / PLOT_W) === col && Math.floor(t.y / PLOT_H) === row);
      expect(here.length).toBeGreaterThan(0);
      for (const tree of here) expect(tree.size).toBe(WALL);
    }
  }
});

test('the wall is three plots deep, and bare beyond', () => {
  for (const tree of plantTrees(map, 3)) {
    const col = Math.floor(tree.x / PLOT_W), row = Math.floor(tree.y / PLOT_H);
    expect(Math.max(Math.abs(row - 4), Math.min(Math.abs(col - 4), Math.abs(col - 5)))).toBeLessThanOrEqual(3);
  }
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
