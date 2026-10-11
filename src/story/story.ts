// What has happened in a game, and what follows from it. Everything that
// matters to the story reaches it as a happening, a short word of what took
// place ("en:La posada", "acepto:hijo", "tiene:poncho"). It keeps them all,
// and from them and nothing else says which missions are open, which step
// of each is the one to do, and what the hero has and knows. Nothing here
// is drawn, and nothing here knows how a thing came about: whether someone
// was talked to by writing or by choosing is all one to it.

/** Coming to a place or into a zone: it happens each time, and is not kept. */
const PASSING = /^(en|zona):/;

/** A mission: what opens it, and the steps it is done in. */
export interface Quest {
  id: string;
  name: string;
  /** Any one of these happening opens it: a mission has more than one door. */
  opens: string[];
  /** In order. Each is done when any one of its happenings has taken place. */
  steps: Step[];
  /** What having done it leaves: happenings of its own, which may open others. */
  leaves?: string[];
  /** The experience doing it is worth, and the money it pays. */
  xp?: number;
  gold?: number;
}

export interface Step {
  /** What the player is told to do. */
  says: string;
  /** It is done when any one of these has happened, */
  when?: string[];
  /** or when every one of these has, in whatever order. */
  all?: string[];
}

/** What a happening brought about, for whoever shows it. */
export type News =
  | { kind: 'opened'; quest: Quest }
  | { kind: 'step'; quest: Quest; step: Step }
  | { kind: 'done'; quest: Quest };

export class Story {
  /** Everything that has happened, in the order it did. */
  readonly happened: string[] = [];
  private seen = new Set<string>();
  /** For each mission that has opened, how many of its steps are done. */
  private progress = new Map<string, number>();
  private listeners: ((news: News[]) => void)[] = [];

  constructor(readonly quests: Quest[]) {}

  /** Has this taken place? */
  has(happening: string): boolean {
    return this.seen.has(happening);
  }

  /** Is the hero carrying this? */
  holds(item: string): boolean {
    return this.seen.has(`tiene:${item}`);
  }

  /** Does the hero know this? */
  knows(fact: string): boolean {
    return this.seen.has(`sabe:${fact}`);
  }

  /** Whether a mission has opened, and whether it is done. */
  isOpen(id: string): boolean {
    return this.progress.has(id);
  }
  isDone(id: string): boolean {
    const quest = this.quests.find(q => q.id === id);
    return !!quest && this.progress.get(id) === quest.steps.length;
  }

  /** The missions under way, each with the step that is to be done now. */
  get current(): { quest: Quest; step: Step }[] {
    return this.quests.flatMap(quest => {
      const done = this.progress.get(quest.id);
      return done === undefined || done >= quest.steps.length ? [] : [{ quest, step: quest.steps[done] }];
    });
  }

  // Whether a step is done by what has happened so far.
  private met(step: Step): boolean {
    return !!step.when?.some(w => this.seen.has(w)) || (!!step.all?.length && step.all.every(a => this.seen.has(a)));
  }

  /** How many of the things a step waits on all of have happened. */
  count(step: Step): number {
    return (step.all ?? []).filter(a => this.seen.has(a)).length;
  }

  /** Is told of whatever follows from each happening, as it follows. */
  listen(listener: (news: News[]) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Something took place. Says what came of it, having settled everything
   * that follows: a step done may finish a mission, and that may open another.
   * What has already happened does not happen again, except coming to a place:
   * that is not kept. It counts for whatever step is waiting on it at the
   * moment and is then forgotten, so "go back to the village" is not done
   * already for having been there before.
   */
  tell(happening: string): News[] {
    if (this.seen.has(happening)) return [];
    const news: News[] = [];
    const waiting = [happening];
    const passing = new Set<string>();
    while (waiting.length) {
      const next = waiting.shift()!;
      if (this.seen.has(next)) continue;
      this.seen.add(next);
      if (PASSING.test(next)) passing.add(next);
      else this.happened.push(next);
      // Settled over and over until nothing more moves: steps are done in order, and a
      // later one may already have happened before the mission opened.
      for (let moved = true; moved;) {
        moved = false;
        for (const quest of this.quests) {
          const done = this.progress.get(quest.id);
          if (done === undefined) {
            if (!quest.opens.some(o => this.seen.has(o))) continue;
            this.progress.set(quest.id, 0);
            news.push({ kind: 'opened', quest });
            moved = true;
          } else if (done < quest.steps.length && this.met(quest.steps[done])) {
            this.progress.set(quest.id, done + 1);
            if (done + 1 < quest.steps.length) news.push({ kind: 'step', quest, step: quest.steps[done + 1] });
            else {
              news.push({ kind: 'done', quest });
              waiting.push(`hecha:${quest.id}`, ...(quest.leaves ?? []));
            }
            moved = true;
          }
        }
      }
    }
    for (const gone of passing) this.seen.delete(gone);
    if (news.length) for (const listener of this.listeners) listener(news);
    return news;
  }
}
