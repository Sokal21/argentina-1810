import type { Hero } from '../machi/data';

/** Who someone is, for a conversation: all of it written by us, none of it by the model. */
export interface Npc {
  /** The name they are known by in the game's own workings. */
  id: string;
  name: string;
  /** Who they are and how they speak. */
  self: string;
  /** How they take each hero when they walk in. */
  sees: Record<Hero, string>;
  /** How far they trust a stranger to begin with, from 0 to 10. */
  trust: number;
  /** What they can be brought to do, each once, and how much trust it takes. */
  favours: Favour[];
  /** What they ask of whoever they are talking to, each once. */
  errands?: Errand[];
  /** What they say before anyone has spoken. */
  greets: string;
  /** What whoever comes back gets from them once they have had enough: they do not talk again. */
  closed: string;
  /** Their picture in a conversation and on the ground, once they have been drawn. */
  portrait?: string;
  sprite?: string;
  /** What they do while they stand there, once it has been drawn. */
  idle?: Idle;
  /** What they sell, by the names the things are known by. */
  sells?: string[];
  /** The colour their side of a conversation is lit in. */
  accent: string;
}

/** A row of square frames of someone standing about, played round and round. */
export interface Idle {
  sheet: string;
  /** The side of a frame, and how many there are. */
  size: number;
  frames: number;
  /** Frames a second. */
  rate: number;
  /** Where their feet are in a frame: across it, and how far up from its bottom row. */
  ax: number;
  up: number;
}

/** Something they ask to have done. It is taken on by telling them so, not by hearing them out. */
export interface Errand {
  key: string;
  /** The word the model answers with when the other has just taken it on. */
  wants: string;
  /** What they are told about it while it is theirs to ask, and once it has been taken on. */
  asks: string;
  taken: string;
  /**
   * Words of the hero's that take it on by themselves. A model does not always say that he has
   * just agreed; the game hears him anyway, unless he has put a "no" before them.
   */
  agrees?: string[];
  /** Shown to the player when it is taken on. */
  note: string;
}

export interface Favour {
  key: string;
  /** The word the model answers with when they mean to do it. */
  wants: string;
  /** Trust at which they will do it if it comes up. */
  needs: number;
  /** What they are told about it before they trust that much, once they do, and after it is done. */
  withheld: string;
  granted: string;
  given: string;
  /**
   * Words that give it away when they say it aloud. A model often tells what it knows
   * without saying that it meant to; the game hears it anyway, once they trusted enough to.
   */
  tells?: string[];
  /** Shown to the player when it happens. */
  note: string;
  /** What it does to the game, if anything, by the name the scene knows it under. */
  effect?: 'heal';
}
