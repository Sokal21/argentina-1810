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

test('everyone the map stands somewhere is someone the game knows, and stands where one can walk', async () => {
  const { PEOPLE } = await import('../src/npc/people');
  const { BYSTANDERS } = await import('../src/npc/bystanders');
  const stood = (map.people ?? []).map(p => p.who);
  expect(new Set(stood).size).toBe(stood.length);
  for (const who of stood) expect(PEOPLE[who] ?? BYSTANDERS[who], who).toBeDefined();
  // All four who can be talked to, and all of those who only say their one thing.
  for (const who of [...Object.keys(PEOPLE), ...Object.keys(BYSTANDERS)]) expect(stood, who).toContain(who);
  expect(faults(map)).toEqual([]);
});

test('whoever is drawn standing about has a sheet of whole frames, the size it says', async () => {
  const { PEOPLE } = await import('../src/npc/people');
  const { BYSTANDERS } = await import('../src/npc/bystanders');
  const { readFileSync } = await import('node:fs');
  for (const one of [...Object.values(PEOPLE), ...Object.values(BYSTANDERS)]) {
    expect(one.idle, one.name).toBeDefined();
    // A PNG says its width and height in the eight bytes after its sixteenth.
    const png = readFileSync(`assets/${one.idle!.sheet}`);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)], one.name).toEqual([one.idle!.size * one.idle!.frames, one.idle!.size]);
  }
});

test('each place where something can be done is on ground that is walked, and its fire is on its own rise', () => {
  const spots = map.spots ?? [];
  expect(spots.map(s => s.id).sort()).toEqual(['campana', 'carretas', 'emboscada', 'fogata_este', 'fogata_medio', 'fogata_oeste', 'rebato', 'vado']);
  const rise = { fogata_oeste: '1', fogata_medio: '2', fogata_este: '3' } as Record<string, string>;
  for (const spot of spots.filter(s => rise[s.id])) expect(letterAt(map, ...spot.plot), spot.id).toBe(rise[spot.id]);
  // Each rise is held: there is a guard to be beaten before anything is built on it.
  for (const letter of Object.values(rise)) expect(map.zones[letter].foes).toBeGreaterThan(0);
  expect(faults(map)).toEqual([]);
});

test('whatever is to be brought somewhere begins and ends on ground that is walked, and there is a way between', async () => {
  const { wayTo } = await import('../src/world/trail');
  for (const charge of map.charges ?? []) {
    expect(letterAt(map, ...charge.from), charge.id).toBeDefined();
    const zone = letterAt(map, ...charge.to)!;
    expect(wayTo(map, charge.from, zone).length, charge.id).toBeGreaterThan(1);
    // Slower than the hero walks, or there is nothing to it.
    expect(charge.pace).toBeLessThan(70);
  }
});
