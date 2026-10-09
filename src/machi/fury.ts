export const FURY = 100;
export const BLOW = 12;      // gained for each enemy a blow lands on
export const WOUND = 20;     // gained for each hit taken
export const CALM = 4;       // seconds without fighting before it starts to ebb
export const EBB = 10;       // lost per second once it does

/**
 * Cabral's fury, with nothing drawn. Where Inti's mana starts full and is
 * spent down, this starts empty and is earned: by landing blows and by
 * taking them. Left alone for a while it drains away again.
 */
export class Fury {
  value = 0;
  /** Seconds since it last rose. */
  private quiet = 0;

  /**
   * Raises it, up to the most it can hold, and holds off the ebb. Returns
   * what there was no room for.
   */
  gain(amount: number): number {
    const spill = Math.max(0, this.value + amount - FURY);
    this.value = Math.min(FURY, this.value + amount);
    this.quiet = 0;
    return spill;
  }

  /** Takes what an ability costs, if there is that much. Says whether it did. */
  spend(amount: number): boolean {
    if (this.value < amount) return false;
    this.value -= amount;
    return true;
  }

  update(dt: number): void {
    this.quiet += dt;
    if (this.quiet > CALM) this.value = Math.max(0, this.value - EBB * dt);
  }

  /** It is gone, as when he falls. */
  reset(): void {
    this.value = 0;
    this.quiet = 0;
  }
}
