import { expect, test } from 'vitest';
import { vadoDeLasVizcachas as vado } from '../src/world/maps/vado';
import { trail, wayTo } from '../src/world/trail';
import { letterAt, PLOT_H, PLOT_W, zoneAt } from '../src/world/zones';

test('a way goes from a plot to the nearest of a zone, a plot at a time, over ground that is walked', () => {
  const way = wayTo(vado, [59, 37], 'S');
  expect(way[0]).toEqual([59, 37]);
  expect(letterAt(vado, ...way[way.length - 1])).toBe('S');
  for (let i = 1; i < way.length; i++) {
    expect(Math.abs(way[i][0] - way[i - 1][0]) + Math.abs(way[i][1] - way[i - 1][1])).toBe(1);
    expect(letterAt(vado, ...way[i])).toBeDefined();
  }
});

test('there is no way to a zone the map does not have', () => {
  expect(wayTo(vado, [59, 37], 'Z')).toEqual([]);
  expect(trail(vado, [59, 37], 'Z')).toEqual([]);
});

test("the blood from the boy's poncho leads east to the path, every mark where it can be walked", () => {
  const marks = trail(vado, [59, 37], 'S');
  expect(marks.length).toBeGreaterThan(40);
  for (const mark of marks) expect(zoneAt(vado, mark.x, mark.y)).toBeDefined();
  // It begins by the poncho and ends at the foot of the path, further east.
  expect(Math.abs(marks[0].x - 59.5 * PLOT_W)).toBeLessThan(2 * PLOT_W);
  expect(Math.abs(marks[0].y - 37.5 * PLOT_H)).toBeLessThan(2 * PLOT_H);
  const last = marks[marks.length - 1];
  expect(last.x).toBeGreaterThan(marks[0].x + 20 * PLOT_W);
  expect(trail(vado, [59, 37], 'S')).toEqual(marks);
});

test("what lies about Cabral's map lies where it can be reached, and is something the story knows", async () => {
  const { THINGS } = await import('../src/story/things');
  for (const { what, plot } of vado.things ?? []) {
    expect(THINGS[what], what).toBeDefined();
    expect(letterAt(vado, ...plot), what).toBeDefined();
  }
});
