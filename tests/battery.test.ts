import { describe, expect, it } from 'vitest';
import { ISO_Y } from '../src/machi/data';
import { inBlast, plan, SALVO } from '../src/tropa/battery';

describe("Roca's battery", () => {
  it('strews a scattered salvo about where it is aimed, each shell with its own mark, none over another, landing after its mark has shown a while', () => {
    const { marks, blasts } = plan('scattered', { x: 0, y: 0 });
    expect(marks.length).toBeGreaterThan(SALVO.scattered.shells - 3);
    expect(blasts.length).toBe(marks.length);
    for (const a of marks) for (const b of marks) if (a !== b) expect(Math.hypot(a.x - b.x, (a.y - b.y) / ISO_Y)).toBeGreaterThanOrEqual(a.r + b.r);
    for (const m of marks) {
      expect(Math.hypot(m.x, m.y / ISO_Y)).toBeLessThanOrEqual(SALVO.scattered.spread + 1e-6);
      expect(m.lands - m.shows).toBeCloseTo(SALVO.scattered.warn);
    }
  });

  it('marks a concentrated salvo once, wide, and ends it with a blast over all of it', () => {
    const { marks, blasts } = plan('concentrated', { x: 50, y: 20 });
    expect(marks).toHaveLength(1);
    expect(marks[0].r).toBe(SALVO.concentrated.radius);
    const last = blasts[blasts.length - 1];
    expect(last.r).toBe(SALVO.concentrated.radius);
    expect(inBlast(last, { x: 50 + SALVO.concentrated.radius - 1, y: 20 })).toBe(true);
    expect(blasts.every(b => b.at >= marks[0].lands)).toBe(true);
  });
});
