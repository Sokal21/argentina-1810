import type Phaser from 'phaser';
import type { Hero } from './machi/data';
import { NAMES, STATS, STEP, toNext } from './machi/growth';
import { ITEMS, PLACES, type Place } from './machi/pack';
import { PEOPLE } from './npc/people';
import type { GameScene } from './scenes/GameScene';
import { NAMED, THINGS } from './story/things';
import { pad } from './pad';
import { FACTS } from './story/vado';
import { feeling, renown } from './story/standing';
import { key, touch } from './touch';

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
  #sheet .book { position: relative; flex: none; background-repeat: no-repeat; image-rendering: pixelated; color: var(--ink); }
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
  /* Chosen with the gamepad, what can be pressed looks as pointed at, and needs no outline of its own. */
  #sheet .stat button:hover, #sheet .stat button:focus-visible, #sheet .stat button.pad-chosen { background-position: 100% 0; }
  #sheet .stat button.pad-chosen, #sheet .square.pad-chosen, #sheet .tabs button.pad-chosen { outline: none !important; }
  #sheet .stat button:active { transform: translate(1px, 1px); }
  #sheet img { image-rendering: pixelated; }
  #sheet .tabs { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--faint); }
  #sheet .tabs button { all: unset; cursor: pointer; color: var(--faint); }
  #sheet .tabs button.on { color: var(--accent); }
  #sheet .tabs button:hover, #sheet .tabs button.pad-chosen { color: var(--ink); }
  #sheet .gold { display: flex; align-items: center; gap: 4px; margin-left: auto; color: var(--ink); }
  #sheet .squares { display: grid; grid-template-columns: repeat(4, calc(22px * var(--kk))); gap: calc(2px * var(--kk)); margin-top: 3px; }
  #sheet .square {
    all: unset; position: relative; width: calc(22px * var(--kk)); height: calc(22px * var(--kk)); display: flex; align-items: center; justify-content: center;
    background: var(--square) 0 0 / 200% 100% no-repeat; image-rendering: pixelated;
  }
  #sheet .square.full { cursor: pointer; }
  #sheet .square:hover, #sheet .square:focus-visible, #sheet .square.pad-chosen { background-position: 100% 0; }
  #sheet .square .letter { color: var(--faint); opacity: .7; }
  #sheet .square .n { position: absolute; right: calc(2px * var(--kk)); bottom: 0; line-height: 1; color: var(--good); }
  /* What is pointed at, on a small board of its own beside it. */
  #sheet .tip {
    position: absolute; z-index: 2; width: max-content; max-width: calc(110px * var(--kk)); padding: 6px 10px 7px; pointer-events: none;
    background: #1c140e; color: #f0e3c4; box-shadow: 0 0 0 2px #7a5a36, 0 0 0 4px #0a0807, 4px 6px 0 4px rgba(0, 0, 0, .45);
  }
  #sheet .tip b { display: block; font-weight: normal; color: #e2c478; }
  #sheet .tip i { display: block; font-style: normal; color: #8f8168; }
  #sheet .tip p { margin: 4px 0; }
  #sheet .tip .act { color: #8fd18a; }
  #sheet ul { margin: 0; padding: 0; list-style: none; }
  #sheet li { margin-top: 2px; }
  #sheet .none { color: var(--faint); }
  #sheet .foot { color: #8f8168; }
  #sheet .foot.said { max-width: 92vw; text-align: center; color: #cdbf9d; }
  #sheet .side[hidden] { display: none; }
  #sheet .ways { display: flex; align-items: center; gap: 18px; }
  #sheet .ways .leave, #sheet .ways .turn { margin: 4px 0 0; }
  #sheet .turn { all: unset; cursor: pointer; padding: 8px 18px 9px; background: #2a2018; color: #e2c478; box-shadow: 0 0 0 2px #7a5a36, 0 0 0 4px #0a0807; font: 21px/1 'Jacquard 12', Georgia, serif; }
  body.touch #sheet .stat { min-height: 34px; align-items: center; }
  body.touch #sheet .tabs button { padding: 5px 0; }
`;

/** How many squares the bag has. */
const BAG = 8;
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
    const open2 = Math.floor(Math.min(innerWidth * 0.96 / page.w, (innerHeight - 40) * 0.96 / page.h));
    // Where the open book would be too small to read, on a screen held upright, one of its two
    // pages is shown at a time, through a window as wide as the page and a little of its edges.
    const single = open2 < 2 && innerHeight > innerWidth;
    const leafAt = page.sides[leaf], edge = Math.min(leafAt.x, 30);
    const k = single ? Math.max(1, Math.floor(Math.min(innerWidth * 0.98 / (leafAt.w + 2 * edge), (innerHeight - 130) / page.h))) : Math.max(1, open2);
    const wide = single ? Math.min(page.w, leafAt.w + 2 * edge, Math.floor(innerWidth * 0.98 / k)) : page.w;
    const from = single ? Math.max(0, Math.min(page.w - wide, Math.round(leafAt.x + leafAt.w / 2 - wide / 2))) : 0;
    const click = touch.on ? 'Tocá de nuevo' : 'Clic';
    const stats = STATS.map(stat => {
      // What it has come to, as so much more than it began at.
      const more = Math.round(STEP[stat] * growth.spent[stat] * 100);
      const add = el('button', { disabled: !growth.can(stat), ariaLabel: `Un punto en ${names[stat].name}` });
      const does = stat === 'ultimate' && growth.spent.ultimate >= growth.greatest ? `${names[stat].does} (un punto cada cinco niveles)` : names[stat].does;
      add.addEventListener('mousedown', e => e.preventDefault());
      add.addEventListener('click', () => { if (s.spend(stat)) draw(); });
      // With the gamepad there is no pointing either: choosing it says what it does below the book.
      add.addEventListener('mouseenter', () => { if (pad.on) asked.textContent = `${names[stat].name}: ${does}`; });
      add.addEventListener('mouseleave', () => { if (pad.on) asked.textContent = said; });
      // What a point in it does is told to whoever points at it: there is no room to write it out.
      const name = el('span', {}, names[stat].name);
      // By touch there is no pointing: touching its name says it below the book.
      name.addEventListener('click', () => { said = `${names[stat].name}: ${does}`; draw(); });
      return el('div', { className: 'stat', title: does }, name, el('em', {}, more ? `+${more}%` : ''), add);
    });
    const { has, knows } = s.carried;
    // What they were told is in the words of whoever told it, or of the story itself.
    const notes = Object.fromEntries(Object.values(PEOPLE).flatMap(p => p.favours.map(f => [f.key, f.note.replace(/^Dato conseguido: /, '')])));
    const told = (key: string) => (notes[key] ?? FACTS[`sabe:${key}`] ?? key).replace(/^./, first => first.toUpperCase());
    const coin = () => { const img = el('img', { src: 'cosas/moneda_chica.png', alt: '' }); img.addEventListener('load', () => { img.width = img.naturalWidth * Math.min(k, 2); }); return img; };
    const tabButton = (name: typeof tab, label: string) => {
      const b = el('button', { textContent: label, className: name === tab ? 'on' : '' });
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => { tab = name; draw(); });
      return b;
    };
    // What they own, set out in squares: what they wear, one square to a place, and below it
    // their bag. Whatever is pointed at brings up a small board beside it, and a click uses it,
    // puts it on or takes it off.
    const tipBoard = el('div', { className: 'tip', hidden: true });
    const tip = (cell?: HTMLElement, name = '', kind = '', does = '', act = '') => {
      tipBoard.hidden = !cell;
      if (!cell) return;
      tipBoard.replaceChildren(el('b', {}, name), el('i', {}, kind), ...(does ? [el('p', {}, does)] : []), ...(act ? [el('span', { className: 'act' }, act)] : []));
      // Beside the square, toward the middle of the page it is on, and never off the picture.
      const book = cell.closest('.book') as HTMLElement, from = cell.getBoundingClientRect(), frame = book.getBoundingClientRect();
      tipBoard.style.top = `${Math.max(0, Math.min(frame.height - tipBoard.offsetHeight, from.top - frame.top))}px`;
      tipBoard.style.left = `${Math.max(0, from.left - frame.left - tipBoard.offsetWidth - 8)}px`;
    };
    let made = 0;
    const bag = () => {
      const pack = s.pack;
      const icon = (src: string) => { const img = el('img', { src, alt: '' }); img.addEventListener('load', () => { img.width = img.naturalWidth * k; }); return img; };
      const square = (full: boolean, onPoint: (cell: HTMLElement) => void, onClick?: () => void, ...kids: (Node | string)[]) => {
        const cell = el('button', { className: `square${full ? ' full' : ''}` }, ...kids);
        cell.addEventListener('mousedown', e => e.preventDefault());
        if (!touch.on) {
          cell.addEventListener('mouseenter', () => onPoint(cell));
          cell.addEventListener('mouseleave', () => tip());
          if (onClick) cell.addEventListener('click', () => { onClick(); draw(); });
          return cell;
        }
        // By touch: touched once it is shown, touched again it is used.
        const n = made++;
        cell.addEventListener('click', () => {
          if (picked !== n || !onClick) { picked = n; onPoint(cell); return; }
          picked = undefined;
          onClick();
          draw();
        });
        return cell;
      };
      const words = (does: string) => does.split(': ').slice(-1)[0].replace(/^./, c => c.toUpperCase());
      const worn = (Object.keys(PLACES) as Place[]).map(place => {
        const id = pack.worn[place], item = id ? ITEMS[id] : undefined;
        return item
          ? square(true, cell => tip(cell, item.name, `${PLACES[place]} · puesto`, words(item.does), `${click} para sacárselo`), () => pack.wear(item.id), icon(item.icon))
          : square(false, cell => tip(cell, PLACES[place], 'Vacío'), undefined, el('span', { className: 'letter' }, PLACES[place][0]));
      });
      // The bag: what there is to use up, and what is owned to wear but not on.
      const loose = [...pack.owned].filter(id => pack.worn[ITEMS[id].wear!.place] !== id).map(id => {
        const item = ITEMS[id];
        return square(true, cell => tip(cell, item.name, PLACES[item.wear!.place], words(item.does), `${click} para ponérselo`), () => pack.wear(id), icon(item.icon));
      });
      const uses = Object.entries(pack.bag).filter(([, n]) => n > 0).map(([id, n]) => {
        const item = ITEMS[id], useful = s.useful(id);
        return square(true, cell => tip(cell, item.name, 'Se usa una vez', words(item.does), useful ? `${click} para usar` : 'Ahora no hace falta'),
          useful ? () => { s.use(id); } : undefined, icon(item.icon), el('span', { className: 'n' }, String(n)));
      });
      const kept = [...loose, ...uses];
      const empty = Array.from({ length: Math.max(0, BAG - kept.length) }, () => square(false, () => tip()));
      return [
        el('h2', {}, 'Lleva puesto'), el('div', { className: 'squares' }, ...worn),
        el('h2', {}, 'Bolsa'), el('div', { className: 'squares' }, ...kept, ...empty),
      ];
    };
    const side = (n: 0 | 1, ...kids: (Node | string)[]) => {
      const at = page.sides[n];
      return el('div', { className: 'side', hidden: single && n !== leaf, style: `left:${(at.x - from) * k}px;top:${at.y * k}px;width:${at.w * k}px;height:${at.h * k}px` } as never, ...kids);
    };
    const book = el('div', {
      className: 'book',
      style: `width:${wide * k}px;height:${page.h * k}px;background-image:url(${page.src});background-size:${page.w * k}px ${page.h * k}px;background-position:${-from * k}px 0;--k:${touch.on ? 3 : Math.min(k, 2)};--kk:${k};--plus:url(hud/mas_${hero}.png);--square:url(hud/cuadro_${hero}.png);--ink:${page.ink};--accent:${page.accent};--good:${page.good};--faint:${page.faint}`,
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
        // The two leaves of this side, and at the end of the line what they have to spend.
        el('div', { className: 'tabs' }, tabButton('bolsa', 'Bolsa'), tabButton('cuaderno', 'Cuaderno'), el('span', { className: 'gold' }, String(s.pack.gold), coin())),
        ...(tab === 'bolsa' ? bag() : [
          ...list('Lleva', has.map(what => THINGS[what]?.name ?? NAMED[what] ?? what), 'Nada todavía.'),
          ...list('Sabe', knows.map(told), 'Nada todavía.'),
          // How he is seen, once the story has anyone to see him.
          ...(s.tale?.quests.length ? (() => {
            const st = s.stands;
            return list('Cómo te ven', [`Pueblo: ${feeling(st.pueblo)}.`, `Frailes: ${feeling(st.frailes)}.`, `Tu nombre: ${renown(st.fama)}.`], '');
          })() : []),
        ])));
    book.append(tipBoard);
    // Below the book: what was last asked about, the way to its other page, and the way out.
    const turn = el('button', { className: 'turn', textContent: leaf ? '‹ Personaje' : 'Bolsa y cuaderno ›' });
    turn.addEventListener('click', () => { leaf = leaf ? 0 : 1; picked = undefined; draw(); });
    const asked = el('span', { className: 'foot said' }, said);
    root.replaceChildren(book,
      ...(said || pad.on ? [asked] : []),
      el('div', { className: 'ways' }, ...(single ? [turn] : []), touch.on ? leave : el('span', { className: 'foot' }, pad.on ? 'Ⓑ para volver' : 'I para volver')));
  };
  addEventListener('resize', () => { if (open) draw(); });

  let open = false;
  /** Which page is shown, where there is room for one only; what was last asked about; and by touch, which square was touched last. */
  let leaf: 0 | 1 = 0;
  let said = '';
  let picked: number | undefined;
  const leave = el('button', { className: 'leave', textContent: 'Volver' });
  leave.addEventListener('click', () => key('KeyI'));
  let tab: 'bolsa' | 'cuaderno' = 'bolsa';
  const toggle = () => {
    const s = scene();
    // Not while talking, nor while the game is stopped for something else.
    if (!s || document.body.classList.contains('talking')) return;
    if (!open && game.scene.isPaused('game')) return;
    open = !open;
    said = '';
    picked = undefined;
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
