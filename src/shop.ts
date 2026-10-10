import type Phaser from 'phaser';
import { ITEMS } from './machi/pack';
import type { Npc } from './npc/npc';
import type { GameScene } from './scenes/GameScene';

// Buying from someone: their price list, a sheet of paper nailed to a board,
// with what they sell written on it, what each costs, and what the hero has
// to spend. The picture is drawn empty and the list is laid over it. T opens
// it beside whoever sells, and the game stands still behind it.

const BOARD = { src: 'hud/tienda.png', w: 314, h: 178, paper: { x: 58, y: 36, w: 200, h: 114 } };

const STYLE = `
  #shop {
    position: fixed; inset: 0; z-index: 26; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: rgba(12, 10, 8, .78); user-select: none; color: #2a1d12;
    font: 21px/1.15 'Jacquard 12', Georgia, serif; letter-spacing: .01em;
  }
  #shop[hidden] { display: none; }
  #shop .board { position: relative; flex: none; background-size: 100% 100%; image-rendering: pixelated; }
  #shop .paper { position: absolute; display: flex; flex-direction: column; overflow: hidden; }
  #shop .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8a7448; color: #7a2416; }
  #shop .gold { display: flex; align-items: center; gap: 6px; color: #2a1d12; }
  #shop img { image-rendering: pixelated; }
  #shop .row { display: grid; grid-template-columns: calc(24px * var(--k)) 1fr auto auto; gap: 0 8px; align-items: center; padding: 2px 0; cursor: default; }
  #shop .row:hover { background: rgba(122, 36, 22, .1); }
  #shop .row .pic { display: flex; justify-content: center; }
  #shop .row .price { display: flex; align-items: center; gap: 4px; }
  #shop .row.dear .price { color: #9a3a2a; }
  #shop .row.had .price { color: #8a7448; }
  #shop .row button {
    all: unset; cursor: pointer; padding: 0 8px; color: #f0e3c4; background: #7a2416; box-shadow: 0 0 0 2px #2a1d12;
  }
  #shop .row button:hover, #shop .row button:focus-visible { background: #a2331f; }
  #shop .row button[disabled] { visibility: hidden; }
  #shop .does { margin-top: auto; padding-top: 4px; border-top: 2px solid #8a7448; min-height: 2.3em; color: #5a4226; }
  #shop .foot { color: #8f8168; }
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
  let told = '';
  const draw = () => {
    const s = scene();
    if (!s || !seller) return;
    const pack = s.pack, hero = s.playing;
    const k = Math.max(1, Math.floor(Math.min(innerWidth * 0.96 / BOARD.w, (innerHeight - 40) * 0.96 / BOARD.h)));
    const does = el('div', { className: 'does' }, told || 'Señalá algo para ver qué es.');
    const rows = (seller.sells ?? []).map(id => ITEMS[id]).filter(item => item && (!item.only || item.only === hero)).map(item => {
      const had = !!item.wear && pack.owned.has(item.id);
      const buy = el('button', { textContent: 'Comprar', disabled: !pack.canBuy(item.id, hero) });
      buy.addEventListener('mousedown', e => e.preventDefault());
      buy.addEventListener('click', () => { if (s.buy(item.id)) { told = `Comprado: ${item.name}.`; draw(); } });
      const row = el('div', { className: `row${had ? ' had' : pack.gold < item.price ? ' dear' : ''}` },
        el('span', { className: 'pic' }, pic(item.icon, Math.min(k, 2))),
        el('span', {}, item.name + (pack.bag[item.id] ? ` ×${pack.bag[item.id]}` : '')),
        el('span', { className: 'price' }, had ? 'ya lo tenés' : String(item.price), ...(had ? [] : [pic('cosas/moneda_chica.png', Math.min(k, 2))])),
        buy);
      row.addEventListener('mouseenter', () => { does.textContent = item.does; });
      return row;
    });
    const at = BOARD.paper;
    root.replaceChildren(
      el('div', { className: 'board', style: `width:${BOARD.w * k}px;height:${BOARD.h * k}px;background-image:url(${BOARD.src});--k:${Math.min(k, 2)}` } as never,
        el('div', { className: 'paper', style: `left:${at.x * k}px;top:${at.y * k}px;width:${at.w * k}px;height:${at.h * k}px` } as never,
          el('div', { className: 'top' }, el('span', {}, seller.name), el('span', { className: 'gold' }, String(pack.gold), pic('cosas/moneda.png', Math.min(k, 2)))),
          ...rows, does)),
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
    game.scene.pause('game');
    root.hidden = false;
    draw();
  }, true);
}
