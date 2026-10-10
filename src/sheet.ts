import type Phaser from 'phaser';
import type { Hero } from './machi/data';
import { NAMES, STATS, STEP, toNext } from './machi/growth';
import { ITEMS, PLACES, type Place } from './machi/pack';
import { PEOPLE } from './npc/people';
import type { GameScene } from './scenes/GameScene';
import { THINGS } from './story/things';
import { FACTS } from './story/vado';

// The hero's own page: how far they have grown and what their points have
// gone into, with the points still to give out; what they carry; and what
// they have been told. I opens and closes it, and the game stands still
// behind it. It is drawn in the manner of whoever it belongs to: his is a
// soldier's campaign notebook, hers two hides laced to a frame of roots.
// Each is a picture drawn empty, and what is written on it is laid over.

/** Each hero's page: its picture, where the two sides to write on are in it, and its inks. */
const PAGES: Record<Hero, { src: string; w: number; h: number; sides: [Side, Side]; ink: string; accent: string; good: string; faint: string }> = {
  cabral: {
    src: 'hud/hoja_cabral.png', w: 352, h: 225,
    sides: [{ x: 29, y: 22, w: 118, h: 173 }, { x: 168, y: 22, w: 118, h: 173 }],
    ink: '#2a1d12', accent: '#7a2416', good: '#2f6b2a', faint: '#8a7448',
  },
  inti: {
    src: 'hud/hoja_inti.png', w: 378, h: 226,
    sides: [{ x: 62, y: 49, w: 96, h: 128 }, { x: 221, y: 50, w: 96, h: 127 }],
    ink: '#2a1d12', accent: '#34482a', good: '#2f6b2a', faint: '#8c7a5e',
  },
};
interface Side { x: number; y: number; w: number; h: number }

const STYLE = `
  #sheet {
    position: fixed; inset: 0; z-index: 26; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: rgba(12, 10, 8, .78); user-select: none;
    font: 21px/1.15 'Jacquard 12', Georgia, serif; letter-spacing: .01em;
  }
  #sheet[hidden] { display: none; }
  #sheet .book { position: relative; flex: none; background-size: 100% 100%; image-rendering: pixelated; color: var(--ink); }
  #sheet .side { position: absolute; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; }
  #sheet h1, #sheet h2 { margin: 0; font: inherit; font-weight: normal; color: var(--accent); }
  #sheet h2 { margin-top: 6px; border-bottom: 2px solid var(--faint); }
  #sheet .top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  #sheet .bar { height: 6px; margin: 3px 0 2px; background: var(--faint); box-shadow: 0 0 0 2px var(--ink); }
  #sheet .bar i { display: block; height: 100%; background: var(--accent); }
  #sheet .xp { color: var(--faint); }
  #sheet .points { color: var(--good); }
  #sheet .stat { display: grid; grid-template-columns: 1fr auto auto; gap: 0 6px; align-items: baseline; min-height: calc(11px * var(--k) + 2px); }
  #sheet .stat span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #sheet .stat em { font-style: normal; color: var(--good); }
  /* A stud drawn for each hero, eleven pixels square: its second drawing, brighter, is shown when pointed at. */
  #sheet .stat button {
    all: unset; cursor: pointer; align-self: center; width: calc(11px * var(--k)); height: calc(11px * var(--k));
    background: var(--plus) 0 0 / 200% 100% no-repeat; image-rendering: pixelated;
  }
  #sheet .stat button[disabled] { visibility: hidden; }
  #sheet .stat button:hover, #sheet .stat button:focus-visible { background-position: 100% 0; }
  #sheet .stat button:active { transform: translate(1px, 1px); }
  #sheet img { image-rendering: pixelated; }
  #sheet .tabs { display: flex; gap: 10px; border-bottom: 2px solid var(--faint); }
  #sheet .tabs button { all: unset; cursor: pointer; color: var(--faint); }
  #sheet .tabs button.on { color: var(--accent); }
  #sheet .tabs button:hover { color: var(--ink); }
  #sheet .gold { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
  #sheet .place { display: flex; justify-content: space-between; gap: 8px; }
  #sheet .place .what { color: var(--faint); }
  #sheet .thing { display: grid; grid-template-columns: auto 1fr auto; gap: 0 6px; align-items: center; }
  #sheet .thing button { all: unset; cursor: pointer; padding: 0 6px; color: #f0e3c4; background: var(--accent); }
  #sheet .thing button[disabled] { visibility: hidden; }
  #sheet ul { margin: 0; padding: 0; list-style: none; }
  #sheet li { margin-top: 2px; }
  #sheet .none { color: var(--faint); }
  #sheet .foot { color: #8f8168; }
`;

const HEROES: Record<Hero, string> = { inti: 'Inti', cabral: 'Cabral' };

/** Puts the page there to be opened with I, over a game. */
export function mountSheet(game: Phaser.Game): void {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'sheet', hidden: true }));
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
    const hero = s.playing, growth = s.growth, names = NAMES[hero], page = PAGES[hero];
    // As large as the window lets it be, in whole pixels of its own.
    const k = Math.max(1, Math.floor(Math.min(innerWidth * 0.96 / page.w, (innerHeight - 40) * 0.96 / page.h)));
    const stats = STATS.map(stat => {
      // What it has come to, as so much more than it began at.
      const more = Math.round(STEP[stat] * growth.spent[stat] * 100);
      const add = el('button', { disabled: !growth.can(stat), ariaLabel: `Un punto en ${names[stat].name}` });
      add.addEventListener('mousedown', e => e.preventDefault());
      add.addEventListener('click', () => { if (s.spend(stat)) draw(); });
      const locked = stat === 'ultimate' && growth.spent.ultimate >= growth.greatest;
      // What a point in it does is told to whoever points at it: there is no room to write it out.
      return el('div', { className: 'stat', title: locked ? `${names[stat].does} (un punto cada cinco niveles)` : names[stat].does },
        el('span', {}, names[stat].name), el('em', {}, more ? `+${more}%` : ''), add);
    });
    const { has, knows } = s.carried;
    // What they were told is in the words of whoever told it, or of the story itself.
    const notes = Object.fromEntries(Object.values(PEOPLE).flatMap(p => p.favours.map(f => [f.key, f.note.replace(/^Dato conseguido: /, '')])));
    const told = (key: string) => (notes[key] ?? FACTS[`sabe:${key}`] ?? key).replace(/^./, first => first.toUpperCase());
    const tabButton = (name: typeof tab, label: string) => {
      const b = el('button', { textContent: label, className: name === tab ? 'on' : '' });
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => { tab = name; draw(); });
      return b;
    };
    // What they own: their money, what they wear in each place, and what they have to use up.
    const bag = () => {
      const pack = s.pack, kk = Math.min(k, 2);
      const icon = (src: string) => { const img = el('img', { src, alt: '' }); img.addEventListener('load', () => { img.width = img.naturalWidth * kk; }); return img; };
      const worn = (Object.keys(PLACES) as Place[]).map(place => {
        const id = pack.worn[place], item = id ? ITEMS[id] : undefined;
        return el('div', { className: 'place', title: item?.does ?? '' }, el('span', { className: 'what' }, PLACES[place]), el('span', { className: item ? '' : 'none' }, item?.name ?? '—'));
      });
      const uses = Object.entries(pack.bag).filter(([, n]) => n > 0).map(([id, n]) => {
        const item = ITEMS[id];
        const use = el('button', { textContent: 'usar', disabled: !s.useful(id) });
        use.addEventListener('mousedown', e => e.preventDefault());
        use.addEventListener('click', () => { if (s.use(id)) draw(); });
        return el('div', { className: 'thing', title: item.does }, icon(item.icon), el('span', {}, `${item.name} ×${n}`), use);
      });
      return [
        el('div', { className: 'gold' }, icon('cosas/moneda.png'), `${pack.gold} reales`),
        el('h2', {}, 'Lleva puesto'), ...worn,
        el('h2', {}, 'Para usar'), ...(uses.length ? uses : [el('div', { className: 'none' }, 'Nada todavía.')]),
      ];
    };
    const side = (n: 0 | 1, ...kids: (Node | string)[]) => {
      const at = page.sides[n];
      return el('div', { className: 'side', style: `left:${at.x * k}px;top:${at.y * k}px;width:${at.w * k}px;height:${at.h * k}px` } as never, ...kids);
    };
    const book = el('div', {
      className: 'book',
      style: `width:${page.w * k}px;height:${page.h * k}px;background-image:url(${page.src});--k:${Math.min(k, 2)};--plus:url(hud/mas_${hero}.png);--ink:${page.ink};--accent:${page.accent};--good:${page.good};--faint:${page.faint}`,
    } as never,
      side(0,
        el('div', { className: 'top' }, el('h1', {}, HEROES[hero]), el('span', {}, `Nivel ${growth.level}`)),
        el('div', { className: 'bar' }, el('i', { style: `width:${Math.min(100, growth.share * 100)}%` } as never)),
        // How far along, and beside it the points still to give out.
        el('div', { className: 'top' },
          el('span', { className: 'xp' }, `${Math.floor(growth.xp)} de ${toNext(growth.level)}`),
          el('span', { className: 'points' }, growth.points ? `${growth.points} ${growth.points === 1 ? 'punto' : 'puntos'}` : '')),
        ...stats),
      side(1,
        el('div', { className: 'tabs' }, tabButton('bolsa', 'Bolsa'), tabButton('cuaderno', 'Cuaderno')),
        ...(tab === 'bolsa' ? bag() : [
          ...list('Lleva', has.map(what => THINGS[what]?.name ?? what), 'Nada todavía.'),
          ...list('Sabe', knows.map(told), 'Nada todavía.'),
        ])));
    root.replaceChildren(book, el('span', { className: 'foot' }, 'I para volver'));
  };
  addEventListener('resize', () => { if (open) draw(); });

  let open = false;
  let tab: 'bolsa' | 'cuaderno' = 'bolsa';
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
