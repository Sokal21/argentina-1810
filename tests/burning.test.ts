import { describe, expect, it } from 'vitest';
import { Burning } from '../src/machi/burning';
import { GRENADE } from '../src/machi/grenade';

// Runs a fire for `seconds` in 60 steps a second; returns the hurt it did in all.
function burn(fire: Burning<string>, seconds: number, alive = true, each?: () => void): number {
  let total = 0;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    each?.();
    fire.update(1 / 60, () => alive, (_, __, hurt) => (total += hurt));
  }
  return total;
}

describe('something set alight', () => {
  it('is hurt again and again until it burns out', () => {
    const fire = new Burning<string>();
    fire.ignite('cube');
    const total = burn(fire, GRENADE.smoulder + 1);
    // The last scorch falls on the moment it goes out, and may or may not land.
    const most = Math.floor(GRENADE.smoulder / GRENADE.scorch) * GRENADE.burn;
    expect(total).toBeLessThanOrEqual(most);
    expect(total).toBeGreaterThanOrEqual(most - GRENADE.burn);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it('goes on being hurt for as long as it stands in the fire', () => {
    const fire = new Burning<string>();
    const total = burn(fire, GRENADE.burns, true, () => fire.ignite('cube'));
    const most = Math.floor(GRENADE.burns / GRENADE.scorch) * GRENADE.burn;
    expect(total).toBeLessThanOrEqual(most);
    expect(total).toBeGreaterThanOrEqual(most - GRENADE.burn);
  });

  it('stops smouldering once it has burned out', () => {
    const fire = new Burning<string>();
    fire.ignite('cube');
    burn(fire, GRENADE.smoulder + 0.1);
    let told = 0;
    fire.update(1, () => true, () => told++);
    expect(told).toBe(0);
  });

  it('is not hurt once it is dead', () => {
    const fire = new Burning<string>();
    fire.ignite('cube');
    expect(burn(fire, 2, false)).toBe(0);
  });
});
