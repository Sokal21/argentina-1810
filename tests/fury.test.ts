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
