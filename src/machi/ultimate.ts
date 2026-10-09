/** What a hero's greatest power takes to charge. */
export const ULTIMATE = 100;

/**
 * The charge of a hero's greatest power, with nothing drawn. It is earned in
 * each one's own way, never ebbs and survives a fall: Inti gathers the orbs
 * her kills leave behind, Cabral fills it with the fury his sabre earns
 * once he has no more room for it.
 */
export class Charge {
  value = 0;

  get ready(): boolean {
    return this.value >= ULTIMATE;
  }

  add(amount: number): void {
    this.value = Math.min(ULTIMATE, this.value + Math.max(0, amount));
  }

  /** Lets it all go, if it is full. Says whether it did. */
  spend(): boolean {
    if (!this.ready) return false;
    this.value = 0;
    return true;
  }
}
