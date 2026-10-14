import { expect, test } from 'vitest';
import { CELL, Route } from '../src/world/route';

// A wall across the screen with a gap far to the right: the hero above it, someone below.
const wall = (x: number, y: number) => !(y > 200 && y < 240 && x < 600);
const cut = (_x: number, y: number) => !(y > 200 && y < 240);

test('it goes round what is in the way, not at it', () => {
  const route = new Route(wall);
  route.toward({ x: 300, y: 150 });
  const way = route.way({ x: 300, y: 300 })!;
  // Not up into the wall: off to the right, toward the gap.
  expect(way.x).toBeGreaterThan(0.5);
  expect(route.reaches({ x: 300, y: 300 })).toBe(true);
});

test('cut off, it says so', () => {
  const route = new Route(cut);
  route.toward({ x: 300, y: 150 });
  expect(route.reaches({ x: 300, y: 300 })).toBe(false);
});

test('beside the hero, it leaves the way to whoever is there', () => {
  const route = new Route(() => true);
  route.toward({ x: 300, y: 150 });
  expect(route.way({ x: 300 + CELL.w / 4, y: 150 })).toBeNull();
});
