import { beforeEach, expect, it } from 'vitest';
import { Growth } from '../src/machi/growth';
import { Pack } from '../src/machi/pack';
import { Talk } from '../src/npc/talk';
import { PEOPLE } from '../src/npc/people';
import { forget, grownOf, keep, load, ownedOf, regrow, repack } from '../src/save';

// Just enough of a browser's storage.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k),
  };
});

it('keeps how far a hero has grown and what they own, and gives it back as it was', () => {
  const growth = new Growth();
  growth.earn(400);
  expect(growth.put('life')).toBe(true);
  const pack = new Pack();
  pack.gold = 123;
  pack.bag.venda = 2;
  pack.owned.add('sable');
  pack.worn.weapon = 'sable';
  const kept = { growth: grownOf(growth), pack: ownedOf(pack) };

  const again = new Growth(), mine = new Pack();
  mine.bag.otra = 9;
  regrow(again, JSON.parse(JSON.stringify(kept.growth)));
  repack(mine, JSON.parse(JSON.stringify(kept.pack)));
  expect(grownOf(again)).toEqual(kept.growth);
  expect(ownedOf(mine)).toEqual(kept.pack);
  expect(mine.bag.otra).toBeUndefined();
});

it('gives back as points to put elsewhere those a hero had put into the pace, which is no longer grown', () => {
  const again = new Growth();
  regrow(again, { level: 4, xp: 10, points: 1, spent: { basic: 1, first: 0, second: 0, speed: 2, life: 0, flow: 0, ultimate: 0 } as never });
  expect(again.points).toBe(3);
  expect(again.spent.basic).toBe(1);
  expect('speed' in again.spent).toBe(false);
});

it('keeps a conversation where it was left', () => {
  const npc = Object.values(PEOPLE)[0];
  const talk = new Talk(npc, 'cabral', async () => ({ says: '', trust: 0 }) as never);
  talk.trust = 3;
  talk.lines.push({ who: 'player', text: 'Buenas' }, { who: 'npc', text: 'Buenas.' });
  talk.over = true;
  const later = new Talk(npc, 'cabral', async () => ({ says: '', trust: 0 }) as never);
  later.restore(JSON.parse(JSON.stringify(talk.kept())));
  expect(later.kept()).toEqual(talk.kept());
});

it('keeps one game for each hero, reads back only its own kind, and forgets it when asked', () => {
  const game = { at: { x: 1, y: 2 }, growth: grownOf(new Growth()), pack: ownedOf(new Pack()), flask: 2, happened: ['empieza', 'tiene:poncho'], reached: { posada: 1 }, talks: {} };
  expect(keep('cabral', game)).toBe(true);
  expect(load('cabral')?.happened).toEqual(['empieza', 'tiene:poncho']);
  expect(load('inti')).toBeUndefined();
  store.set('1810.partida.inti', '{"v":0}');
  expect(load('inti')).toBeUndefined();
  store.set('1810.partida.inti', 'no es json');
  expect(load('inti')).toBeUndefined();
  forget('cabral');
  expect(load('cabral')).toBeUndefined();
  // Once forgotten, leaving the page does not keep it again.
  expect(keep('cabral', game)).toBe(false);
});
