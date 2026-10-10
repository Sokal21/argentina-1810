import type { Hero } from './data';

// What each hero carries to drink from when things go badly: a few
// draughts, and no more until somewhere safe is reached again. His gives
// back life; hers, mana.

/** Draughts in a full flask. */
export const DRAUGHTS = 3;
/** Seconds between one draught and the next. */
export const SWALLOW = 1;
/** Seconds a draught takes: the hero stands rooted for it, and can be hit. */
export const DRINKING = 0.8;

/** What each hero's flask is, and how much a draught gives back: of his life, in blows; of her mana, in points. */
export const FLASKS: Record<Hero, { name: string; restores: 'life' | 'mana'; amount: number }> = {
  cabral: { name: 'Chifle de caña', restores: 'life', amount: 3 },
  inti: { name: 'Calabaza de muday', restores: 'mana', amount: 60 },
};

/** A flask, with nothing drawn. */
export class Flask {
  left = DRAUGHTS;
  /** Seconds until another draught can be taken. */
  private wait = 0;

  /** Whether a draught can be taken now. */
  get ready(): boolean {
    return this.left > 0 && this.wait <= 0;
  }

  /** Takes a draught, if there is one and the last has gone down. Says whether it did. */
  drink(): boolean {
    if (!this.ready) return false;
    this.left--;
    this.wait = SWALLOW;
    return true;
  }

  /** Fills it again. Says whether there was anything to fill. */
  refill(): boolean {
    if (this.left === DRAUGHTS) return false;
    this.left = DRAUGHTS;
    return true;
  }

  update(dt: number): void {
    this.wait = Math.max(0, this.wait - dt);
  }
}
