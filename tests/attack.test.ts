import { expect, test } from 'vitest';
import { MachiController, type Cast, type MachiInput } from '../src/machi/controller';

const DT = 1 / 60;

/** Runs the controller for a while and collects the spells it releases. */
function run(machi: MachiController, seconds: number, input: MachiInput): Cast[] {
  const casts: Cast[] = [];
  for (let t = 0; t < seconds; t += DT) {
    machi.update(DT, input);
    const cast = machi.takeCast();
    if (cast) casts.push(cast);
  }
  return casts;
}

const walk = (dx: number, dy: number, attack: boolean): MachiInput => ({ dx, dy, attack });

test('holding the attack releases one spell per cast', () => {
  const machi = new MachiController();
  run(machi, 0.5, walk(-1, 0, false));
  // A cast lasts one second and lets go at frame 6 of 8, so 3.5 s hold three.
  expect(run(machi, 3.5, walk(-1, 0, true))).toHaveLength(3);
});

test('a tap too short to reach the release casts nothing', () => {
  const machi = new MachiController();
  run(machi, 0.5, walk(-1, 0, false));
  const casts = [...run(machi, 0.4, walk(-1, 0, true)), ...run(machi, 2, walk(-1, 0, false))];
  expect(casts).toHaveLength(0);
});

test('letting go after the release does not cast again while the animation finishes', () => {
  const machi = new MachiController();
  run(machi, 0.5, walk(0, 1, false));
  const casts = [...run(machi, 0.85, walk(0, 1, true)), ...run(machi, 1, walk(0, 1, false))];
  expect(casts).toHaveLength(1);
});

test.each([
  ['left', -1, 0, -1, 0],
  ['right', 1, 0, 1, 0],
  ['down', 0, 1, 0, 1],
  ['up', 0, -1, 0, -1],
  ['down-left', -1, 1, -1, 1],
  ['up-right', 1, -1, 1, -1],
])('the spell flies the way she is heading: %s', (_name, dx, dy, castDx, castDy) => {
  const machi = new MachiController();
  run(machi, 1, walk(dx, dy, false));
  const [cast] = run(machi, 1, walk(dx, dy, true));
  expect(cast).toMatchObject({ dx: castDx, dy: castDy });
  expect(cast.height).toBeGreaterThan(20);
});

test('the branch tip is mirrored with her', () => {
  const tip = (dx: number) => {
    const machi = new MachiController();
    run(machi, 1, walk(dx, 0, false));
    const [cast] = run(machi, 1, walk(dx, 0, true));
    return cast.x - machi.x;
  };
  // Heading left the branch is out to her left; heading right, to her right.
  expect(tip(-1)).toBeLessThan(-20);
  expect(tip(1)).toBeGreaterThan(20);
});

test('standing still she casts with her feet planted, walking she uses the casting walk', () => {
  const machi = new MachiController();
  run(machi, 1, walk(0, 1, false));
  run(machi, 0.3, walk(0, 1, true));
  expect(machi.pose().sheet).toBe('attack_south');
  run(machi, 1, walk(0, 0, false));
  run(machi, 0.3, walk(0, 0, true));
  expect(machi.pose().sheet).toBe('attack_still_south');
});

test('a spell is released just the same while standing', () => {
  const machi = new MachiController();
  run(machi, 0.5, walk(1, 0, false));
  run(machi, 1, walk(0, 0, false));
  const casts = run(machi, 2.5, walk(0, 0, true));
  expect(casts).toHaveLength(2);
  expect(casts[0]).toMatchObject({ dx: 1, dy: 0 });
});
