import { GRENADE } from './grenade';

/**
 * What is on fire, and for how much longer. Something set alight goes on
 * burning wherever it goes, hurt every so often, until it burns out or dies.
 */
export class Burning<T> {
  private alight = new Map<T, { t: number; next: number }>();

  /** Sets it alight, or keeps it alight if it already is. */
  ignite(thing: T): void {
    const burn = this.alight.get(thing);
    if (burn) burn.t = GRENADE.smoulder;
    else this.alight.set(thing, { t: GRENADE.smoulder, next: GRENADE.scorch });
  }

  /**
   * Advances every fire. `each` is told how strongly the thing smoulders,
   * from 0 to 1, and how much the fire hurt it this step.
   */
  update(dt: number, alive: (thing: T) => boolean, each: (thing: T, glow: number, hurt: number) => void): void {
    for (const [thing, burn] of this.alight) {
      burn.t -= dt;
      burn.next -= dt;
      const burning = burn.t > 0 && alive(thing);
      let hurt = 0;
      // A long step can owe more than one scorch.
      while (burning && burn.next <= 0) {
        burn.next += GRENADE.scorch;
        hurt += GRENADE.burn;
      }
      // It dies down at the end rather than going out at once.
      each(thing, burning ? Math.min(1, burn.t / 0.8) : 0, hurt);
      if (!burning) this.alight.delete(thing);
    }
  }
}
