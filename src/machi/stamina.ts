// Breath, as in the soulslikes: running spends it while it lasts and a dodge takes a share of it at
// once; it comes back once they ease off, after a moment. A dodge can be made with any breath left,
// however little, and leaves them spent; spent to nothing, they cannot run again until they have
// got back a fair part of it.

export const STAMINA = 100;
export const RUN = 1.6;        // how many times quicker running is than walking
const SPEND = 26;              // breath spent a second of running: about four seconds of it
const BACK = 22;               // got back a second, once resting
const PAUSE = 0.8;             // seconds before it starts coming back
const WINDED = 0.3;            // share of it needed again before running, once spent
export const DODGE = 24;       // what a dodge takes

export class Stamina {
  value = STAMINA;
  /** Spent to nothing, and not yet got back enough to run again. */
  winded = false;
  private rest = 0;

  /** Whether they are running this step: they want to, they are moving, and they have the breath. */
  update(dt: number, wants: boolean, moving: boolean): boolean {
    const running = wants && moving && !this.winded && this.value > 0;
    if (running) {
      this.value = Math.max(0, this.value - SPEND * dt);
      this.rest = 0;
      if (this.value === 0) this.winded = true;
    } else {
      this.rest += dt;
      if (this.rest >= PAUSE) this.value = Math.min(STAMINA, this.value + BACK * dt);
      if (this.winded && this.value >= STAMINA * WINDED) this.winded = false;
    }
    return running;
  }

  /** Whether a dodge can be made: any breath at all. */
  get canDodge(): boolean {
    return this.value > 0;
  }

  /** Takes what a dodge costs, once it has begun. Says whether there was breath for it. */
  dodge(): boolean {
    if (this.value <= 0) return false;
    this.value = Math.max(0, this.value - DODGE);
    this.rest = 0;
    if (this.value === 0) this.winded = true;
    return true;
  }

  /** How much is left, from 0 to 1. */
  get share(): number {
    return this.value / STAMINA;
  }

  /** Whole again, as when they rise. */
  reset(): void {
    this.value = STAMINA;
    this.winded = false;
    this.rest = 0;
  }
}
