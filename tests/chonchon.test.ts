import { describe, expect, it } from 'vitest';
import {
  BITE_SNAP, BITE_TIME, ChonchonBrain, DYING, HOVER, LIFE, NEAR, RECOVER, RESPAWN, RING, WAIT, WINDUP,
} from '../src/chonchon/brain';
import { ISO_Y } from '../src/machi/data';

const DT = 1 / 60;
const her = { x: 500, y: 400 };
// Ground distance between it and a point.
const gap = (b: ChonchonBrain, p = her) => Math.hypot(p.x - b.x, (p.y - b.y) / ISO_Y);
// Steps it until it is in a mode, and reports whether it bit on the way.
function until(b: ChonchonBrain, mode: string, target: typeof her | null = her, limit = 20): boolean {
  let bitten = false;
  for (let t = 0; b.mode !== mode; t += DT) {
    if (t > limit) throw new Error(`never reached ${mode}, stuck in ${b.mode}`);
    bitten = b.update(DT, target) || bitten;
  }
  return bitten;
}
const fixed = (v: number) => () => v;

describe('chonchón', () => {
  it('closes to its ring around her and circles there', () => {
    const b = new ChonchonBrain(her.x + 300, her.y, undefined, fixed(0.99));
    for (let t = 0; t < WAIT[1] - 0.1; t += DT) b.update(DT, her);
    expect(b.mode).toBe('fly');
    const before = gap(b);
    expect(before).toBeLessThan(300);
    const far = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0.99));
    const start = { x: far.x, y: far.y };
    for (let t = 0; t < 1; t += DT) far.update(DT, her);
    expect(Math.abs(gap(far) - RING)).toBeLessThan(12);
    expect(Math.hypot(far.x - start.x, far.y - start.y)).toBeGreaterThan(10);
  });

  it('dives from a distance, after a warning, and catches her if she stays put', () => {
    const b = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0));
    until(b, 'windup');
    expect(gap(b)).toBeGreaterThan(NEAR);
    const at = { x: b.x, y: b.y };
    for (let t = 0; t < WINDUP - 2 * DT; t += DT) b.update(DT, her);
    expect(b.mode).toBe('windup');
    expect({ x: b.x, y: b.y }).toEqual(at);
    until(b, 'dive');
    expect(until(b, 'recover')).toBe(true);
    expect(b.z).toBeLessThan(HOVER);
  });

  it('misses if she has moved off its line, and only bites once per dive', () => {
    const b = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0));
    until(b, 'dive');
    const aside = { x: her.x, y: her.y + 40 };
    expect(until(b, 'recover', aside)).toBe(false);

    const c = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0));
    until(c, 'dive');
    let bites = 0;
    while (c.mode === 'dive') if (c.update(DT, { x: c.x, y: c.y })) bites++;
    expect(bites).toBe(1);
  });

  it('is slow and low after a dive, then climbs back and circles again', () => {
    const b = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0));
    until(b, 'recover');
    const low = b.z;
    for (let t = 0; t < RECOVER / 2; t += DT) b.update(DT, her);
    expect(b.mode).toBe('recover');
    expect(b.z).toBeGreaterThan(low);
    until(b, 'fly');
    expect(b.z).toBe(HOVER);
  });

  it('bites instead of diving when she is close', () => {
    const b = new ChonchonBrain(her.x + NEAR - 10, her.y, undefined, fixed(0));
    const close = () => ({ x: b.x - (NEAR - 10), y: b.y }); // she stays right by it
    let mode = b.mode;
    for (let t = 0; t < 5 && mode === 'fly'; t += DT) { b.update(DT, close()); mode = b.mode; }
    expect(mode).toBe('bite');
    let bitten = false, when = 0;
    while (b.mode === 'bite') {
      if (b.update(DT, close())) { bitten = true; when = b.t; }
    }
    expect(bitten).toBe(true);
    expect(when).toBeGreaterThanOrEqual(BITE_SNAP);
    expect(when).toBeLessThan(BITE_TIME);
  });

  it('snaps at nothing if she has stepped back out of reach', () => {
    const b = new ChonchonBrain(her.x + NEAR - 10, her.y, undefined, fixed(0));
    let mode = b.mode;
    for (let t = 0; t < 5 && mode === 'fly'; t += DT) {
      b.update(DT, { x: b.x - (NEAR - 10), y: b.y });
      mode = b.mode;
    }
    let bitten = false;
    while (b.mode === 'bite') bitten = b.update(DT, { x: b.x - 80, y: b.y }) || bitten;
    expect(bitten).toBe(false);
  });

  it('leaves her alone when there is no one to attack', () => {
    const b = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0));
    for (let t = 0; t < 6; t += DT) expect(b.update(DT, null)).toBe(false);
    expect(b.mode).toBe('fly');
  });

  it('falls after enough hits, cannot be hit again, and comes back', () => {
    const b = new ChonchonBrain(her.x + RING, her.y, undefined, fixed(0));
    for (let i = 0; i < LIFE - 1; i++) b.hit(1, 0);
    expect(b.alive).toBe(true);
    b.hit(1, 0);
    expect(b.alive).toBe(false);
    expect(b.mode).toBe('dying');
    b.hit(1, 0);
    expect(b.life).toBe(0);
    for (let t = 0; t < DYING + DT; t += DT) expect(b.update(DT, her)).toBe(false);
    expect(b.mode).toBe('gone');
    for (let t = 0; t < RESPAWN + DT; t += DT) b.update(DT, her);
    expect(b.alive).toBe(true);
    expect(b.life).toBe(LIFE);
    // Back where it started, give or take the step or two it has flown since.
    expect(Math.hypot(b.x - (her.x + RING), b.y - her.y)).toBeLessThan(3);
  });

  it('faces her, and shows its back when she is up the screen', () => {
    const b = new ChonchonBrain(her.x + RING, her.y + 60, undefined, fixed(0.99));
    b.update(DT, her);
    expect(b.faceX).toBe(-1);
    expect(b.back).toBe(true);
    const c = new ChonchonBrain(her.x - RING, her.y - 60, undefined, fixed(0.99));
    c.update(DT, her);
    expect(c.faceX).toBe(1);
    expect(c.back).toBe(false);
  });

  it('stays inside the world', () => {
    const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 800 };
    const b = new ChonchonBrain(990, 400, bounds, fixed(0));
    until(b, 'recover', { x: 995, y: 400 });
    expect(b.x).toBeLessThanOrEqual(1000);
  });
});
