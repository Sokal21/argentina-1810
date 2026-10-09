import { describe, expect, it } from 'vitest';
import { Abilities, ground, HEAL, MANA, REGEN, STRIKE } from '../src/machi/abilities';

const DT = 1 / 60;
const at = { x: 500, y: 400 };
const idle = { strike: false, heal: false, pointer: { x: 540, y: 400 }, at, free: true, hurt: true };
// Runs it for some seconds and gathers what happened.
function run(a: Abilities, seconds: number, input = idle) {
  const all = { struck: [] as { x: number; y: number }[], healing: false, healed: false };
  for (let t = 0; t < seconds; t += DT) {
    const e = a.update(DT, input);
    all.struck.push(...e.struck);
    all.healing ||= e.healing;
    all.healed ||= e.healed;
  }
  return all;
}

describe('lightning strike', () => {
  it('shows where it would fall while the key is held, and costs nothing yet', () => {
    const a = new Abilities();
    a.update(DT, { ...idle, strike: true });
    expect(a.aim).toEqual(idle.pointer);
    expect(a.mana).toBe(MANA);
    expect(a.pending).toHaveLength(0);
  });

  it('keeps the patch within range of her', () => {
    const a = new Abilities();
    a.update(DT, { ...idle, strike: true, pointer: { x: 500 + 1000, y: 400 } });
    expect(ground(at, a.aim!)).toBeCloseTo(STRIKE.range);
    a.update(DT, { ...idle, strike: true, pointer: { x: 500, y: 400 - 1000 } });
    expect(ground(at, a.aim!)).toBeCloseTo(STRIKE.range);
    expect(at.y - a.aim!.y).toBeCloseTo(STRIKE.range / 2); // half as far up the screen
  });

  it('is cast on release, and the bolt falls there after the delay', () => {
    const a = new Abilities();
    a.update(DT, { ...idle, strike: true });
    a.update(DT, idle);
    expect(a.pending).toHaveLength(1);
    expect(a.mana).toBeCloseTo(MANA - STRIKE.cost, 0);
    expect(run(a, STRIKE.delay - 0.1).struck).toHaveLength(0);
    expect(run(a, 0.2).struck).toEqual([idle.pointer]);
    expect(a.pending).toHaveLength(0);
  });

  it('cannot be cast again until its cooldown is over', () => {
    const a = new Abilities();
    a.update(DT, { ...idle, strike: true });
    a.update(DT, idle);
    expect(a.ready('strike')).toBe(false);
    a.update(DT, { ...idle, strike: true });
    a.update(DT, idle);
    expect(a.pending).toHaveLength(1);
    run(a, STRIKE.cooldown);
    expect(a.ready('strike')).toBe(true);
    expect(a.cooldown('strike')).toBe(0);
  });

  it('cannot be cast without the mana for it', () => {
    const a = new Abilities();
    a.mana = STRIKE.cost - 5;
    a.update(DT, { ...idle, strike: true });
    expect(a.aim).not.toBeNull();
    a.update(DT, idle);
    expect(a.pending).toHaveLength(0);
  });
});

describe('healing', () => {
  it('heals once the ritual is finished', () => {
    const a = new Abilities();
    expect(a.update(DT, { ...idle, heal: true }).healing).toBe(true);
    expect(a.isHealing).toBe(true);
    expect(run(a, HEAL.time - 0.1).healed).toBe(false);
    expect(run(a, 0.2).healed).toBe(true);
    expect(a.isHealing).toBe(false);
  });

  it('is broken by a hit, and the mana is gone all the same', () => {
    const a = new Abilities();
    a.update(DT, { ...idle, heal: true });
    run(a, HEAL.time / 2);
    expect(a.interrupt()).toBe(true);
    expect(run(a, HEAL.time).healed).toBe(false);
    expect(a.mana).toBeLessThan(MANA - HEAL.cost + REGEN * 2);
    expect(a.ready('heal')).toBe(false);
  });

  it('does not start when she is unhurt, mid-dash or short of mana', () => {
    const a = new Abilities();
    expect(a.update(DT, { ...idle, heal: true, hurt: false }).healing).toBe(false);
    expect(a.update(DT, { ...idle, heal: true, free: false }).healing).toBe(false);
    a.mana = HEAL.cost - 1;
    expect(a.update(DT, { ...idle, heal: true }).healing).toBe(false);
    expect(a.mana).toBeLessThan(HEAL.cost);
  });

  it('blocks the strike while it lasts', () => {
    const a = new Abilities();
    a.update(DT, { ...idle, heal: true });
    a.update(DT, { ...idle, strike: true });
    a.update(DT, idle);
    expect(a.pending).toHaveLength(0);
  });
});

describe('mana', () => {
  it('comes back on its own, up to full', () => {
    const a = new Abilities();
    a.mana = 0;
    run(a, 2);
    expect(a.mana).toBeCloseTo(REGEN * 2, 0);
    run(a, MANA / REGEN);
    expect(a.mana).toBe(MANA);
  });
});
