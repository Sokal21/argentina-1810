import type Phaser from 'phaser';
import { ITEMS } from './machi/pack';
import type { Npc } from './npc/npc';
import type { GameScene } from './scenes/GameScene';

// Buying from someone: their display case, as in the old dungeon games. A
// cabinet of dark wood with what they sell set out in its compartments, their
// name on the board above and, on the plank below, whatever is pointed at:
// what it is, what it costs and what it does. The cabinet is a picture drawn
// empty; the compartments and what stands in them are laid over it. T opens
// it beside whoever sells, and the game stands still behind it.

const CASE = {
  src: 'hud/escaparate.png', w: 323, h: 219,
  sign: { x: 90, y: 2, w: 142, h: 30 },
  back: { x: 54, y: 46, w: 212, h: 102 },
  plank: { x: 40, y: 187, w: 244, h: 28 },
  // The compartments: how many across and down, and the side of one with the gap to the next.
  cols: 6, rows: 3, cell: 28, gap: 4,
};

const STYLE = `
  #shop {
    position: fixed; inset: 0; z-index: 26; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: rgba(12, 10, 8, .78); user-select: none; color: #f0e3c4;
    font: 21px/1.1 'Jacquard 12', Georgia, serif; letter-spacing: .01em; text-shadow: 0 2px 0 #1a120c;
  }
  #shop[hidden] { display: none; }
  #shop .case { position: relative; flex: none; background-size: 100% 100%; image-rendering: pixelated; }
  #shop .part { position: absolute; }
  #shop img { image-rendering: pixelated; }
  #shop .sign { display: flex; align-items: center; justify-content: center; color: #f0e3c4; }
  #shop .grid { display: grid; grid-template-columns: repeat(var(--cols), calc(var(--cell) * var(--k) * 1px)); gap: calc(var(--gap) * var(--k) * 1px); align-content: center; justify-content: center; }
  #shop .cell {
    all: unset; position: relative; width: calc(var(--cell) * var(--k) * 1px); height: calc(var(--cell) * var(--k) * 1px);
    display: flex; align-items: center; justify-content: center;
    background: url(hud/casilla.png) 0 0 / 200% 100% no-repeat; image-rendering: pixelated;
  }
  #shop .cell.full { cursor: pointer; }
  #shop .cell.full:hover, #shop .cell.full:focus-visible { background-position: 100% 0; }
  #shop .cell.dear img { filter: saturate(.3) brightness(.6); }
  #shop .cell.had img { opacity: .45; }
  #shop .cell .n { position: absolute; right: calc(4px * var(--k)); bottom: calc(2px * var(--k)); font-size: 21px; line-height: 1; color: #8fd18a; }
  #shop .plank { display: flex; flex-direction: column; justify-content: center; padding: 0 calc(5px * var(--k)); box-sizing: border-box; color: #2a1d12; text-shadow: none; }
  #shop .plank .line { display: flex; justify-content: space-between; align-items: center; gap: 10px; white-space: nowrap; }
  #shop .plank .price, #shop .plank .gold { display: flex; align-items: center; gap: 4px; }
  #shop .plank .dear { color: #7a2416; }
  #shop .plank .does { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4a3520; }
  #shop .foot { color: #8f8168; text-shadow: none; }
`;

/** Puts the price list there to be opened beside whoever sells, over a game. */
export function mountShop(game: Phaser.Game): void {
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'shop', hidden: true }));
  const scene = () => (game.scene.isActive('game') || game.scene.isPaused('game') ? game.scene.getScene('game') as GameScene : null);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids);
    return node;
  };
  const pic = (src: string, k: number) => {
    const img = el('img', { src, alt: '' });
    img.addEventListener('load', () => { img.width = img.naturalWidth * k; });
    return img;
  };

  let seller: Npc | undefined;
  /** What is pointed at, and a word on what was last done. */
  let shown: string | undefined, told = '';
  const draw = () => {
    const s = scene();
    if (!s || !seller) return;
    const pack = s.pack, hero = s.playing;
    const k = Math.max(1, Math.floor(Math.min(innerWidth * 0.96 / CASE.w, (innerHeight - 40) * 0.96 / CASE.h)));
    const part = (name: string, at: { x: number; y: number; w: number; h: number }, ...kids: (Node | string)[]) =>
      el('div', { className: `part ${name}`, style: `left:${at.x * k}px;top:${at.y * k}px;width:${at.w * k}px;height:${at.h * k}px` } as never, ...kids);
    const coin = () => pic('cosas/moneda_chica.png', Math.min(k, 2));
    // The plank: what is pointed at, or what the hero has to spend.
    const plank = part('plank', CASE.plank);
    const say = (id?: string) => {
      const item = id ? ITEMS[id] : undefined;
      const had = !!item?.wear && pack.owned.has(item.id);
      plank.replaceChildren(
        el('div', { className: 'line' },
          el('span', {}, item ? item.name : told || 'Señalá algo para verlo.'),
          item && !had
            ? el('span', { className: `price${pack.gold < item.price ? ' dear' : ''}` }, String(item.price), coin())
            : el('span', {}, had ? 'ya lo tenés' : '')),
        el('div', { className: 'line' },
          el('span', { className: 'does' }, item ? item.does : 'Clic para comprar.'),
          el('span', { className: 'gold' }, `Tenés ${pack.gold}`, coin())));
    };
    const stock = (seller.sells ?? []).map(id => ITEMS[id]).filter(item => item && (!item.only || item.only === hero));
    const cells = Array.from({ length: CASE.cols * CASE.rows }, (_, n) => {
      const item = stock[n];
      if (!item) return el('div', { className: 'cell' });
      const had = !!item.wear && pack.owned.has(item.id);
      const cell = el('button', { className: `cell full${had ? ' had' : pack.gold < item.price ? ' dear' : ''}`, ariaLabel: item.name }, pic(item.icon, k));
      if (pack.bag[item.id]) cell.append(el('span', { className: 'n' }, String(pack.bag[item.id])));
      cell.addEventListener('mousedown', e => e.preventDefault());
      cell.addEventListener('mouseenter', () => { shown = item.id; say(shown); });
      cell.addEventListener('mouseleave', () => { shown = undefined; say(); });
      cell.addEventListener('click', () => {
        told = s.buy(item.id) ? `Comprado: ${item.name}.` : had ? 'Eso ya lo tenés.' : 'No te alcanza.';
        draw();
      });
      return cell;
    });
    say(shown);
    root.replaceChildren(
      el('div', { className: 'case', style: `width:${CASE.w * k}px;height:${CASE.h * k}px;background-image:url(${CASE.src});--k:${k};--cols:${CASE.cols};--cell:${CASE.cell};--gap:${CASE.gap}` } as never,
        part('sign', CASE.sign, seller.name),
        part('grid', CASE.back, ...cells),
        plank),
      el('span', { className: 'foot' }, 'T para volver'));
  };
  addEventListener('resize', () => { if (seller) draw(); });

  const close = () => {
    seller = undefined;
    root.hidden = true;
    game.scene.resume('game');
  };
  addEventListener('keydown', e => {
    if (e.repeat || (e.target as { tagName?: string } | null)?.tagName === 'INPUT') return;
    if (seller && (e.code === 'KeyT' || e.code === 'Escape')) {
      // Escape closes this, and does not go on to open the pause menu.
      e.stopImmediatePropagation();
      close();
      return;
    }
    if (e.code !== 'KeyT') return;
    const s = scene();
    // Not while talking, nor while the game is stopped for something else; and only beside someone who sells.
    if (!s || document.body.classList.contains('talking') || game.scene.isPaused('game')) return;
    seller = s.seller;
    if (!seller) return;
    told = '';
    shown = undefined;
    game.scene.pause('game');
    root.hidden = false;
    draw();
  }, true);
}
