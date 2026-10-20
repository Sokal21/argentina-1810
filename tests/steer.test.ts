import { describe, expect, it } from 'vitest';
import { MachiController, STEER } from '../src/machi/controller';
import { ISO_Y, KITS } from '../src/machi/data';

// Steered by the pointer (the 3D game): he faces it and walks whichever way the keys say.
const walk = (dx: number, dy: number, steer = { x: 1, y: 0 }) => {
  const c = new MachiController(undefined, KITS.cabral);
  c.steer = steer;
  c.update(1, { dx, dy, attack: false });
  return c;
};

describe('steered walking', () => {
  // Looking right: up is toward the pointer, down away from it, and right is his right (down the screen).
  const ahead = walk(0, -1).x;
  it('goes toward the pointer on up, at his full speed, facing it', () => {
    const c = walk(0, -1);
    expect(c.x).toBeGreaterThan(0);
    expect(c.y).toBeCloseTo(0);
    expect(c.faces.x).toBeGreaterThan(0);
  });
  it('goes away from it on down, slower, still facing it', () => {
    const c = walk(0, 1);
    expect(c.x).toBeCloseTo(-ahead * STEER.back);
    expect(c.faces.x).toBeGreaterThan(0);
    expect(c.isMoving).toBe(true);
  });
  it('goes square to it on the sides, at the side share: right is his right', () => {
    const c = walk(1, 0);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(ahead * STEER.side * ISO_Y);
  });
  it('takes the keys along whatever line the pointer is on', () => {
    const c = walk(0, -1, { x: 0, y: 1 });
    expect(c.y).toBeGreaterThan(0);
    expect(c.x).toBeCloseTo(0);
  });
  it('rolls the way he walks, and the way he looks when standing', () => {
    const c = new MachiController(undefined, KITS.cabral);
    c.steer = { x: 0, y: -1 };
    c.update(0.01, { dx: 0, dy: 0, attack: false, dash: true });
    expect(c.isDashing).toBe(true);
    c.update(2, { dx: 0, dy: 0, attack: false });
    expect(c.y).toBeLessThan(0);
  });
});
