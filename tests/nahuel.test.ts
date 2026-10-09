import { describe, expect, it } from 'vitest';
import { NAHUEL, NahuelBrain, type Prey } from '../src/nahuel/brain';

const DT = 1 / 60;
const her = { x: 500, y: 400 };
const foe = (x: number, y: number): Prey => ({ x, y, girth: 8, alive: true });
// Steps it for so long; returns everything its claws came down on.
function run(b: NahuelBrain, seconds: number, prey: Prey[], kill = false): Prey[] {
  const torn: Prey[] = [];
  for (let t = 0; t < seconds; t += DT) {
    const hit = b.update(DT, prey, her);
    if (hit) { torn.push(hit); if (kill) hit.alive = false; }
  }
  return torn;
}

describe('the nahuel', () => {
  it('is not there until it is called', () => {
    const b = new NahuelBrain();
    expect(b.present).toBe(false);
    expect(b.update(DT, [foe(520, 400)], her)).toBeNull();
    expect(b.lures({ x: 0, y: 0 }, her)).toBe(false);
  });

  it('comes out of the light, runs down the nearest enemy and tears at it', () => {
    const b = new NahuelBrain();
    const near = foe(600, 400), far = foe(200, 400);
    b.summon(her);
    expect(b.mode).toBe('appear');
    const torn = run(b, NAHUEL.appear + 2, [far, near]);
    expect(torn.length).toBeGreaterThan(0);
    expect(torn.every(p => p === near)).toBe(true);
    expect(b.faceX).toBe(1);
  });

  it('goes on to the next once one is dead', () => {
    const b = new NahuelBrain();
    const one = foe(580, 400), two = foe(380, 400);
    b.summon(her);
    const torn = run(b, 6, [one, two], true);
    expect(torn).toEqual([one, two]);
  });

  it('comes back to her heel when there is nothing left to hunt', () => {
    const b = new NahuelBrain();
    b.summon({ x: her.x + 300, y: her.y });
    run(b, 5, []);
    expect(b.mode).toBe('stand');
    expect(Math.abs(b.x - her.x)).toBeLessThanOrEqual(NAHUEL.heel + 1);
  });

  it('draws off the enemies it is nearer to than she is, and only those', () => {
    const b = new NahuelBrain();
    b.summon({ x: her.x + 200, y: her.y });
    run(b, NAHUEL.appear + 0.1, []);
    expect(b.lures({ x: b.x + 30, y: b.y }, her)).toBe(true);
    expect(b.lures({ x: her.x - 30, y: her.y }, her)).toBe(false);
  });

  it('stays its time, then fades and is gone', () => {
    const b = new NahuelBrain();
    b.summon(her, 3);
    run(b, 2.5, []);
    expect(b.present).toBe(true);
    expect(b.share(3)).toBeLessThan(0.3);
    run(b, 0.6 + NAHUEL.fade + 0.2, []);
    expect(b.present).toBe(false);
    expect(b.share(3)).toBe(0);
  });
});
