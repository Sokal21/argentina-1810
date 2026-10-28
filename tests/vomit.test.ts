import { describe, expect, it } from 'vitest';
import { ISO_Y } from '../src/machi/data';
import { inPool, Plague, PLAGUE, VOMIT, type Pool } from '../src/tropa/vomit';
import { KINDS } from '../src/tropa/brain';

const tall = KINDS.apestado.retch.tall;
// Retched facing down the screen (+y), from the origin, once it has all spread.
const pool = (t = VOMIT.to + 1): Pool => ({ x: 0, y: 0, dx: 0, dy: 1, tall, t });
const ahead = (d: number, across = 0) => ({ x: across, y: d * ISO_Y });

describe("the plague-dead soldier's pool", () => {
  it('lies before him, from a little off to well beyond, not at his feet nor behind him', () => {
    expect(inPool(pool(), ahead(tall * 0.2))).toBe(false);
    expect(inPool(pool(), ahead(tall * 1.2))).toBe(true);
    expect(inPool(pool(), ahead(tall * 2.2))).toBe(true);
    expect(inPool(pool(), ahead(tall * 2.6))).toBe(false);
    expect(inPool(pool(), ahead(-tall))).toBe(false);
  });

  it('is wider far off than near, and nothing to either side of it', () => {
    const near = tall * (VOMIT.near + 0.25), far = tall * (VOMIT.near + 1.3);
    expect(inPool(pool(), ahead(near, tall * 0.5))).toBe(false);
    expect(inPool(pool(), ahead(far, tall * 0.5))).toBe(true);
    expect(inPool(pool(), ahead(far, tall * 1.5))).toBe(false);
  });

  it('is not there before the spray comes down, and is gone once it has dried', () => {
    expect(inPool(pool(0.2), ahead(tall))).toBe(false);
    expect(inPool(pool(VOMIT.to + VOMIT.lies + VOMIT.dries), ahead(tall))).toBe(false);
  });
});

describe('the plague', () => {
  const run = (p: Plague, seconds: number) => { let taken = 0; for (let t = 0; t < seconds; t += 0.02) taken += p.update(0.02); return taken; };

  it('drains its whole amount little by little over its time, then no more', () => {
    const p = new Plague();
    p.catch();
    expect(run(p, PLAGUE.lasts / 2)).toBeCloseTo(PLAGUE.damage / 2, 2);
    expect(run(p, PLAGUE.lasts)).toBeCloseTo(PLAGUE.damage / 2, 2);
    expect(p.on).toBe(false);
  });

  it('starts over if she steps in again, rather than adding up', () => {
    const p = new Plague();
    p.catch();
    run(p, PLAGUE.lasts - 1);
    p.catch();
    expect(p.left).toBe(PLAGUE.lasts);
  });

  it('is gone once she is cured', () => {
    const p = new Plague();
    p.catch();
    p.cure();
    expect(run(p, PLAGUE.lasts)).toBe(0);
  });
});
