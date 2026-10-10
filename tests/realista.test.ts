import { describe, expect, it } from 'vitest';
import { ISO_Y } from '../src/machi/data';
import {
  AIM, DYING, LIFE, NEAR, RANGE, RealistaBrain, RESPAWN, SIGHT, SLASH_HIT, SLASH_REACH, type Deed,
} from '../src/realista/brain';

const DT = 1 / 60;
const her = { x: 500, y: 400 };
const gap = (b: RealistaBrain, p = her) => Math.hypot(p.x - b.x, (p.y - b.y) / ISO_Y);
const fixed = (v: number) => () => v;
// Steps him until something happens that `done` accepts; returns what he did.
function until(b: RealistaBrain, done: (deed: Deed) => boolean, target: typeof her | null = her, limit = 30): Deed {
  for (let t = 0; t < limit; t += DT) {
    const deed = b.update(DT, target);
    if (done(deed)) return deed;
  }
  throw new Error(`never happened, stuck in ${b.mode}`);
}

describe('royalist soldier', () => {
  it('takes no notice of anyone too far away', () => {
    const b = new RealistaBrain(her.x + SIGHT + 50, her.y, undefined, fixed(0));
    for (let t = 0; t < 3; t += DT) b.update(DT, her);
    expect(b.mode).toBe('stand');
    expect(b.x).toBe(her.x + SIGHT + 50);
  });

  it('walks into range, then shoulders his musket and fires at her', () => {
    const b = new RealistaBrain(her.x + RANGE + 60, her.y, undefined, fixed(0));
    until(b, () => b.mode === 'aim');
    expect(gap(b)).toBeLessThanOrEqual(RANGE);
    const deed = until(b, d => !!d.shot);
    expect(b.t).toBeLessThan(0.05);
    // The ball flies from where he stands toward her: to his left.
    expect(deed.shot!.dx).toBeLessThan(-0.99);
    expect(deed.shot!.x).toBe(b.x);
  });

  it('gives warning before the shot, and aims where she was when his aim locked', () => {
    const b = new RealistaBrain(her.x + 150, her.y, undefined, fixed(0));
    until(b, () => b.mode === 'aim');
    let waited = 0;
    // She steps well aside in the last instant: the shot still goes where she was.
    const deed = until(b, d => { waited += DT; return !!d.shot; }, her);
    expect(waited).toBeGreaterThan(AIM - 0.05);
    expect(Math.abs(deed.shot!.dy)).toBeLessThan(0.01);
  });

  it('has to reload before he can fire again', () => {
    const b = new RealistaBrain(her.x + 150, her.y, undefined, fixed(0));
    until(b, d => !!d.shot);
    let waited = 0;
    until(b, d => { waited += DT; return !!d.shot; });
    expect(waited).toBeGreaterThan(2);
  });

  it('draws his sabre on anyone who gets close, and does not shoot', () => {
    const b = new RealistaBrain(her.x + NEAR - 10, her.y, undefined, fixed(0));
    let shot = false;
    const deed = until(b, d => { shot = shot || !!d.shot; return d.cut !== undefined; });
    expect(b.mode).toBe('slash');
    expect(b.t).toBeGreaterThanOrEqual(SLASH_HIT);
    expect(deed.cut).toBe(true);
    expect(shot).toBe(false);
  });

  it('cuts the air if she has stepped back out of reach', () => {
    const b = new RealistaBrain(her.x + NEAR - 10, her.y, undefined, fixed(0));
    until(b, () => b.mode === 'slash');
    const away = { x: b.x - SLASH_REACH - 30, y: b.y };
    const deed = until(b, d => d.cut !== undefined, away);
    expect(deed.cut).toBe(false);
  });

  it('drops his aim when she closes on him', () => {
    const b = new RealistaBrain(her.x + 150, her.y, undefined, fixed(0));
    until(b, () => b.mode === 'aim');
    const close = { x: b.x - 20, y: b.y };
    let shot = false;
    until(b, d => { shot = shot || !!d.shot; return b.mode === 'slash'; }, close);
    expect(shot).toBe(false);
  });

  it('loses his aim when he is struck', () => {
    const b = new RealistaBrain(her.x + 150, her.y, undefined, fixed(0));
    until(b, () => b.mode === 'aim');
    b.hit(1, 0);
    expect(b.mode).toBe('stand');
    expect(b.life).toBe(LIFE - 1);
  });

  it('faces her: right or left, and with his back to the screen when she is above him', () => {
    const b = new RealistaBrain(her.x - 150, her.y + 60, undefined, fixed(0));
    b.update(DT, her);
    expect(b.faceX).toBe(1);
    expect(b.back).toBe(true);
    const c = new RealistaBrain(her.x + 150, her.y - 60, undefined, fixed(0));
    c.update(DT, her);
    expect(c.faceX).toBe(-1);
    expect(c.back).toBe(false);
  });

  it('falls when his life runs out, and is back after a while where he started', () => {
    const b = new RealistaBrain(her.x + 150, her.y, undefined, fixed(0));
    for (let t = 0; t < 1; t += DT) b.update(DT, her);
    for (let i = 0; i < LIFE; i++) b.hit(1, 0);
    expect(b.alive).toBe(false);
    expect(b.mode).toBe('dying');
    let waited = 0;
    for (; !b.alive; waited += DT) expect(b.update(DT, her)).toEqual({});
    expect(waited).toBeGreaterThan(DYING + RESPAWN - 0.1);
    expect(b.life).toBe(LIFE);
    expect(b.x).toBe(her.x + 150);
  });
});

describe('a soldier who holds a post', () => {
  it('stays down once he has fallen, until he is called back', () => {
    const b = new RealistaBrain(0, 0, undefined, () => 0.5);
    b.returns = false;
    for (let n = 0; n < LIFE; n++) b.hit(1, 0);
    for (let t = 0; t < DYING + RESPAWN * 3; t += 0.05) b.update(0.05, null);
    expect(b.alive).toBe(false);
    b.revive();
    expect(b.alive).toBe(true);
    expect(b.life).toBe(LIFE);
    expect([b.x, b.y]).toEqual([0, 0]);
  });

  it('does not leave the ground he is given, however far whoever he is after goes', () => {
    const b = new RealistaBrain(0, 0, undefined, () => 0.5);
    b.ground = x => x < 20;
    for (let t = 0; t < 30; t += 0.05) b.update(0.05, { x: 250, y: 0 });
    expect(b.x).toBeLessThan(20);
  });
});
