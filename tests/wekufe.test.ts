import { describe, expect, it } from 'vitest';
import { WEKUFE, WekufeMind } from '../src/tropa/wekufe';

const anywhere = () => true;
const run = (mind: WekufeMind, her: { x: number; y: number }, seconds: number, seen: (m: WekufeMind, deed: ReturnType<WekufeMind['update']>) => void = () => {}) => {
  for (let t = 0; t < seconds; t += 1 / 60) seen(mind, mind.update(1 / 60, her));
};

describe('the Wekufe', () => {
  it('never does the same thing twice running', () => {
    const mind = new WekufeMind(0, 0, 165, anywhere);
    const did: string[] = [];
    let was = mind.state;
    run(mind, { x: 300, y: 0 }, 120, m => {
      if (m.state !== was && (m.state === 'dive' || m.state === 'throw' || m.state === 'invoke')) did.push(m.state);
      was = m.state;
    });
    expect(did.length).toBeGreaterThan(5);
    for (let i = 1; i < did.length; i++) expect(did[i]).not.toBe(did[i - 1]);
  });

  it('comes up beside her after diving, and his claws take from her if she stands', () => {
    const mind = new WekufeMind(0, 0, 165, anywhere, () => 0);
    const her = { x: 400, y: 0 };
    let clawed = 0, came = false;
    run(mind, her, 8, (m, deed) => {
      clawed += deed.clawed ?? 0;
      if (m.state === 'claw') { came = true; expect(Math.hypot(m.x - her.x, m.y - her.y)).toBeLessThanOrEqual(WEKUFE.dive.beside + 1); }
    });
    expect(came).toBe(true);
    expect(clawed).toBe(WEKUFE.claw.damage);
  });

  it('his souls hurt only within their ring', () => {
    const near = new WekufeMind(0, 0, 165, anywhere);
    near.state = 'invoke';
    let hurt = 0;
    run(near, { x: 100, y: 0 }, WEKUFE.invoke.time, (_, deed) => { hurt += deed.haunted ?? 0; });
    expect(hurt).toBeGreaterThan(0);
    const far = new WekufeMind(0, 0, 165, anywhere);
    far.state = 'invoke';
    hurt = 0;
    run(far, { x: 400, y: 0 }, WEKUFE.invoke.time, (_, deed) => { hurt += deed.haunted ?? 0; });
    expect(hurt).toBe(0);
  });

  it('does nothing more once dying', () => {
    const mind = new WekufeMind(0, 0, 165, anywhere);
    mind.die();
    run(mind, { x: 50, y: 0 }, 10, (m, deed) => { expect(m.state).toBe('dying'); expect(deed).toEqual({}); });
  });
});
