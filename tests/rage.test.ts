import { describe, expect, it } from 'vitest';
import { RAGE, Rage } from '../src/machi/rage';
import { Vitals } from '../src/world/vitals';

const DT = 1 / 60;

describe("Cabral's rage", () => {
  it('lasts its time and then is over', () => {
    const rage = new Rage();
    expect(rage.active).toBe(false);
    rage.start();
    for (let t = 0; t < RAGE.time - 0.1; t += DT) rage.update(DT);
    expect(rage.active).toBe(true);
    for (let t = 0; t < 0.2; t += DT) rage.update(DT);
    expect(rage.active).toBe(false);
    expect(rage.update(DT)).toBe(0);
  });

  it('scorches what is near him every so often for as long as it lasts', () => {
    const rage = new Rage();
    rage.start();
    let hurt = 0;
    for (let t = 0; t < RAGE.time + 1; t += DT) hurt += rage.update(DT);
    const most = Math.floor(RAGE.time / RAGE.scorch) * RAGE.burn;
    expect(hurt).toBeLessThanOrEqual(most);
    expect(hurt).toBeGreaterThanOrEqual(most - RAGE.burn);
  });

  it('can be made to last as long as is asked, and says how much is left', () => {
    const rage = new Rage();
    rage.start(4);
    expect(rage.share(4)).toBe(1);
    for (let t = 0; t < 2; t += DT) rage.update(DT);
    expect(rage.share(4)).toBeCloseTo(0.5, 1);
  });
});

describe('one who cannot be killed', () => {
  it('feels every hit but keeps the last of their life', () => {
    const vitals = new Vitals(3, 0, 1);
    expect(vitals.hit(true)).toBe(true);
    expect(vitals.hit(true)).toBe(true);
    expect(vitals.life).toBe(1);
    expect(vitals.hit(true)).toBe(true);
    expect(vitals.life).toBe(1);
    expect(vitals.standing).toBe(true);
  });

  it('falls like anyone else once that is over', () => {
    const vitals = new Vitals(3, 0, 1);
    vitals.hit(true); vitals.hit(true); vitals.hit(true);
    expect(vitals.hit()).toBe(true);
    expect(vitals.standing).toBe(false);
  });
});
