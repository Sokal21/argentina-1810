import { expect, test } from 'vitest';
import { ISO_Y } from '../src/machi/data';
import { ARENA_REACH, arenaDeRoca as map } from '../src/world/maps/arena';
import { faults, letterAt, PLOT_H, PLOT_W } from '../src/world/zones';

test('the clearing holds together, and she comes into it from somewhere safe', () => {
  expect(faults(map)).toEqual([]);
});

test('it is round and no wider than its reach either way, with nothing in it', () => {
  const inside: [number, number][] = [];
  map.plots.forEach((line, row) => [...line].forEach((letter, col) => { if (letter === 'A') inside.push([col, row]); }));
  const across = (Math.max(...inside.map(p => p[0])) - Math.min(...inside.map(p => p[0])) + 1) * PLOT_W;
  const deep = (Math.max(...inside.map(p => p[1])) - Math.min(...inside.map(p => p[1])) + 1) * PLOT_H / ISO_Y;
  expect(across).toBeLessThanOrEqual(ARENA_REACH * 2 + PLOT_W * 1.5);
  expect(deep).toBeCloseTo(across, -2);
  expect(map.buildings ?? []).toEqual([]);
  expect(letterAt(map, ...map.start)).toBe('E');
});

test('no tree stands in the clearing; its edge is marked by young trees right on it, low ones along its south', async () => {
  const { plantTrees } = await import('../src/world/trees');
  const { zoneAt } = await import('../src/world/zones');
  const trees = plantTrees(map, 2);
  expect(trees.filter(t => zoneAt(map, t.x, t.y))).toEqual([]);
  // Those within a few pixels of the clearing are its edge: young, and low on its south side.
  const onEdge = trees.filter(t => [[0, -10], [0, 10], [-10, 0], [10, 0]].some(([dx, dy]) => zoneAt(map, t.x + dx, t.y + dy)?.open));
  expect(onEdge.length).toBeGreaterThan(20);
  expect(onEdge.every(t => t.kind === 1)).toBe(true);
  const south = onEdge.filter(t => zoneAt(map, t.x, t.y - 10)?.open);
  expect(south.length).toBeGreaterThan(0);
  expect(Math.max(...south.map(t => t.size))).toBeLessThan(1);
});

test('she comes in inside the clearing itself, at its south edge', () => {
  expect(map.zones[letterAt(map, ...map.start)!].open).toBe(true);
  expect(letterAt(map, map.start[0], map.start[1] + 1)).toBeUndefined();
});
