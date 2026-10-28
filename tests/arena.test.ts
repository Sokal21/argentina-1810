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

test('no tree stands in the clearing, nor in the plots right about it: the monte only closes it round, a plot back', async () => {
  const { plantTrees } = await import('../src/world/trees');
  const near = (x: number, y: number) => {
    const col = Math.floor(x / PLOT_W), row = Math.floor(y / PLOT_H);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (letterAt(map, col + dc, row + dr) !== undefined) return true;
    return false;
  };
  expect(plantTrees(map, 3).filter(t => near(t.x, t.y))).toEqual([]);
});

test('she comes in inside the clearing itself, at its south edge', () => {
  expect(map.zones[letterAt(map, ...map.start)!].open).toBe(true);
  expect(letterAt(map, map.start[0], map.start[1] + 1)).toBeUndefined();
});
