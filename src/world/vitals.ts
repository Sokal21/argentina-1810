// How much punishment something can take, with no drawing involved.

export class Vitals {
  life: number;
  /** Seconds of protection left after the last hit. */
  private mercy = 0;
  /** Seconds since she fell, or null while standing. */
  private fallen: number | null = null;

  /**
   * @param max     hits it takes to fall
   * @param grace   seconds after a hit during which further hits do nothing,
   *                so a volley cannot take everything at once
   * @param recover seconds on the ground before getting back up at full life
   */
  constructor(readonly max: number, private grace: number, private recover: number) {
    this.life = max;
  }

  get standing(): boolean { return this.fallen === null; }
  get protected(): boolean { return this.mercy > 0; }

  /**
   * Takes a hit if one can land. Says whether it did. One who is `deathless`
   * feels the hit all the same, but it cannot take the last of their life.
   */
  hit(deathless = false): boolean {
    if (!this.standing || this.protected) return false;
    if (!deathless || this.life > 1) this.life--;
    this.mercy = this.grace;
    if (this.life <= 0) this.fallen = 0;
    return true;
  }

  /** Gives back life, up to the most it can have. */
  heal(amount: number): void {
    if (this.standing) this.life = Math.min(this.max, this.life + amount);
  }

  /** Advances time. Returns true on the step it gets back up. */
  update(dt: number): boolean {
    this.mercy = Math.max(0, this.mercy - dt);
    if (this.fallen === null) return false;
    this.fallen += dt;
    if (this.fallen < this.recover) return false;
    this.fallen = null;
    this.life = this.max;
    this.mercy = this.grace;
    return true;
  }
}
