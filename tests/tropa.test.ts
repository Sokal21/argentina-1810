import { describe, expect, it } from 'vitest';
import { DYING, KINDS, QUICKENED, TroopBrain, type Deed } from '../src/tropa/brain';

const DT = 0.02;
const run = (b: TroopBrain, her: { x: number; y: number } | null, seconds: number): Deed[] => {
  const deeds: Deed[] = [];
  for (let t = 0; t < seconds; t += DT) { const d = b.update(DT, her); if (d.shot || d.cut !== undefined || d.rally || d.call) deeds.push(d); }
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
    // Both cuts of his combo fall on nobody.
    expect(run(b, { x: 300, y: 0 }, 2).filter(d => d.cut !== undefined)).toEqual([{ cut: false }, { cut: false }]);
  });

  it('catches whoever walks away from his blow, not whoever runs', () => {
    const walked = (speed: number) => {
      const b = brain('sableador');
      const her = { x: 40, y: 0 };
      for (let t = 0; t < 5 && b.mode !== 'blow'; t += DT) b.update(DT, her);
      let cuts = 0;
      for (let t = 0; t < 2; t += DT) { her.x += speed * DT; if (b.update(DT, her).cut) cuts++; }
      return cuts;
    };
    // A hero walks at 126 in 3D, and runs at 1.6 times that.
    expect(walked(126)).toBeGreaterThan(0);
    expect(walked(126 * 1.6)).toBe(0);
  });

  it('cuts twice in a blow, the second nearer', () => {
    const b = brain('sableador');
    for (let t = 0; t < 5 && b.mode !== 'blow'; t += DT) b.update(DT, { x: 30, y: 0 });
    expect(run(b, { x: 30, y: 0 }, 2).filter(d => d.cut !== undefined)).toEqual([{ cut: true }, { cut: true }]);
    expect(KINDS.sableador.blow.again.reach).toBeLessThan(KINDS.sableador.blow.reach);
  });
});

describe('the marksman', () => {
  it('walks up until she is within his shot, then stays there and shoots from further than a fusilier can', () => {
    const far = brain('tirador');
    run(far, { x: 455, y: 0 }, 2);
    expect(far.x).toBeGreaterThan(0);
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

  it('stands while he lowers his pistol after a shot, then comes on again', () => {
    const b = brain('capitan');
    b.relentless = true;
    for (let t = 0; t < 5 && b.mode !== 'aim'; t += DT) b.update(DT, { x: 200, y: 0 });
    const shot = run(b, { x: 200, y: 0 }, KINDS.capitan.shot.aim + 0.1);
    expect(shot.some(d => d.shot)).toBe(true);
    const x = b.x;
    run(b, { x: 200, y: 0 }, KINDS.capitan.shot.after! - 0.15);
    expect(b.x).toBe(x);
    run(b, { x: 200, y: 0 }, 0.5);
    expect(b.x).toBeGreaterThan(x);
  });

  it('lunges from between his shot and his thrust: drawn back a moment, then thrown at her, and it lands', () => {
    const b = brain('capitan');
    const l = KINDS.capitan.lunge;
    b.relentless = true;
    for (let t = 0; t < 8 && b.mode !== 'lunge'; t += DT) b.update(DT, { x: 200, y: 0 });
    expect(b.mode).toBe('lunge');
    const x = b.x;
    run(b, { x: 200, y: 0 }, l.charge - 0.05);
    expect(b.x).toBe(x);
    const deeds = run(b, { x: 200, y: 0 }, l.time - l.charge);
    expect(b.x).toBeGreaterThan(x + 40);
    expect(deeds.filter(d => d.cut !== undefined)).toEqual([{ cut: true }]);
  });

  it('calls up more of his men a while after he has seen her, and again now and then', () => {
    const b = brain('capitan');
    const c = KINDS.capitan.call;
    b.relentless = true;
    const at: number[] = [];
    for (let t = 0; t < 40; t += DT) if (b.update(DT, { x: 2000, y: 0 }).call) at.push(t);
    expect(at.length).toBeGreaterThanOrEqual(2);
    expect(at[0]).toBeGreaterThan(c.first);
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThan(c.every);
  });

  it('is not moved by a blow, nor put off his aim', () => {
    const b = brain('capitan');
    b.relentless = true;
    for (let t = 0; t < 8 && b.mode !== 'aim'; t += DT) b.update(DT, { x: 220, y: 0 });
    const x = b.x;
    b.hit(1, 0);
    expect([b.mode, b.x]).toEqual(['aim', x]);
  });

  it('comes on faster once he has lost half his life', () => {
    const whole = brain('capitan'), hurt = brain('capitan');
    for (let n = 0; n < KINDS.capitan.life / 2; n++) hurt.hit(0, 1);
    whole.relentless = hurt.relentless = true;
    const w0 = whole.x, h0 = hurt.x;
    run(whole, { x: 3000, y: 0 }, 1); run(hurt, { x: 3000, y: 0 }, 1);
    expect((hurt.x - h0) / (whole.x - w0)).toBeCloseTo(KINDS.capitan.fury, 1);
  });
});

describe('the frontier soldier', () => {
  it('hunting her, comes on at nearly her walk, much faster than at his own pace', () => {
    const plain = brain('frontera'), hunting = brain('frontera');
    plain.provoke(5);
    hunting.relentless = true;
    run(plain, { x: 2000, y: 0 }, 1); run(hunting, { x: 2000, y: 0 }, 1);
    expect(hunting.x / plain.x).toBeCloseTo(KINDS.frontera.hunt, 1);
    expect(KINDS.frontera.pace * KINDS.frontera.hunt).toBeGreaterThan(90);
  });
});

describe('the frontier rifleman', () => {
  it('charges her now and then with his bayonet: gathers himself, runs at her and thrusts as he reaches her', () => {
    const b = brain('frontera');
    const l = KINDS.frontera.lunge;
    b.relentless = true;
    b.mayAim = false;
    // She keeps 180 ahead of him until he charges, then stands.
    for (let t = 0; t < 10 && b.mode !== 'lunge'; t += DT) b.update(DT, { x: b.x + 180, y: 0 });
    expect(b.mode).toBe('lunge');
    const x = b.x, her = { x: b.x + 180, y: 0 };
    run(b, her, l.charge - 0.05);
    expect(b.x).toBe(x);
    const deeds = run(b, her, l.time - l.charge);
    expect(b.x).toBeGreaterThan(x + 60);
    expect(deeds.filter(d => d.cut !== undefined)).toEqual([{ cut: true }]);
  });

  it('takes his first shot 2 to 5 s after he has seen her, and raises his gun only when let', () => {
    const b = brain('frontera');
    b.relentless = true;
    const at: number[] = [];
    for (let t = 0; t < 2; t += DT) { b.update(DT, { x: 200, y: 0 }); if (b.mode === 'aim') at.push(t); }
    expect(at).toEqual([]);
    const held = brain('frontera');
    held.relentless = true;
    held.mayAim = false;
    for (let t = 0; t < 8; t += DT) held.update(DT, { x: 200, y: 0 });
    expect(held.mode).not.toBe('aim');
  });
});

describe("Roca's spotter", () => {
  it('runs off from her when she comes near, faster than she walks', () => {
    const b = brain('observador');
    run(b, { x: 100, y: 0 }, 0.5);
    expect(b.x).toBeLessThan(-30);
    expect(KINDS.observador.pace).toBeGreaterThan(115);
  });

  it('does not stick against the edge as she comes at him: he gets away along it', () => {
    const b = brain('observador');
    // Ground only within 400 of the middle; he stands at its edge, she comes at him from the middle.
    b.ground = (x, y) => Math.hypot(x, y / 0.5) < 400;
    b.x = 380;
    const her = { x: 240, y: 0 };
    const start = { x: b.x, y: b.y };
    run(b, her, 1.5);
    expect(Math.hypot(b.x - start.x, b.y - start.y)).toBeGreaterThan(80);
  });

  it('stops now and then to call a salvo down where she stands, scattered and concentrated in turn', () => {
    const b = brain('observador');
    const salvoes: { kind: string; x: number; y: number }[] = [];
    for (let t = 0; t < 20; t += DT) { const d = b.update(DT, { x: 600, y: 0 }) as { salvo?: { kind: string; x: number; y: number } }; if (d.salvo) salvoes.push(d.salvo); }
    expect(salvoes.length).toBeGreaterThanOrEqual(2);
    expect(salvoes[0].kind).toBe('scattered');
    expect(salvoes[1].kind).toBe('concentrated');
    expect(salvoes[0].x).toBeCloseTo(600, 0);
  });
});

describe('the plague-dead soldier', () => {
  it('retches from as far off as 320, oftener than every 5 s', () => {
    expect(KINDS.apestado.retch.to).toBeGreaterThanOrEqual(320);
    expect(KINDS.apestado.retch.every).toBeLessThan(5);
  });

  it('comes up out of the earth, not to be struck while under it, and only then goes for her', () => {
    const b = brain('apestado');
    b.rise(100, 0, { x: 0, y: 0 });
    expect(b.mode).toBe('rise');
    b.hit(1, 0);
    expect(b.life).toBe(KINDS.apestado.life);
    run(b, { x: 0, y: 0 }, KINDS.apestado.rises.time - 0.1);
    expect([b.mode, b.x]).toEqual(['rise', 100]);
    run(b, { x: 0, y: 0 }, 0.5);
    expect(b.mode).not.toBe('rise');
  });

  it('retches at her from a little off, the way he faces, and not again for a while', () => {
    const b = brain('apestado');
    const deeds: Deed[] = [];
    for (let t = 0; t < 4; t += DT) { const d = b.update(DT, { x: 150, y: 0 }); if ((d as { retch?: unknown }).retch) deeds.push(d); }
    expect(deeds.length).toBe(1);
    expect((deeds[0] as { retch: { dx: number } }).retch.dx).toBeCloseTo(1);
  });

  it('charges her now and then from well off: roars, then runs straight at her and swipes as he reaches her', () => {
    const b = brain('apestado');
    const l = KINDS.apestado.lunge;
    b.relentless = true;
    for (let t = 0; t < 12 && b.mode !== 'lunge'; t += DT) b.update(DT, { x: 300, y: 0 });
    expect(b.mode).toBe('lunge');
    const x = b.x;
    run(b, { x: 300, y: 0 }, l.charge - 0.05);
    expect(b.x).toBe(x);
    const deeds = run(b, { x: 300, y: 0 }, l.time - l.charge);
    // Much faster than he walks.
    expect((b.x - x) / (l.hit - l.charge)).toBeGreaterThan(KINDS.apestado.pace * 4);
    expect(deeds.filter(d => d.cut !== undefined)).toEqual([{ cut: true }]);
  });

  it('swipes heavily up close, slow in the coming, and is not moved by a blow', () => {
    const b = brain('apestado');
    const blow = KINDS.apestado.blow;
    expect(blow.damage).toBe(3);
    expect(blow.hit).toBeGreaterThan(1);
    for (let t = 0; t < 2 && b.mode !== 'blow'; t += DT) b.update(DT, { x: 40, y: 0 });
    b.hit(1, 0);
    expect(b.x).toBe(0);
    expect(run(b, { x: 40, y: 0 }, blow.time).filter(d => d.cut !== undefined)).toEqual([{ cut: true }]);
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
      // The marksman walks only in 3D (three/realista.ts); his sheets are of him on his post.
      if (kind !== 'tirador') expect(!!look.walk, `${kind} walks`).toBe(k.pace > 0);

      expect(!!look.aim, `${kind} shoots`).toBe(!!k.shot);
      expect(!!look.blow, `${kind} strikes`).toBe(!!k.blow);
      // The captain's shout is only in 3D: his sheets are of him marching, firing and thrusting.
      if (kind !== 'capitan') expect(!!look.rally, `${kind} rallies`).toBe(!!k.rally);
      for (const s of [look.walk, look.aim, look.blow, look.rally, look.death]) {
        if (!s) continue;
        const png = readFileSync(`assets/${s.src}`);
        expect([png.readUInt32BE(16), png.readUInt32BE(20)], s.src).toEqual([s.size * s.frames, s.size]);
      }
    }
  });
});

describe('fire on the ground', () => {
  const fire = { x: 0, y: 0, r: 48 };
  const inside = (b: { x: number; y: number }, girth: number) => Math.hypot(b.x - fire.x, (b.y - fire.y) * 2) < fire.r + girth;

  it('is got out of, before anything else, by any kind that walks', () => {
    for (const kind of ['sableador', 'sargento', 'tirador'] as const) {
      const b = new TroopBrain(KINDS[kind], 10, 0, () => 0.5);
      b.fires = [fire];
      run(b, { x: 30, y: 0 }, 3);
      expect(inside(b, KINDS[kind].girth), kind).toBe(false);
    }
  });

  it('is gone round on the way to her, not walked through', () => {
    const b = brain('sableador', -200);
    b.fires = [fire];
    let through = false;
    for (let t = 0; t < 6 && b.mode !== 'blow'; t += DT) { b.update(DT, { x: 120, y: 0 }); through ||= inside(b, 0); }
    expect(through).toBe(false);
    expect(b.mode).toBe('blow');
  });

  it('hurts a sergeant and the captain a fifth as much as others', () => {
    expect(KINDS.sargento.fire).toBe(0.2);
    expect(KINDS.capitan.fire).toBe(0.2);
    expect((KINDS.sableador as { fire?: number }).fire).toBeUndefined();
  });
});
