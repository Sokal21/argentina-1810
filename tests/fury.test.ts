import { describe, expect, it } from 'vitest';
import { BLOW, CALM, EBB, FURY, Fury, WOUND } from '../src/machi/fury';

const DT = 1 / 60;
const wait = (f: Fury, seconds: number) => { for (let t = 0; t < seconds; t += DT) f.update(DT); };

describe('fury', () => {
  it('starts empty and is earned by landing blows and by taking them', () => {
    const f = new Fury();
    expect(f.value).toBe(0);
    f.gain(BLOW);
    f.gain(WOUND);
    expect(f.value).toBe(BLOW + WOUND);
  });

  it('holds no more than its fill', () => {
    const f = new Fury();
    for (let i = 0; i < 20; i++) f.gain(WOUND);
    expect(f.value).toBe(FURY);
  });

  it('keeps while he fights, and ebbs away once he has been left alone a while', () => {
    const f = new Fury();
    f.gain(50);
    wait(f, CALM - 0.1);
    expect(f.value).toBe(50);
    wait(f, 1.1);
    expect(f.value).toBeCloseTo(50 - EBB, 0);
    f.gain(BLOW);
    const held = f.value;
    wait(f, CALM - 0.1);
    expect(f.value).toBe(held);
    wait(f, 20);
    expect(f.value).toBe(0);
  });

  it('pays for an ability only when there is enough', () => {
    const f = new Fury();
    f.gain(30);
    expect(f.spend(40)).toBe(false);
    expect(f.value).toBe(30);
    expect(f.spend(30)).toBe(true);
    expect(f.value).toBe(0);
  });

  it('is lost when he falls', () => {
    const f = new Fury();
    f.gain(60);
    f.reset();
    expect(f.value).toBe(0);
  });
});

import { Charge, ULTIMATE } from '../src/machi/ultimate';

describe('what fury has no room for', () => {
  it('is handed back, and only once it is full', () => {
    const fury = new Fury();
    expect(fury.gain(FURY - 5)).toBe(0);
    expect(fury.gain(12)).toBe(7);
    expect(fury.value).toBe(FURY);
    expect(fury.gain(12)).toBe(12);
  });
});

describe('the charge of a greatest power', () => {
  it('fills, stops at full and is let go all at once', () => {
    const charge = new Charge();
    expect(charge.spend()).toBe(false);
    charge.add(ULTIMATE * 0.6);
    expect(charge.ready).toBe(false);
    charge.add(ULTIMATE);
    expect(charge.value).toBe(ULTIMATE);
    expect(charge.spend()).toBe(true);
    expect(charge.value).toBe(0);
  });

  it('never goes down by being given less than nothing', () => {
    const charge = new Charge();
    charge.add(30);
    charge.add(-10);
    expect(charge.value).toBe(30);
  });
});
