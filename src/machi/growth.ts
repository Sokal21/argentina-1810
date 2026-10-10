import type { Hero } from './data';

// How a hero grows. What they do earns experience; enough of it and they
// go up a level, and each level is a point to put into one of the things
// they do. What a level takes grows steeply, so that country that was hard
// once stops being worth the fighting: a map can bring a hero up about so
// far and no further, however long is spent in it.

/** What a point can be put into. */
export type Stat = 'basic' | 'first' | 'second' | 'speed' | 'life' | 'flow' | 'ultimate';
export const STATS: Stat[] = ['basic', 'first', 'second', 'speed', 'life', 'flow', 'ultimate'];

/**
 * How much each point adds, as a share of what it was to begin with. Levels come seldom, so a
 * point has to be felt: one in life is a whole blow more that can be taken, and two in the
 * basic attack bring a soldier down in a blow less.
 */
export const STEP: Record<Stat, number> = { basic: 0.2, first: 0.25, second: 0.25, speed: 0.06, life: 0.2, flow: 0.2, ultimate: 0.25 };

/** A point may go to their greatest power once for every this many levels. */
export const EVERY = 5;

/** Experience from level 1 to 2, and how many times more each level after takes than the one before. */
export const FIRST = 150, STEEPER = 2.2;

/** What bringing each kind of enemy down is worth. */
export const WORTH = { cubo: 2, chonchon: 5, realista: 6 };

/** What each of them is called for each hero, and what a point in it does. */
export const NAMES: Record<Hero, Record<Stat, { name: string; does: string }>> = {
  cabral: {
    basic: { name: 'Sable', does: 'más daño en cada sablazo' },
    first: { name: 'Tiro de mosquete', does: 'más daño del disparo' },
    second: { name: 'Granada', does: 'más daño de la granada y de su fuego' },
    speed: { name: 'Paso', does: 'camina más rápido' },
    life: { name: 'Vida', does: 'aguanta más golpes' },
    flow: { name: 'Furia', does: 'junta furia más rápido' },
    ultimate: { name: 'Furia desatada', does: 'dura más' },
  },
  inti: {
    basic: { name: 'Hechizo', does: 'más daño en cada hechizo' },
    first: { name: 'Rayo del Pillán', does: 'más daño del rayo' },
    second: { name: 'Lawen', does: 'cura más' },
    speed: { name: 'Paso', does: 'camina más rápido' },
    life: { name: 'Vida', does: 'aguanta más golpes' },
    flow: { name: 'Maná', does: 'recupera maná más rápido' },
    ultimate: { name: 'Nahuel', does: 'se queda más tiempo' },
  },
};

/** Experience it takes to go from a level to the next. */
export function toNext(level: number): number {
  return Math.round(FIRST * STEEPER ** (level - 1));
}

/** A hero's growth, with nothing drawn. */
export class Growth {
  level = 1;
  /** Experience earned toward the next level. */
  xp = 0;
  /** Points not yet put into anything. */
  points = 0;
  readonly spent: Record<Stat, number> = { basic: 0, first: 0, second: 0, speed: 0, life: 0, flow: 0, ultimate: 0 };

  /** How far toward the next level, from 0 up to 1. */
  get share(): number {
    return this.xp / toNext(this.level);
  }

  /** Earns experience. Says how many levels were gained by it. */
  earn(xp: number): number {
    this.xp += Math.max(0, xp);
    let gained = 0;
    for (; this.xp >= toNext(this.level); gained++) {
      this.xp -= toNext(this.level);
      this.level++;
      this.points++;
    }
    return gained;
  }

  /** How many points their greatest power may have by now. */
  get greatest(): number {
    return Math.floor(this.level / EVERY);
  }

  /** Whether a point can be put into something now. */
  can(stat: Stat): boolean {
    return this.points > 0 && (stat !== 'ultimate' || this.spent.ultimate < this.greatest);
  }

  /** Puts a point into something. Says whether it did. */
  put(stat: Stat): boolean {
    if (!this.can(stat)) return false;
    this.points--;
    this.spent[stat]++;
    return true;
  }

  /** How many times what it was to begin with something is now. */
  gives(stat: Stat): number {
    return 1 + STEP[stat] * this.spent[stat];
  }
}

/** Each hero's growth, for as long as the page is open. */
export const GROWTHS: Record<Hero, Growth> = { inti: new Growth(), cabral: new Growth() };
