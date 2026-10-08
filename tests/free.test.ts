import { expect, test } from 'vitest';
import { MachiController, snap8, type MachiInput, type Vec } from '../src/machi/controller';

const DT = 1 / 60;
const deg = (a: number): Vec => ({ x: Math.cos(a * Math.PI / 180), y: Math.sin(a * Math.PI / 180) });
const idle: MachiInput = { dx: 0, dy: 0, attack: false };

function run(machi: MachiController, seconds: number, input: MachiInput) {
  const casts = [];
  for (let t = 0; t < seconds; t += DT) {
    machi.update(DT, input);
    const cast = machi.takeCast();
    if (cast) casts.push(cast);
  }
  return casts;
}

test('a free direction is drawn as the nearest of the eight', () => {
  expect(snap8(deg(10), null)).toEqual([1, 0]);    // right
  expect(snap8(deg(40), null)).toEqual([1, 1]);    // down-right
  expect(snap8(deg(95), null)).toEqual([0, 1]);    // down
  expect(snap8(deg(-170), null)).toEqual([-1, 0]); // left
  expect(snap8(deg(-100), null)).toEqual([0, -1]); // up
});

test('the drawn direction holds a little past the edge of its sector', () => {
  // 22.5 degrees is the edge between right and down-right.
  expect(snap8(deg(27), [1, 0])).toEqual([1, 0]);
  expect(snap8(deg(18), [1, 1])).toEqual([1, 1]);
  expect(snap8(deg(34), [1, 0])).toEqual([1, 1]);
  // Across the -180/180 seam too.
  expect(snap8(deg(176), [-1, 0])).toEqual([-1, 0]);
  expect(snap8(deg(-176), [-1, 0])).toEqual([-1, 0]);
});

test('she walks exactly along a free direction, in the nearest view', () => {
  const machi = new MachiController();
  const move = deg(30); // between right and down-right
  run(machi, 2, { ...idle, move });
  // Travelled along 30 degrees on the ground; the screen halves the vertical part.
  expect(Math.atan2(machi.y * 2, machi.x) * 180 / Math.PI).toBeCloseTo(30, 3);
  expect(machi.pose()).toMatchObject({ sheet: 'trot_down', flip: true });
});

test('sweeping a free direction all the way round visits all eight views', () => {
  const machi = new MachiController();
  const seen = new Set<string>();
  for (let a = 0; a < 360; a += 2) {
    run(machi, 0.6, { ...idle, move: deg(a) });
    const pose = machi.pose();
    seen.add(`${pose.sheet}${pose.flip ? ' flipped' : ''}`);
  }
  expect([...seen].filter(s => s.startsWith('trot_')).sort()).toEqual([
    'trot_back', 'trot_back flipped', 'trot_down', 'trot_down flipped',
    'trot_front', 'trot_front flipped', 'trot_north', 'trot_south',
  ]);
});

test('a spell flies exactly along the aim, and she turns to face it', () => {
  const machi = new MachiController();
  run(machi, 1, { ...idle, dx: -1 });       // walk left, then stand facing left
  run(machi, 1, idle);
  const aim = deg(-60);                     // up and to the right
  const [cast] = run(machi, 1, { ...idle, attack: true, aim });
  expect(cast.dx).toBeCloseTo(aim.x, 6);
  expect(cast.dy).toBeCloseTo(aim.y, 6);
  expect(machi.pose()).toMatchObject({ sheet: 'attack_still_back', flip: true });
});

test('attacking while walking the opposite way, she faces the aim and backs away', () => {
  const machi = new MachiController();
  run(machi, 1, { ...idle, dx: 1 });                              // heading right
  const x0 = machi.x;
  run(machi, 0.5, { ...idle, dx: 1, attack: true, aim: deg(180) }); // aiming left
  expect(machi.x).toBeGreaterThan(x0);
  // Walking right while aiming left: she backs away, facing left.
  expect(machi.pose()).toMatchObject({ sheet: 'retreat_front', flip: false });
});

test('standing, a change of aim plays the turn between the two views', () => {
  const machi = new MachiController();
  run(machi, 1, { ...idle, dy: 1 });   // end up standing, facing the camera
  run(machi, 1, idle);
  run(machi, 0.3, { ...idle, attack: true, aim: deg(90) });
  expect(machi.pose().sheet).toBe('attack_still_south');

  // Swing the aim to down-left: the south-to-diagonal turn plays, then the cast resumes.
  const sheets: string[] = [];
  for (let t = 0; t < 0.5; t += DT) {
    machi.update(DT, { ...idle, attack: true, aim: deg(135) });
    const sheet = machi.pose().sheet;
    if (sheets[sheets.length - 1] !== sheet) sheets.push(sheet);
  }
  expect(sheets).toEqual(['pivot_south_front', 'attack_still_down']);
  expect(machi.x).toBe(0); // she turned on the spot
});

test('standing, an about-turn of the aim goes through every view in between', () => {
  const machi = new MachiController();
  run(machi, 1, { ...idle, dx: -1 });  // standing, facing left
  run(machi, 1, idle);
  run(machi, 0.2, { ...idle, attack: true, aim: deg(180) });
  const sheets: string[] = [];
  for (let t = 0; t < 1.2; t += DT) {
    machi.update(DT, { ...idle, attack: true, aim: deg(-90) }); // straight up
    const sheet = machi.pose().sheet;
    if (sheets[sheets.length - 1] !== sheet) sheets.push(sheet);
  }
  expect(sheets).toEqual(['pivot_front_back', 'pivot_north_back', 'attack_still_north']);
});

test('standing, turning to the other side or right round is animated too', () => {
  const sweep = (from: number, to: number) => {
    const machi = new MachiController();
    run(machi, 0.4, { ...idle, attack: true, aim: deg(from) });
    const sheets: string[] = [];
    for (let t = 0; t < 1.5; t += DT) {
      machi.update(DT, { ...idle, attack: true, aim: deg(to) });
      const sheet = machi.pose().sheet;
      if (sheets[sheets.length - 1] !== sheet) sheets.push(sheet);
    }
    return sheets;
  };
  // Left to right: one turn through the front.
  expect(sweep(180, 0)).toEqual(['pivot_flip_front', 'attack_still_front']);
  // Up to down: through every view in between, all with planted feet.
  expect(sweep(-90, 90)).toEqual(
    ['pivot_north_back', 'pivot_front_back', 'pivot_south_front', 'attack_still_south']);
});

test('walking, the turns are still the walking ones', () => {
  const machi = new MachiController();
  run(machi, 1, { ...idle, dx: -1 });
  machi.update(DT, { ...idle, dx: -1, dy: -1 });
  expect(machi.pose().sheet).toBe('turn_front_back');
});

test('she only backs away when walking against the aim, not across it or with it', () => {
  const sheet = (moveDeg: number, aimDeg: number) => {
    const machi = new MachiController();
    run(machi, 0.5, { ...idle, move: deg(moveDeg), attack: true, aim: deg(aimDeg) });
    return machi.pose().sheet;
  };
  expect(sheet(0, 0)).toBe('attack_front');      // walking where she aims
  expect(sheet(0, 40)).toBe('attack_down');      // roughly where she aims
  expect(sheet(90, 0)).toBe('attack_front');     // straight across the aim
  expect(sheet(180, 0)).toBe('retreat_front');   // directly away from it
  expect(sheet(135, 0)).toBe('retreat_front');   // away at an angle
  expect(sheet(90, -90)).toBe('retreat_north');  // walking down, aiming up
});
