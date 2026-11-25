// Where a versus is set up, over the choosing of who to play: make a room, choosing who you play,
// and pass its code (or its link) to whoever you will fight; or come into theirs with it. Whoever
// comes in plays the other one. Once both are there the game begins (`start`).
import type { Hero } from '../machi/data';
import { cleanCode, Link, newCode, versus } from './link';

const NAMES: Record<Hero, string> = { inti: 'Inti', cabral: 'Cabral' };
/** After this long looking for a room and nobody there, it says so (and goes on looking). */
const LONELY = 20_000;

const STYLE = `
#versus { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 16px; background: rgba(10,8,7,.82);
  color: #f0e3c4; font: 21px/1.25 'Jacquard 12', Georgia, serif; letter-spacing: .02em; }
#versus .panel { width: min(440px, 100%); background: #14110f; padding: 22px 26px 24px; box-shadow: 0 0 0 2px #3a3027, 0 0 0 4px #0a0807; }
#versus h1 { margin: 0 0 4px; font: 52px/1 'Jacquard 12', Georgia, serif; font-weight: normal; text-align: center; text-shadow: 0 3px 0 #0a0807; }
#versus p { margin: 8px 0; color: #cdbf9d; text-align: center; }
#versus h2 { margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #3a3027; font: inherit; font-weight: normal; color: #e2c478; }
#versus .row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
#versus button { all: unset; cursor: pointer; padding: 8px 18px 9px; background: #2a2018; color: #f0e3c4; box-shadow: 0 0 0 2px #e2c478, 0 0 0 4px #0a0807; text-align: center; }
#versus button:hover, #versus button:focus-visible { background: #3a2c1e; }
#versus button.soft { background: none; color: #8f8168; box-shadow: 0 0 0 2px #3a3027, 0 0 0 4px #0a0807; }
#versus input { all: unset; width: 7.5em; padding: 6px 10px; background: #0a0807; color: #f0e3c4; box-shadow: 0 0 0 2px #6b5c44;
  font: 26px/1 'Silkscreen', ui-monospace, monospace; letter-spacing: .15em; text-transform: uppercase; text-align: center; }
#versus .code { margin: 10px 0 4px; font: 44px/1 'Silkscreen', ui-monospace, monospace; letter-spacing: .2em; color: #ffcf6a; text-align: center; user-select: all; }
#versus .back { display: block; margin: 20px auto 0; }
#versus .wait::after { content: '…'; animation: versus-dots 1.4s steps(4) infinite; display: inline-block; width: 1em; overflow: hidden; vertical-align: bottom; }
@keyframes versus-dots { from { width: 0 } to { width: 1.2em } }
`;

/**
 * Opens the lobby. `start` is called once both players are in, with who this side plays;
 * `closed` if it is left without a game. `code`: a room to go straight into (a shared link).
 */
export function openLobby(start: (hero: Hero) => void, closed: () => void, code?: string): void {
  document.getElementById('versus')?.remove();
  if (!document.getElementById('versus-style')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'versus-style', textContent: STYLE }));
  }
  const root = Object.assign(document.createElement('div'), { id: 'versus' });
  const panel = Object.assign(document.createElement('div'), { className: 'panel' });
  root.append(panel);
  document.body.append(root);
  let lonely = 0;

  const el = (tag: string, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): HTMLElement => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids);
    return node;
  };
  const button = (text: string, click: () => void, soft = false) => {
    const b = el('button', { textContent: text, className: soft ? 'soft' : '' }) as HTMLButtonElement;
    b.addEventListener('click', click);
    return b;
  };
  const show = (...kids: Node[]) => { panel.replaceChildren(el('h1', { textContent: 'Versus' }), ...kids); };
  const close = () => {
    clearTimeout(lonely);
    versus.link?.leave();
    versus.link = null;
    root.remove();
    closed();
  };
  // Keys typed here are not the game's.
  root.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });

  const wait = (link: Link) => {
    versus.link = link;
    link.onReady = () => {
      clearTimeout(lonely);
      root.remove();
      start(link.hero!);
    };
  };

  const host = (hero: Hero) => {
    const code = newCode();
    const link = new Link(code, hero);
    wait(link);
    const url = `${location.origin}${location.pathname}?sala=${code}`;
    const copy = button('Copiar el link', () => {
      void navigator.clipboard?.writeText(url).then(() => { copy.textContent = 'Copiado'; }, () => { copy.textContent = 'No se pudo copiar'; });
    });
    show(
      el('p', { textContent: `Jugás con ${NAMES[hero]}. Pasale este código a quien vas a enfrentar:` }),
      el('div', { className: 'code', textContent: code }),
      el('div', { className: 'row' }, copy),
      el('p', { className: 'wait', textContent: 'Esperando al otro jugador' }),
      button('Cancelar', close, true),
    );
    panel.lastElementChild!.classList.add('back');
  };

  const join = (typed: string) => {
    const code = cleanCode(typed);
    if (code.length < 4) return;
    const link = new Link(code, null);
    wait(link);
    const note = el('p', { className: 'wait', textContent: `Buscando la sala ${code}` });
    show(note, button('Cancelar', close, true));
    panel.lastElementChild!.classList.add('back');
    lonely = window.setTimeout(() => {
      note.textContent = 'Todavía no aparece nadie con ese código. Fijate que esté bien, o que el otro haya creado la sala. Sigo buscando';
    }, LONELY);
  };

  const menu = () => {
    const input = el('input', { placeholder: 'CÓDIGO', maxLength: 8, autocomplete: 'off', spellcheck: false }) as HTMLInputElement;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') join(input.value); });
    show(
      el('p', { textContent: 'Uno contra otro, de navegador a navegador.' }),
      el('h2', { textContent: 'Crear una sala' }),
      el('p', { textContent: 'Elegís con quién jugás; al otro le toca el que queda.' }),
      el('div', { className: 'row' }, button('Jugar con Inti', () => host('inti')), button('Jugar con Cabral', () => host('cabral'))),
      el('h2', { textContent: 'Entrar a una sala' }),
      el('div', { className: 'row' }, input, button('Entrar', () => join(input.value))),
      button('Volver', close, true),
    );
    panel.lastElementChild!.classList.add('back');
    input.focus();
  };

  if (code) join(code);
  else menu();
}
