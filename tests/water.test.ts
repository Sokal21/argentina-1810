import { expect, test } from 'vitest';
import { vadoDeLasVizcachas as vado } from '../src/world/maps/vado';
import { plantCountry } from '../src/world/plants';
import { DEEP, DRY, SHALLOW, waterLevels, WET } from '../src/world/water';
import { letterAt, PLOT_H, PLOT_W, type WorldMap } from '../src/world/zones';

const map: WorldMap = {
  name: 'Prueba',
  ground: ['#000'],
  zones: { A: { name: 'Campo', safe: true, edge: ['cardo'] }, V: { name: 'Vado', water: 'ford' }, M: { name: 'Bañado', water: 'marsh' } },
  plots: [
    'A.........',
    '..........',
    '....V.....',
    'A.........',
    '..........',
    '..........',
    '..........',
    '.......M..',
    'A.........',
  ],
  start: [0, 0],
  objectives: [],
  stream: [2, 2],
};

test('a stream is deep along its rows wherever nobody can cross, and its ford is shallow', () => {
  const levels = waterLevels(map);
  expect(levels[2][4]).toBe(SHALLOW);
  expect(levels[2][0]).toBe(DEEP);
  expect(levels[2][9]).toBe(DEEP);
});

test('a marsh is wet ground, and the ground nobody can cross beside it is deep water', () => {
  const levels = waterLevels(map);
  expect(levels[7][7]).toBe(WET);
  expect(levels[7][6]).toBe(DEEP);
  expect(levels[6][8]).toBe(DEEP);
});

test('dry ground is dry: what is walked, and what is far from any water', () => {
  const levels = waterLevels(map);
  expect(levels[0][0]).toBe(DRY);
  expect(levels[0][9]).toBe(DRY);
  expect(levels[8][0]).toBe(DRY);
});

test('only reeds grow in deep water', () => {
  const levels = waterLevels(vado);
  for (const p of plantCountry(vado)) {
    const level = levels[Math.floor(p.y / PLOT_H)][Math.floor(p.x / PLOT_W)];
    if (level === DEEP) expect(p.kind).toBe('junco');
  }
});

test("on Cabral's map the stream runs from side to side and the ford is the only way over it", () => {
  const levels = waterLevels(vado);
  const cols = vado.plots[0].length;
  for (const row of [9, 10]) {
    for (let col = 0; col < cols; col++) {
      const letter = letterAt(vado, col, row);
      expect(levels[row][col], `plot ${col},${row}`).toBe(letter === 'V' ? SHALLOW : DEEP);
    }
  }
});
