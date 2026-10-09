import { expect, test } from 'vitest';
import { bosquePatagonico } from '../src/world/maps/bosque';
import { extent, faults, middle, PLOT_H, PLOT_W, reachable, zoneAt, type WorldMap } from '../src/world/zones';

const grass = ['#000'];
const map: WorldMap = {
  name: 'Prueba',
  zones: { C: { name: 'Campamento', safe: true, ground: grass }, B: { name: 'Bosque', ground: grass } },
  plots: [
    'CB.',
    '.B.',
  ],
  start: [0, 0],
  objectives: [{ name: 'Algo', plot: [1, 1] }],
};

test('a map reaches as far as its plots', () => {
  expect(extent(map)).toEqual({ width: 3 * PLOT_W, height: 2 * PLOT_H });
});

test('a spot on the ground is in the zone of its plot', () => {
  expect(zoneAt(map, 10, 10)?.name).toBe('Campamento');
  expect(zoneAt(map, PLOT_W, 10)?.name).toBe('Bosque'); // the first pixel of the next plot
  const spot = middle([1, 1]);
  expect(zoneAt(map, spot.x, spot.y)?.name).toBe('Bosque');
});

test('nobody stands in thick country or beyond the map', () => {
  expect(zoneAt(map, 10, PLOT_H + 10)).toBeUndefined();
  expect(zoneAt(map, -1, 10)).toBeUndefined();
  expect(zoneAt(map, 10, 2 * PLOT_H)).toBeUndefined();
});

test('a map that holds together has no faults', () => {
  expect(faults(map)).toEqual([]);
});

test('a zone cut off from the camp is a fault', () => {
  const cut = { ...map, plots: ['C.B', '..B'], objectives: [] };
  expect([...reachable(cut)]).toEqual(['C']);
  expect(faults(cut)).toEqual(['Bosque cannot be walked to']);
});

test('ragged rows, stray letters and misplaced marks are faults', () => {
  expect(faults({ ...map, plots: ['CB.', '.B'] })).toContain('row 1 is 2 plots wide, not 3');
  expect(faults({ ...map, plots: ['CBX', '.B.'] })).toContain('row 0 has a plot of no zone: X');
  expect(faults({ ...map, start: [1, 0] })).toContain('the hero does not arrive somewhere safe');
  expect(faults({ ...map, objectives: [{ name: 'Algo', plot: [0, 1] }] })).toContain('Algo is where nobody can stand');
});

test('the Patagonian forest holds together', () => {
  expect(faults(bosquePatagonico)).toEqual([]);
});
