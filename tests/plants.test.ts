import { expect, test } from 'vitest';
import { vadoDeLasVizcachas as map } from '../src/world/maps/vado';
import { DEPTH, plantCountry } from '../src/world/plants';
import { PLOT_H, PLOT_W, zoneAt, type WorldMap } from '../src/world/zones';

const small: WorldMap = {
  name: 'Prueba',
  ground: ['#000'],
  zones: { A: { name: 'Cardal', safe: true, edge: ['cardo'] }, B: { name: 'Bañado', edge: ['junco'], scatter: { junco: 1 } } },
  plots: [
    '..........',
    '..........',
    '.....A....',
    '..........',
    '..........',
    '..........',
    '.....B....',
    '..........',
  ],
  start: [5, 2],
  objectives: [],
};

test('the same map is planted the same way every time', () => {
  expect(plantCountry(map)).toEqual(plantCountry(map));
});

test('a zone is closed in by its own plants, on ground nobody can cross', () => {
  const round = plantCountry(small).filter(p => !p.inTheWay);
  expect(round.length).toBeGreaterThan(20);
  for (const p of round) {
    expect(zoneAt(small, p.x, p.y)).toBeUndefined();
    // Hard by the first zone it is thistle, hard by the second it is reed.
    const row = p.y / PLOT_H;
    if (row < 2) expect(p.kind).toBe('cardo');
    if (row >= 7) expect(p.kind).toBe('junco');
  }
});

test('what is scattered stands on the zone\'s own ground and is in the way', () => {
  const within = plantCountry(small).filter(p => p.inTheWay);
  expect(within.map(p => p.kind)).toEqual(['junco']);
  expect(zoneAt(small, within[0].x, within[0].y)?.name).toBe('Bañado');
});

test('the thicket thins out and stops: nothing is planted far from the road', () => {
  const wide: WorldMap = { ...small, plots: ['A' + '.'.repeat(DEPTH + 6)] };
  const reach = Math.max(...plantCountry(wide).map(p => p.x));
  expect(reach).toBeLessThan((DEPTH + 1) * PLOT_W);
  expect(reach).toBeGreaterThan(DEPTH * PLOT_W);
});

test('no two plants are quite alike in size', () => {
  const sizes = new Set(plantCountry(map).map(p => p.size.toFixed(3)));
  expect(sizes.size).toBeGreaterThan(100);
});

test("Cabral's map is planted with every kind it names, and the thistles are where the thistle maze is", () => {
  const all = plantCountry(map);
  const kinds = new Set(all.map(p => p.kind));
  expect([...kinds].sort()).toEqual(['cardo', 'cortadera', 'junco', 'maiz', 'ombu', 'tala', 'tuna']);
  expect(all.length).toBeGreaterThan(3000);
  expect(all.length).toBeLessThan(14000);
});

test('behind a fence the country is thin: the fence closes the zone, not the thicket', () => {
  const open: WorldMap = { name: 'Prueba', ground: ['#000'], zones: { P: { name: 'Pueblo', edge: ['cortadera'] } }, plots: Array.from({ length: 12 }, (_, r) => r > 3 && r < 8 ? '.....PPPPPP.....' : '................'), start: [6, 5], objectives: [] };
  const fenced: WorldMap = { ...open, zones: { P: { ...open.zones.P, fence: 'stakes' } } };
  expect(plantCountry(fenced).length).toBeLessThan(plantCountry(open).length / 4);
  expect(plantCountry(fenced).length).toBeGreaterThan(0);
});

test('the ombú stands at the place named after it, alone of its kind and in the way', () => {
  const ombues = plantCountry(map).filter(p => p.kind === 'ombu');
  expect(ombues).toHaveLength(1);
  expect(ombues[0].inTheWay).toBe(true);
  expect(zoneAt(map, ombues[0].x, ombues[0].y)?.name).toBe('Las chacras');
});
