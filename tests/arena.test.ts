import { expect, test } from 'vitest';
import { ISO_Y } from '../src/machi/data';
import { ARENA_REACH, arenaDeRoca as map } from '../src/world/maps/arena';
import { faults, letterAt, PLOT_H, PLOT_W } from '../src/world/zones';

test('the clearing holds together, and she comes into it from somewhere safe', () => {
  expect(faults(map)).toEqual([]);
});

test('it is round, its edge wobbling a little, with nothing built in it', async () => {
  const { zoneAt, reachOf } = await import('../src/world/zones');
  const r = map.round!;
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const at = (d: number) => zoneAt(map, r.x + Math.cos(a) * d, r.y + Math.sin(a) * d * ISO_Y);
    const edge = reachOf(r, a);
    expect(at(edge - 10), `in at ${a.toFixed(1)}`).toBeDefined();
    expect(at(edge + 10), `out at ${a.toFixed(1)}`).toBeUndefined();
    expect(Math.abs(edge - ARENA_REACH)).toBeLessThanOrEqual(r.wobble!);
  }
  expect(map.buildings ?? []).toEqual([]);
  expect(letterAt(map, ...map.start)).toBe('E');
  expect(PLOT_W).toBe(128);
  expect(PLOT_H).toBe(64);
});

test('no tree stands where she can walk; the edge is marked by trees of every size along it, low ones along its south', async () => {
  const { plantTrees } = await import('../src/world/trees');
  const { zoneAt } = await import('../src/world/zones');
  const trees = plantTrees(map, 2), r = map.round!;
  expect(trees.filter(t => zoneAt(map, t.x, t.y))).toEqual([]);
  const { reachOf } = await import('../src/world/zones');
  const onEdge = trees.filter(t => { const dx = t.x - r.x, dy = (t.y - r.y) / ISO_Y; return Math.hypot(dx, dy) - reachOf(r, Math.atan2(dy, dx)) < 55; });
  expect(onEdge.length).toBeGreaterThan(60);
  // Of every size, grown ones among the young.
  expect(new Set(onEdge.map(t => t.kind)).size).toBe(2);
  expect(Math.max(...onEdge.map(t => t.size)) / Math.min(...onEdge.map(t => t.size))).toBeGreaterThan(3);
  const south = onEdge.filter(t => t.y > r.y + ARENA_REACH * ISO_Y * 0.5);
  expect(Math.max(...south.map(t => t.size))).toBeLessThan(1);
});

test('she comes in inside the clearing itself, at its south', () => {
  expect(map.zones[letterAt(map, ...map.start)!].open).toBe(true);
});
