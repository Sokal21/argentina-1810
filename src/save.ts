import type { Hero } from './machi/data';
import type { Growth, Stat } from './machi/growth';
import type { Pack, Place } from './machi/pack';
import type { KeptTalk } from './npc/talk';

// The game as it was left, kept in the browser, one for each hero: where they stood, how far
// they have grown, what they own, how much is left in the flask, everything that has happened
// in the story and how each conversation stood. Nothing else is kept: whoever was dead is up
// again, whoever was being led waits where they began, a stand under way is not, and whatever
// garrison was beaten is back at its post. Coming back is like having rested.

const VERSION = 1;
const KEY = (hero: Hero) => `1810.partida.${hero}`;

export interface Saved {
  v: number;
  at: { x: number; y: number };
  /** The building they were inside, if they were. */
  inside?: string;
  growth: { level: number; xp: number; points: number; spent: Record<Stat, number> };
  pack: { gold: number; bag: Record<string, number>; worn: Partial<Record<Place, string>>; owned: string[] };
  flask: number;
  happened: string[];
  /** How far each mission that has opened has got. */
  reached: Record<string, number>;
  talks: Record<string, KeptTalk>;
}

/** Once a game is thrown away nothing more is kept this sitting, or leaving the page would keep it again. */
let wiped = false;

/** What was kept for a hero, if anything was and it can still be read. */
export function load(hero: Hero): Saved | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY(hero)) ?? 'null') as Saved | null;
    return saved?.v === VERSION ? saved : undefined;
  } catch {
    return undefined;
  }
}

/** Keeps a hero's game. Says whether it could. */
export function keep(hero: Hero, saved: Omit<Saved, 'v'>): boolean {
  if (wiped) return false;
  try {
    localStorage.setItem(KEY(hero), JSON.stringify({ v: VERSION, ...saved }));
    return true;
  } catch {
    return false;
  }
}

/** Throws a hero's game away, to begin again. */
export function forget(hero: Hero): void {
  wiped = true;
  try { localStorage.removeItem(KEY(hero)); } catch { /* nothing was kept */ }
}

export function grownOf(growth: Growth): Saved['growth'] {
  return { level: growth.level, xp: growth.xp, points: growth.points, spent: { ...growth.spent } };
}

export function regrow(growth: Growth, saved: Saved['growth']): void {
  growth.level = saved.level;
  growth.xp = saved.xp;
  growth.points = saved.points;
  Object.assign(growth.spent, saved.spent);
}

export function ownedOf(pack: Pack): Saved['pack'] {
  return { gold: pack.gold, bag: { ...pack.bag }, worn: { ...pack.worn }, owned: [...pack.owned] };
}

export function repack(pack: Pack, saved: Saved['pack']): void {
  pack.gold = saved.gold;
  for (const id of Object.keys(pack.bag)) delete pack.bag[id];
  Object.assign(pack.bag, saved.bag);
  for (const place of Object.keys(pack.worn) as Place[]) delete pack.worn[place];
  Object.assign(pack.worn, saved.worn);
  pack.owned.clear();
  for (const id of saved.owned) pack.owned.add(id);
}
