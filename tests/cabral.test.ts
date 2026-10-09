import { describe, expect, it } from 'vitest';
import { MachiController } from '../src/machi/controller';
import { CABRAL } from '../src/machi/data';

const DT = 1 / 60;
// Walks him one way for a while and gathers the sheets he was drawn from.
function walk(c: MachiController, dx: number, dy: number, seconds: number): string[] {
  const seen: string[] = [];
  for (let t = 0; t < seconds; t += DT) {
    c.update(DT, { dx, dy, attack: false });
    const { sheet } = c.pose();
    if (seen[seen.length - 1] !== sheet) seen.push(sheet);
  }
  return seen;
}

describe('Cabral', () => {
  it('has a sheet of his own for every pose he can be asked for', () => {
    const c = new MachiController(undefined, CABRAL);
    for (const [dx, dy] of [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]) {
      for (const sheet of [...walk(c, dx, dy, 0.6), ...walk(c, 0, 0, 0.3)]) {
        expect(CABRAL.sheets[sheet], sheet).toBeDefined();
        expect(CABRAL.sheets[sheet].src).toMatch(/^cabral\//);
      }
    }
  });

  it('trots in the view of the way he heads', () => {
    const c = new MachiController(undefined, CABRAL);
    expect(walk(c, 0, 1, 0.5).pop()).toBe('trot_south');
    expect(walk(c, 1, 1, 0.5).pop()).toBe('trot_down');
    expect(walk(c, 1, 0, 0.5).pop()).toBe('trot_front');
    expect(walk(c, 1, -1, 0.5).pop()).toBe('trot_back');
    expect(walk(c, 0, -1, 0.5).pop()).toBe('trot_north');
  });

  it('turns between neighbouring views', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 0, 1, 0.5);
    expect(walk(c, 1, 1, 0.5)).toEqual(['turn_south_front', 'trot_down']);
    expect(walk(c, 1, 0, 0.5)).toEqual(['turn_south_front', 'trot_front']);
    expect(walk(c, 1, -1, 0.6)).toEqual(['turn_front_back', 'trot_back']);
    expect(walk(c, 0, -1, 0.5)).toEqual(['turn_back_north', 'trot_north']);
    expect(walk(c, 1, -1, 0.5)).toEqual(['turn_back_north', 'trot_back']);
    expect(walk(c, 1, 0, 0.6)).toEqual(['turn_front_back', 'trot_front']);
    expect(walk(c, 0, 1, 0.5)).toEqual(['turn_south_front', 'trot_south']);
  });

  it('turns right round in one move, slowing to a stop as he does', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 0, -1, 0.5);
    const y = c.y;
    expect(walk(c, 0, 1, 0.2)).toEqual(['about_turn']);
    // Two tenths of a second at full speed would be 7 pixels down the screen.
    expect(Math.abs(c.y - y)).toBeLessThan(4);
    expect(walk(c, 0, 1, 0.6).pop()).toBe('trot_south');
    expect(walk(c, 0, -1, 0.8)).toEqual(['about_turn', 'trot_north']);
  });

  it('changes side through the straight view, never mirrored', () => {
    const c = new MachiController(undefined, CABRAL);
    for (const [dy, flip, trot] of [[0, 'flip_front', 'trot_front'], [1, 'flip_down', 'trot_down'], [-1, 'flip_back', 'trot_back']] as const) {
      walk(c, 1, dy, 0.8);
      c.update(DT, { dx: -1, dy, attack: false });
      c.update(DT, { dx: -1, dy, attack: false });
      expect(c.pose().sheet).toBe(flip);
      expect(c.pose().flip).toBe(false);
      expect(walk(c, -1, dy, 0.8).pop()).toBe(trot);
      expect(c.pose().flip).toBe(true);
    }
  });

  it('faces the side he heads: his front and back views are drawn heading right', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 1, 0, 0.5);
    expect(c.pose().flip).toBe(false);
    walk(c, -1, 0, 0.5);
    expect(c.pose().flip).toBe(true);
    walk(c, -1, -1, 0.5);
    expect(c.pose().flip).toBe(true);
  });
});

describe("Cabral's sabre", () => {
  const melee = CABRAL.melee!;
  const swing = { dx: 0, dy: 0, attack: true };

  it('stops him where he stands for the length of the swing', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 1, 0, 0.5);
    const at = { x: c.x, y: c.y };
    for (let t = 0; t < melee.time - 2 * DT; t += DT) c.update(DT, { dx: 1, dy: 0, attack: true });
    expect(c.isSwinging).toBe(true);
    expect({ x: c.x, y: c.y }).toEqual(at);
    for (let t = 0; t < 0.3; t += DT) c.update(DT, { dx: 1, dy: 0, attack: false });
    expect(c.isSwinging).toBe(false);
    expect(c.x).toBeGreaterThan(at.x);
  });

  it('lands once, partway through, the way he faces', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 0, -1, 0.5);
    const blows = [];
    for (let t = 0; t < melee.time - DT; t += DT) {
      c.update(DT, swing);
      const blow = c.takeStrike();
      if (blow) blows.push({ blow, at: t });
    }
    expect(blows).toHaveLength(1);
    expect(blows[0].at).toBeGreaterThanOrEqual(melee.hit - 2 * DT);
    expect(blows[0].blow).toMatchObject({ dx: 0, dy: -1, reach: melee.reach, arc: melee.arc, x: c.x, y: c.y });
  });

  it('is aimed at the pointer and turns him to it at once', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 0, 1, 0.5);
    // A point up and to the left of him on the ground.
    c.update(DT, { ...swing, target: { x: c.x - 60, y: c.y - 30 } });
    expect(c.view).toBe('back');
    expect(c.pose().flip).toBe(true);
    let blow = null;
    for (let t = 0; t < melee.time; t += DT) { c.update(DT, swing); blow ??= c.takeStrike(); }
    expect(blow!.dx).toBeCloseTo(-Math.SQRT1_2);
    expect(blow!.dy).toBeCloseTo(-Math.SQRT1_2);
  });

  it('is drawn in the view he swings in, every frame of it', () => {
    for (const [dx, dy, view] of [[0, 1, 'south'], [1, 1, 'down'], [1, 0, 'front'], [1, -1, 'back'], [0, -1, 'north']] as const) {
      const c = new MachiController(undefined, CABRAL);
      walk(c, dx, dy, 0.6);
      c.update(DT, swing);
      expect(c.pose().sheet).toBe(`slash_${view}`);
      const frames = new Set<number>([c.pose().frame]);
      for (let t = 0; t < melee.time - 2 * DT; t += DT) { c.update(DT, swing); frames.add(c.pose().frame); }
      expect([...frames]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it('swings again for as long as the attack is held', () => {
    const c = new MachiController(undefined, CABRAL);
    let blows = 0;
    for (let t = 0; t < melee.time * 3 + 0.1; t += DT) { c.update(DT, swing); if (c.takeStrike()) blows++; }
    expect(blows).toBe(3);
  });

  it('is broken off by a dash', () => {
    const c = new MachiController(undefined, CABRAL);
    c.update(DT, swing);
    c.update(DT, { ...swing, dash: true });
    expect(c.isSwinging).toBe(false);
    expect(c.isDashing).toBe(true);
    for (let t = 0; t < melee.hit; t += DT) c.update(DT, { dx: 0, dy: 0, attack: false });
    expect(c.takeStrike()).toBeNull();
  });
});

describe("Cabral's roll", () => {
  it('is drawn in the view he dashes in, and skips the frame of him standing', () => {
    for (const [dx, dy, view] of [[0, 1, 'south'], [1, 1, 'down'], [1, 0, 'front'], [1, -1, 'back'], [0, -1, 'north']] as const) {
      const c = new MachiController(undefined, CABRAL);
      walk(c, dx, dy, 0.6);
      c.update(DT, { dx, dy, attack: false, dash: true });
      const frames = new Set<number>();
      while (c.isDashing) {
        expect(c.pose().sheet).toBe(`dash_${view}`);
        frames.add(c.pose().frame);
        c.update(DT, { dx, dy, attack: false });
      }
      expect([...frames]).toEqual([1, 2, 3, 4, 5]);
    }
  });
});

describe("Cabral's musket", () => {
  const still = { dx: 0, dy: 0, attack: false };
  const run = (c: MachiController, seconds: number, each?: () => void) => {
    for (let t = 0; t < seconds; t += DT) { each?.(); c.update(DT, still); }
  };

  it('comes up while it is held, turning him to the aim, and he stands still', () => {
    const c = new MachiController(undefined, CABRAL);
    walk(c, 0, 1, 0.5);
    const at = { x: c.x, y: c.y };
    const aim = { x: c.x + 80, y: c.y - 40 };
    for (let t = 0; t < 1; t += DT) { c.shoulder(aim); c.update(DT, { dx: 1, dy: 0, attack: false }); }
    expect(c.isShouldering).toBe(true);
    expect(c.view).toBe('back');
    expect({ x: c.x, y: c.y }).toEqual(at);
    expect(c.takeShot()).toBe(false);
  });

  it('fires on being let go, once, and is slung again after', () => {
    const c = new MachiController(undefined, CABRAL);
    const aim = { x: c.x + 80, y: c.y };
    run(c, 0.5, () => c.shoulder(aim));
    c.fire();
    let shots = 0;
    run(c, 1, () => { if (c.takeShot()) shots++; });
    expect(shots).toBe(1);
    expect(c.isShouldering).toBe(false);
  });

  it('let go before it is level, fires as soon as it is', () => {
    const c = new MachiController(undefined, CABRAL);
    c.shoulder({ x: c.x + 80, y: c.y });
    c.update(DT, still);
    c.fire();
    c.update(DT, still);
    expect(c.takeShot()).toBe(false);
    let shots = 0;
    run(c, 1, () => { if (c.takeShot()) shots++; });
    expect(shots).toBe(1);
  });

  it('is put away without a shot when lowered, or by a dash', () => {
    const c = new MachiController(undefined, CABRAL);
    const aim = { x: c.x + 80, y: c.y };
    run(c, 0.5, () => c.shoulder(aim));
    c.lower();
    expect(c.isShouldering).toBe(false);
    run(c, 0.5, () => c.shoulder(aim));
    c.update(DT, { ...still, dash: true });
    expect(c.isShouldering).toBe(false);
    expect(c.isDashing).toBe(true);
    run(c, 1);
    expect(c.takeShot()).toBe(false);
  });
});

describe("Cabral's grenade", () => {
  const still = { dx: 0, dy: 0, attack: false };

  it('is readied and thrown like the musket, drawn from its own sheets', () => {
    const c = new MachiController(undefined, CABRAL);
    const aim = { x: c.x + 80, y: c.y };
    const sheets = new Set<string>();
    for (let t = 0; t < 0.5; t += DT) { c.shoulder(aim, 'grenade'); c.update(DT, still); sheets.add(c.pose().sheet); }
    expect([...sheets]).toEqual(['grenade_front']);
    expect(c.pose().frame).toBe(3);
    c.fire();
    let thrown = 0;
    const frames = new Set<number>();
    for (let t = 0; t < 1 && c.isShouldering; t += DT) { c.update(DT, still); if (c.takeShot()) thrown++; frames.add(c.pose().frame); }
    expect(thrown).toBe(1);
    // The frame where he is still wound up is passed over once the grenade has gone.
    expect(frames.has(4)).toBe(false);
    expect(frames.has(5)).toBe(true);
  });

  it('keeps to what he readied first', () => {
    const c = new MachiController(undefined, CABRAL);
    const aim = { x: c.x + 80, y: c.y };
    c.shoulder(aim, 'grenade');
    c.update(DT, still);
    c.shoulder(aim, 'musket');
    c.update(DT, still);
    expect(c.pose().sheet).toBe('grenade_front');
  });
});
