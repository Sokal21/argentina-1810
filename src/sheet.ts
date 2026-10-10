import type Phaser from 'phaser';
import { NAMES, STATS, STEP, toNext } from './machi/growth';
import { PEOPLE } from './npc/people';
import type { GameScene } from './scenes/GameScene';
import { THINGS } from './story/things';
import { FACTS } from './story/vado';

// The hero's own page: how far they have grown and what their points have
// gone into, with the points still to give out; what they carry; and what
// they have been told. I opens and closes it, and the game stands still
// behind it.

const STYLE = `
  #sheet {
    position: fixed; inset: 0; z-index: 26; display: flex; align-items: center; justify-content: center;
    background: rgba(12, 10, 8, .72); color: #f0e3c4; user-select: none;
    font: 21px/1.2 'Jacquard 12', Georgia, serif; letter-spacing: .02em;
  }
  #sheet[hidden] { display: none; }
  #sheet .panel {
    box-sizing: border-box; width: min(760px, 94vw); max-height: 94vh; overflow-y: auto; padding: 20px 30px 16px;
    background: #16120f; box-shadow: 0 0 0 3px #e2c478, 0 0 0 6px #0a0807;
  }
  #sheet h1 { margin: 0; font: 42px/1 'Jacquard 12', Georgia, serif; font-weight: normal; text-shadow: 0 3px 0 #0a0807; }
  #sheet h2 { margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #3a3027; font: inherit; font-weight: normal; color: #e2c478; }
  #sheet .top { display: flex; align-items: baseline; gap: 18px; }
  #sheet .top span { color: #cdbf9d; }
  #sheet .top .points { margin-left: auto; color: #8fd18a; }
  #sheet .bar { height: 6px; margin-top: 8px; background: #2a2018; box-shadow: 0 0 0 2px #0a0807; }
  #sheet .bar i { display: block; height: 100%; background: #e2c478; }
  #sheet .stat { display: grid; grid-template-columns: 11em 3.2em 1fr auto; gap: 0 14px; align-items: baseline; padding: 1px 0; }
  #sheet .stat em { font-style: normal; color: #8fd18a; }
  #sheet .stat small { font-size: 21px; color: #8f8168; }
  #sheet .stat button { all: unset; cursor: pointer; padding: 0 9px; color: #16120f; background: #8fd18a; }
  #sheet .stat button[disabled] { visibility: hidden; }
  #sheet .stat button:hover, #sheet .stat button:focus-visible { background: #c8f0c0; }
  #sheet ul { margin: 0; padding: 0; list-style: none; color: #cdbf9d; }
  #sheet li::before { content: '· '; color: #6b5c44; }
  #sheet .none { color: #6b5c44; }
  #sheet .foot { display: block; margin-top: 14px; text-align: center; font-size: 21px; color: #6b5c44; }
  @media (max-width: 620px) { #sheet .stat { grid-template-columns: 1fr auto auto; } #sheet .stat small { display: none; } }
`;

const HEROES = { inti: 'Inti', cabral: 'Cabral' };

/** Puts the page there to be opened with I, over a game. */
export function mountSheet(game: Phaser.Game): void {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'sheet', hidden: true }));
  const panel = root.appendChild(Object.assign(document.createElement('div'), { className: 'panel' }));
  const scene = () => (game.scene.isActive('game') || game.scene.isPaused('game') ? game.scene.getScene('game') as GameScene : null);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids);
    return node;
  };
  const list = (title: string, lines: string[], none: string) =>
    [el('h2', {}, title), lines.length ? el('ul', {}, ...lines.map(line => el('li', {}, line))) : el('div', { className: 'none' }, none)];

  const draw = () => {
    const s = scene();
    if (!s) return;
    const hero = s.playing, growth = s.growth, names = NAMES[hero];
    const stats = STATS.map(stat => {
      // What it has come to, as so much more than it began at.
      const more = Math.round(STEP[stat] * growth.spent[stat] * 100);
      const add = el('button', { textContent: '+', disabled: !growth.can(stat) });
      add.addEventListener('mousedown', e => e.preventDefault());
      add.addEventListener('click', () => { if (s.spend(stat)) draw(); });
      const locked = stat === 'ultimate' && growth.spent.ultimate >= growth.greatest;
      return el('div', { className: 'stat' },
        el('span', {}, names[stat].name),
        el('em', {}, more ? `+${more}%` : ''),
        el('small', {}, locked ? `${names[stat].does} · un punto cada cinco niveles` : names[stat].does),
        add);
    });
    const { has, knows } = s.carried;
    // What they were told is in the words of whoever told it, or of the story itself.
    const notes = Object.fromEntries(Object.values(PEOPLE).flatMap(p => p.favours.map(f => [f.key, f.note.replace(/^Dato conseguido: /, '')])));
    const told = (key: string) => notes[key] ?? FACTS[`sabe:${key}`] ?? key;
    panel.replaceChildren(
      el('div', { className: 'top' },
        el('h1', {}, HEROES[hero]),
        el('span', {}, `Nivel ${growth.level}`),
        el('span', {}, `${Math.floor(growth.xp)} de ${toNext(growth.level)} de experiencia`),
        el('span', { className: 'points' }, growth.points ? `${growth.points} ${growth.points === 1 ? 'punto' : 'puntos'} para repartir` : '')),
      el('div', { className: 'bar' }, el('i', { style: `width:${Math.min(100, growth.share * 100)}%` } as never)),
      el('h2', {}, 'Habilidades'), ...stats,
      ...list('Lleva', has.map(what => THINGS[what]?.name ?? what), 'Nada todavía.'),
      ...list('Sabe', knows.map(told), 'Nada todavía.'),
      el('span', { className: 'foot' }, 'I para volver'),
    );
  };

  let open = false;
  const toggle = () => {
    const s = scene();
    // Not while talking, nor while the game is stopped for something else.
    if (!s || document.body.classList.contains('talking')) return;
    if (!open && game.scene.isPaused('game')) return;
    open = !open;
    if (open) { game.scene.pause('game'); draw(); } else game.scene.resume('game');
    root.hidden = !open;
  };
  addEventListener('keydown', e => {
    if (e.repeat || (e.target as { tagName?: string } | null)?.tagName === 'INPUT') return;
    if (e.code === 'KeyI' || (open && e.code === 'Escape')) {
      // Escape closes this, and does not go on to open the pause menu.
      if (e.code === 'Escape') e.stopImmediatePropagation();
      toggle();
    }
  }, true);
}
