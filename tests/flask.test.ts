import { expect, test } from 'vitest';
import { DRAUGHTS, Flask, FLASKS, SWALLOW } from '../src/machi/flask';

test('a flask holds three draughts, and is empty after them', () => {
  const flask = new Flask();
  expect(DRAUGHTS).toBe(3);
  for (let n = 0; n < DRAUGHTS; n++) {
    expect(flask.drink()).toBe(true);
    flask.update(SWALLOW);
  }
  expect(flask.left).toBe(0);
  expect(flask.drink()).toBe(false);
});

test('one draught has to go down before the next', () => {
  const flask = new Flask();
  expect(flask.drink()).toBe(true);
  expect(flask.drink()).toBe(false);
  flask.update(SWALLOW / 2);
  expect(flask.ready).toBe(false);
  flask.update(SWALLOW / 2);
  expect(flask.drink()).toBe(true);
  expect(flask.left).toBe(DRAUGHTS - 2);
});

test('it is filled again, and says whether there was anything to fill', () => {
  const flask = new Flask();
  expect(flask.refill()).toBe(false);
  flask.drink();
  expect(flask.refill()).toBe(true);
  expect(flask.left).toBe(DRAUGHTS);
});

test('his gives back life and hers mana', () => {
  expect(FLASKS.cabral.restores).toBe('life');
  expect(FLASKS.inti.restores).toBe('mana');
});
