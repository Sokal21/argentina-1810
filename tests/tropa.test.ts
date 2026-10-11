import { describe, expect, it } from 'vitest';
import { DYING, KINDS, QUICKENED, TroopBrain, type Deed } from '../src/tropa/brain';

const DT = 0.02;
const run = (b: TroopBrain, her: { x: number; y: number } | null, seconds: number): Deed[] => {
  const deeds: Deed[] = [];
  for (let t = 0; t < seconds; t += DT) { const d = b.update(DT, her); if (d.shot || d.cut !== undefined || d.rally) deeds.push(d); }
  return deeds;
};
const brain = (kind: keyof typeof KINDS, x = 0) => new TroopBrain(KINDS[kind], x, 0, () => 0.5);

describe('the sabre fighter', () => {
  it('has no musket: he runs at whoever he sees, faster than a hero walks, and cuts', () => {
    const b = brain('sableador');
    const deeds = run(b, { x: 200, y: 0 }, 1.5);
    expect(b.x).toBeGreaterThan(100);
    expect(KINDS.sableador.pace).toBeGreaterThan(70);
    expect(deeds.every(d => !d.shot)).toBe(true);
    const more = run(b, { x: 200, y: 0 }, 2);
    expect(more.some(d => d.cut === true)).toBe(true);
  });

  it('cuts the air if whoever he was after has stepped away in time', () => {
    const b = brain('sableador');
    for (let t = 0; t < 5 && b.mode !== 'blow'; t += DT) b.update(DT, { x: 30, y: 0 });
    expect(b.mode).toBe('blow');
    expect(run(b, { x: 300, y: 0 }, 1).filter(d => d.cut !== undefined)).toEqual([{ cut: false }]);
  });
});

describe('the marksman', () => {
  it('never moves, and shoots from further than a fusilier can', () => {
    const b = brain('tirador');
    const deeds = run(b, { x: 400, y: 0 }, 6);
    expect([b.x, b.y]).toEqual([0, 0]);
    expect(deeds.filter(d => d.shot).length).toBeGreaterThanOrEqual(2);
    expect(KINDS.tirador.shot.range).toBeGreaterThan(190);
  });

  it('has nothing to meet anyone with up close, and is not pushed off his post by a blow', () => {
    const b = brain('tirador');
    expect(run(b, { x: 10, y: 0 }, 3).some(d => d.cut !== undefined)).toBe(false);
    b.hit(1, 0);
    expect(b.x).toBe(0);
    b.hit(1, 0);
    expect(b.alive).toBe(false);
  });
});

describe('the sergeant', () => {
  it('shouts now and again, and whoever is quickened by it walks and reloads faster for a while', () => {
    const b = brain('sargento');
    const deeds = run(b, { x: 250, y: 0 }, 8);
    const rally = deeds.find(d => d.rally)?.rally;
    expect(rally).toEqual({ reach: KINDS.sargento.rally.reach, lasts: KINDS.sargento.rally.lasts });
    const plain = brain('sableador'), quick = brain('sableador');
    quick.hurry(5);
    run(plain, { x: 2000, y: 0 }, 1); run(quick, { x: 2000, y: 0 }, 1);
    plain.relentless = quick.relentless = true;
    const p0 = plain.x, q0 = quick.x;
    run(plain, { x: 2000, y: 0 }, 1); run(quick, { x: 2000, y: 0 }, 1);
    expect((quick.x - q0) / (plain.x - p0)).toBeCloseTo(QUICKENED, 1);
  });

  it('takes a great deal more to bring down than his men', () => {
    expect(KINDS.sargento.life).toBeGreaterThanOrEqual(2 * 4);
  });
});

describe('the captain', () => {
  it('fires his pistol from afar and thrusts up close', () => {
    expect(run(brain('capitan'), { x: 200, y: 0 }, 3).some(d => d.shot)).toBe(true);
    expect(run(brain('capitan'), { x: 30, y: 0 }, 2).some(d => d.cut === true)).toBe(true);
  });

  it('comes on faster once he has lost half his life', () => {
    const whole = brain('capitan'), hurt = brain('capitan');
    for (let n = 0; n < 8; n++) hurt.hit(0, 1);
    whole.relentless = hurt.relentless = true;
    const w0 = whole.x, h0 = hurt.x;
    run(whole, { x: 3000, y: 0 }, 1); run(hurt, { x: 3000, y: 0 }, 1);
    expect((hurt.x - h0) / (whole.x - w0)).toBeCloseTo(KINDS.capitan.fury, 1);
  });
});

describe('any of them', () => {
  it('falls when it has taken all it can, and one who holds a post stays down until called back', () => {
    const b = brain('sableador');
    b.returns = false;
    for (let n = 0; n < KINDS.sableador.life; n++) b.hit(1, 0);
    run(b, null, DYING + 20);
    expect(b.alive).toBe(false);
    b.revive();
    expect([b.alive, b.life, b.x]).toEqual([true, KINDS.sableador.life, 0]);
  });

  it('keeps to the ground it is given', () => {
    const b = brain('sableador');
    b.ground = x => x < 50;
    run(b, { x: 300, y: 0 }, 4);
    expect(b.x).toBeLessThan(50);
  });
});

describe('how each kind is drawn', () => {
  it('has a sheet of whole frames, the size it says, for everything the kind does', async () => {
    const { LOOKS } = await import('../src/tropa/looks');
    const { readFileSync } = await import('node:fs');
    for (const [kind, look] of Object.entries(LOOKS)) {
      const k = KINDS[kind as keyof typeof KINDS] as { pace: number; shot?: unknown; blow?: unknown; rally?: unknown };
      expect(!!look.walk, `${kind} walks`).toBe(k.pace > 0);
      expect(!!look.aim, `${kind} shoots`).toBe(!!k.shot);
      expect(!!look.blow, `${kind} strikes`).toBe(!!k.blow);
      expect(!!look.rally, `${kind} rallies`).toBe(!!k.rally);
      for (const s of [look.walk, look.aim, look.blow, look.rally, look.death]) {
        if (!s) continue;
        const png = readFileSync(`assets/${s.src}`);
        expect([png.readUInt32BE(16), png.readUInt32BE(20)], s.src).toEqual([s.size * s.frames, s.size]);
      }
    }
  });
});
