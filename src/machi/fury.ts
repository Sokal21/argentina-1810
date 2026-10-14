export const FURY = 100;
export const BLOW = 12;      // gained for each enemy a blow lands on
export const WOUND = 20;     // gained for each hit taken

/**
 * Cabral's fury, with nothing drawn. Where Inti's mana starts full and is
 * spent down, this starts empty and is earned: by landing blows and by
 * taking them. It does not drain away: what was earned is kept until it is
 * spent, or until he falls.
 */
export class Fury {
  value = 0;

  /**
   * Raises it, up to the most it can hold. Returns what there was no room
   * for.
   */
  gain(amount: number): number {
    const spill = Math.max(0, this.value + amount - FURY);
    this.value = Math.min(FURY, this.value + amount);
    return spill;
  }

  /** Takes what an ability costs, if there is that much. Says whether it did. */
  spend(amount: number): boolean {
    if (this.value < amount) return false;
    this.value -= amount;
    return true;
  }

  /** It is gone, as when he falls. */
  reset(): void {
    this.value = 0;
  }
}
