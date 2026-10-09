import { expect, test } from 'vitest';
import { vadoDeLasVizcachas as map } from '../src/world/maps/vado';
import { faults, letterAt } from '../src/world/zones';

// Plots walked on the shortest way between two plots, going only through
// what can be crossed and the zones allowed; Infinity if there is none.
function way(from: [number, number], to: [number, number], through?: string): number {
  const seen = new Map<string, number>([[from.join(), 0]]);
  const ahead: [number, number][] = [from];
  for (let plot = ahead.shift(); plot; plot = ahead.shift()) {
    const [col, row] = plot, steps = seen.get(plot.join())!;
    if (col === to[0] && row === to[1]) return steps;
    for (const next of [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]] as [number, number][]) {
      const letter = letterAt(map, ...next);
      if (letter === undefined || seen.has(next.join()) || (through && !through.includes(letter))) continue;
      seen.set(next.join(), steps + 1);
      ahead.push(next);
    }
  }
  return Infinity;
}
const place = (name: string) => map.objectives.find(o => o.name === name)!.plot;

test('the map holds together', () => {
  expect(faults(map)).toEqual([]);
});

test('it is a road and not a field: from the inn to the chapel is a long way', () => {
  const plots = way(map.start, place('La capilla'));
  expect(plots).toBeGreaterThan(110);
  expect(plots).toBeLessThan(170);
});

test('every stretch of the road has to be crossed: none can be gone round', () => {
  // Without the thistles, the battlefield, the wood or the track, there is no way through.
  for (const stretch of 'DBTS') {
    const rest = Object.keys(map.zones).filter(letter => letter !== stretch).join('');
    expect(way(map.start, place('La capilla'), rest)).toBe(Infinity);
  }
});

test('past the battlefield there are two ways to the wood: the marsh and the high road', () => {
  const without = (letter: string) => Object.keys(map.zones).filter(l => l !== letter).join('');
  expect(way(map.start, place('La capilla'), without('M'))).toBeLessThan(Infinity);
  expect(way(map.start, place('La capilla'), without('C'))).toBeLessThan(Infinity);
  // The marsh is the shorter of the two.
  expect(way(place('La bifurcación'), place('La tapera'), without('C')))
    .toBeLessThan(way(place('La bifurcación'), place('La tapera'), without('M')));
});

test('the ford is reached only by the road north from the battlefield', () => {
  expect(way(place('El cañón volcado'), place('El vado'))).toBeLessThan(45);
  expect(way(place('El cañón volcado'), place('El vado'), Object.keys(map.zones).filter(l => l !== '2').join(''))).toBe(Infinity);
});

test('everything built stands on ground that can be walked', () => {
  for (const { name, plot } of map.buildings ?? []) expect(letterAt(map, ...plot), name).toBeDefined();
});
