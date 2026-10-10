import type { News, Story } from './story';

// What the player is shown of the story: the step to be done now of each
// mission under way, and a word when one opens, moves on or is done. It is
// drawn by the page, over the game, in the letter the rest of the game's
// words are in.

const STYLE = `
  #quests {
    position: fixed; left: 16px; top: 108px; z-index: 15; max-width: min(380px, 60vw); pointer-events: none; user-select: none;
    font: 21px/1.15 'Jacquard 12', Georgia, serif; color: #f0e3c4; text-shadow: 0 2px 0 #14110f, 0 0 10px rgba(0, 0, 0, .9);
  }
  #quests b { display: block; font-weight: normal; color: #e2c478; letter-spacing: .03em; }
  #quests div { margin-bottom: 10px; }
  #quests .news { color: #8fd18a; opacity: 0; transition: opacity .5s; margin-bottom: 4px; }
  #quests .news.shown { opacity: 1; }
  body.talking #quests, body.title #quests { display: none; }
`;
const STAYS = 5200;   // milliseconds a word of news is left up

/** Puts the story on the page, and keeps it up to date. Returns what takes it off again. */
export function mountBoard(story: Story, facts: Record<string, string> = {}): { say(text: string): void; remove(): void } {
  const style = document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'quests' }));
  const list = root.appendChild(document.createElement('section'));
  const news = root.appendChild(document.createElement('section'));

  const draw = () => {
    list.replaceChildren(...story.current.map(({ quest, step }) => {
      const item = document.createElement('div');
      item.append(Object.assign(document.createElement('b'), { textContent: quest.name }), step.says);
      return item;
    }));
  };
  // Each word of news has its own line and its own time: one does not push another out.
  const say = (text: string) => {
    const line = news.appendChild(Object.assign(document.createElement('div'), { className: 'news', textContent: text }));
    requestAnimationFrame(() => line.classList.add('shown'));
    window.setTimeout(() => line.classList.remove('shown'), STAYS);
    window.setTimeout(() => line.remove(), STAYS + 600);
  };
  const told = (all: News[]) => {
    draw();
    // The last thing that came of it is the one worth a word.
    const last = [...all].reverse().find(n => n.kind !== 'step') ?? all[all.length - 1];
    if (last.kind === 'opened') say(`Misión nueva: ${last.quest.name}`);
    else if (last.kind === 'done') {
      const learnt = (last.quest.leaves ?? []).map(l => facts[l]).filter(Boolean);
      say([`Cumplida: ${last.quest.name}`, ...learnt].join(' · '));
    }
  };
  story.listen(told);
  draw();
  return { say, remove: () => { root.remove(); style.remove(); } };
}
