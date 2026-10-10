import { expect, test } from 'vitest';
import { ITEMS, Pack, SPOILS } from '../src/machi/pack';

test('nothing is bought without the money for it, and buying takes the money', () => {
  const pack = new Pack();
  expect(pack.buy('venda', 'cabral')).toBe(false);
  pack.gold = ITEMS.venda.price + 5;
  expect(pack.buy('venda', 'cabral')).toBe(true);
  expect(pack.gold).toBe(5);
  expect(pack.bag.venda).toBe(1);
});

test('what is used up is counted, and gone when used', () => {
  const pack = new Pack();
  pack.gold = ITEMS.odre.price * 2;
  pack.buy('odre', 'inti'); pack.buy('odre', 'inti');
  expect(pack.bag.odre).toBe(2);
  expect(pack.take('odre')).toBe('refill');
  expect(pack.take('odre')).toBe('refill');
  expect(pack.take('odre')).toBeUndefined();
});

test('what is worn is bought once, put on at once, and makes its wearer that much more', () => {
  const pack = new Pack();
  pack.gold = ITEMS.sable.price * 2;
  expect(pack.gives('basic')).toBe(1);
  expect(pack.buy('sable', 'cabral')).toBe(true);
  expect(pack.worn.weapon).toBe('sable');
  expect(pack.gives('basic')).toBeCloseTo(1.25);
  expect(pack.gives('life')).toBe(1);
  expect(pack.buy('sable', 'cabral')).toBe(false);
  // Taken off, it does nothing; put back on, it does again.
  pack.wear('sable');
  expect(pack.gives('basic')).toBe(1);
  pack.wear('sable');
  expect(pack.gives('basic')).toBeCloseTo(1.25);
});

test('what is only for one of them is not sold to the other', () => {
  const pack = new Pack();
  pack.gold = 1000;
  expect(pack.canBuy('sable', 'inti')).toBe(false);
  expect(pack.canBuy('sable', 'cabral')).toBe(true);
});

test('things are dear: a whole clearing of the first map does not buy the sabre', () => {
  // Forty-eight soldiers hold the vado.
  expect(48 * SPOILS.realista).toBeLessThan(ITEMS.sable.price);
  // But it buys a draught or two against the next crossing.
  expect(48 * SPOILS.realista).toBeGreaterThan(ITEMS.venda.price + ITEMS.odre.price);
});
