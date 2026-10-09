/** Cabral's greatest power: a fury past all holding, for a short while. */
export const RAGE = {
  time: 8,        // seconds it lasts
  roar: 0.7,      // seconds he stands with his sabre raised as it begins
  pace: 1.55,     // how much faster he walks
  glow: 0.5,      // how strongly he burns to look at, from 0 to 1
  haste: 1.55,    // how much faster he cuts
  aura: 52,       // ground distance within which his heat hurts
  scorch: 0.5,    // seconds between each time it does
  burn: 1,        // how much it hurts each time
};

/**
 * The rage itself, with nothing drawn. While it lasts he cannot be killed,
 * his fury stays at the brim, he is faster on his feet and with his sabre,
 * and whatever stands close to him is scorched. He uses nothing but the
 * sabre until it is over.
 */
export class Rage {
  /** Seconds left of it, or 0 when he is himself. */
  left = 0;
  private next = 0;

  get active(): boolean {
    return this.left > 0;
  }

  /** How much of it is left, from 1 down to 0. */
  share(time = RAGE.time): number {
    return Math.min(1, this.left / time);
  }

  start(time = RAGE.time): void {
    this.left = time;
    this.next = RAGE.scorch;
  }

  /** Advances it. Returns how much his heat hurts what is near him this step. */
  update(dt: number): number {
    if (!this.active) return 0;
    this.left = Math.max(0, this.left - dt);
    this.next -= dt;
    let hurt = 0;
    while (this.next <= 0) {
      this.next += RAGE.scorch;
      hurt += RAGE.burn;
    }
    return hurt;
  }

  /** It is over, as when the game starts again. */
  stop(): void {
    this.left = 0;
  }
}
