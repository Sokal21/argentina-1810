import type { Line, Reply, Voice } from './talk';

// A conversation by choosing what to say instead of writing it: for where no
// model answers. It is the same conversation underneath. What is offered is
// written out beforehand, with what they answer and how it sits with them;
// trust, favours and having had enough are still settled by `Talk`, exactly
// as when a model speaks, so the story cannot tell the two apart.

/** One thing the player can say, and what comes of it. */
export interface Option {
  /** What the player says. No two in a script are the same. */
  says: string;
  /** What they answer. */
  answer: string;
  /** How it sits with them: from -2 to 2, as a model would have judged it. */
  animo: -2 | -1 | 0 | 1 | 2;
  /** What they mean to do on answering: the `wants` of one of their favours, or 'echar'. Nothing if unsaid. */
  quiere?: string;
}

/** A moment of the conversation: two or three things to say, of which one is chosen. It comes up once. */
export interface Beat {
  id: string;
  /** It comes up only once they trust this much, */
  trust?: number;
  /** and only while they trust less than this, */
  below?: number;
  /** and only after these other moments have passed. */
  after?: string[];
  options: Option[];
}

export interface Script {
  /** Whose it is, by the name the game knows them under. */
  who: string;
  /** In the order they are tried: the first that can come up is the one offered. */
  beats: Beat[];
}

/** The moments of a script that have passed already, going by what has been said. */
export function passed(script: Script, lines: Line[]): Set<string> {
  const said = new Set(lines.filter(line => line.who === 'player').map(line => line.text));
  return new Set(script.beats.filter(beat => beat.options.some(option => said.has(option.says))).map(beat => beat.id));
}

/** What is offered now, if anything is left to say. */
export function offered(script: Script, trust: number, lines: Line[]): Beat | undefined {
  const done = passed(script, lines);
  return script.beats.find(beat => !done.has(beat.id)
    && trust >= (beat.trust ?? 0) && trust < (beat.below ?? Infinity)
    && (beat.after ?? []).every(id => done.has(id)));
}

/** A voice that answers what was written for whichever option was just said. */
export function scripted(script: Script): Voice {
  return async (_system: string, lines: Line[]): Promise<Reply> => {
    const said = lines[lines.length - 1]?.text;
    const option = script.beats.flatMap(beat => beat.options).find(o => o.says === said);
    if (!option) return { dice: '...', animo: 0, quiere: 'nada' };
    return { dice: option.answer, animo: option.animo, quiere: option.quiere ?? 'nada' };
  };
}
