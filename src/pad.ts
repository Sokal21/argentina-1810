import type Phaser from 'phaser';

// Playing with a gamepad (an Xbox one, or any the browser maps the standard way): the left stick
// walks, and the hero always faces the way it is pushed; nothing is aimed with the other stick,
// which in this view made walking impossible. What is let fly goes straight ahead, with no help to
// aim: the musket down the way he faces, the grenade two thirds of its reach ahead. Its buttons
// press the keyboard's keys, which the game already knows, so nothing of the game is told apart:
//
//   left stick  walk                 L3          run, until the stick is let go
//   RT          sabre (with LT held: fire the musket)
//   LT held     the musket up        RB held     a grenade ready; let go, it is thrown
//   B           dodge                A           talk, do, take what is offered
//   X           drink                ↑           rage (in a talk, the choices)
//   ←           the shop, by a seller            ≡ pause      ⧉ the hero's page
//
// In a talk, the shop or the pause, the cross (or the stick) goes through what can be chosen, A
// chooses it and B leaves. In the menus before the game, ← → choose and A goes on. Any real key or
// mouse movement takes the game back to the keyboard and the mouse.

type Vec = { x: number; y: number };

export const pad = {
  /** Whether the game is played with the gamepad just now: its last word came from it. */
  on: false,
  /** Which way the left stick is pushed, as seen on screen, up to 1 long; null at rest. */
  stick: null as Vec | null,
  /** Running: L3 is a switch, until the stick is let go. */
  run: false,
};

/** The standard mapping's buttons. */
const A = 0, B = 1, X = 2, RB = 5, LT = 6, RT = 7, VIEW = 8, MENU = 9, L3 = 10, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
/** How little of a stick's push is taken as none; how far a stick goes to be a step in a menu, and how soon one held steps again (ms). */
const SLACK = 0.25, STEP = 0.6, AGAIN = 260;
/** After a grenade's button is let go: how long the attack is pressed for the game to see it, and the grenade still held for the throw to be made (ms). */
const PULL = 150, THROWN = 900;
/**
 * The old numbers of the keys it presses: Phaser knows a key by its number, which a key pressed by
 * script does not carry unless it is given one (what reads keys by their names takes them as they are).
 */
const NUMBERS: Record<string, number> = {
  Enter: 13, Escape: 27, Space: 32, ArrowLeft: 37, ArrowRight: 39, ShiftLeft: 16,
  KeyC: 67, KeyE: 69, KeyF: 70, KeyI: 73, KeyQ: 81, KeyR: 82, KeyT: 84,
};

/** A key pressed or let go, as the keyboard would: by its name and by its number. */
function key(code: string, down = true): void {
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true });
  const number = NUMBERS[code] ?? 0;
  Object.defineProperty(event, 'keyCode', { get: () => number });
  Object.defineProperty(event, 'which', { get: () => number });
  dispatchEvent(event);
}

/** What a prompt's key reads as with the gamepad. */
const GLYPHS: Record<string, string> = { F: 'Ⓐ', T: '◀', I: '⧉', C: 'Ⓧ', R: '▲' };

/** What a prompt over something says, with the gamepad's button for its key when the gamepad is on. */
export function glyphs(text: string): string {
  return pad.on ? text.replace(/(^|\s)([A-Z]) ·/g, (_all, gap: string, k: string) => `${gap}${GLYPHS[k] ?? k} ·`) : text;
}

/** A shake through the gamepad, as the camera's: how long (ms), and how hard (0 to 1). */
export function rumble(ms: number, strength: number): void {
  if (!pad.on) return;
  const actuator = (first() as (Gamepad & { vibrationActuator?: { playEffect?: (kind: string, how: object) => Promise<unknown> } }) | null)?.vibrationActuator;
  void actuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 1.4) }).catch(() => {});
}

function first(): Gamepad | null {
  const all = navigator.getGamepads?.() ?? [];
  return all.find(g => g?.mapping === 'standard') ?? all.find(g => !!g) ?? null;
}

/** Where something can be chosen over the game, if anywhere is: a talk, the shop, the pause. */
function chooser(): HTMLElement | null {
  for (const id of ['dialog', 'shop', 'pause']) {
    const el = document.getElementById(id);
    if (el && !el.hidden) return el;
  }
  return null;
}

const STYLE = `.pad-chosen { outline: 3px solid #ffb45a !important; outline-offset: 2px; }`;

/** The first time the gamepad is taken up, a word that it has been, and where its buttons are shown. */
let greeted = false;
function greet(): void {
  if (greeted) return;
  greeted = true;
  const toast = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pad-toast', textContent: 'Joystick conectado · ≡ para ver los controles' }));
  setTimeout(() => { toast.hidden = true; }, 4500);
  setTimeout(() => toast.remove(), 5200);
}

/** Starts listening to the gamepad, for as long as the game runs. */
export function mountPad(game: Phaser.Game): void {
  if (!navigator.getGamepads) return;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  // A real key or the mouse: back to them. (The keys the gamepad presses are not real ones.)
  const back = (e: Event) => { if (e.isTrusted) { pad.on = false; pad.stick = null; } };
  addEventListener('keydown', back, true);
  // Only a mouse really moved: the browser sends a move of nothing when what is under it changes.
  addEventListener('mousemove', e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) back(e); }, true);

  let was: boolean[] = [];
  /** The keys it holds down for the game just now. */
  const holding = new Set<string>();
  const hold = (code: string, down: boolean) => {
    if (down === holding.has(code)) return;
    if (down) holding.add(code); else holding.delete(code);
    key(code, down);
  };
  const letGo = () => { for (const code of [...holding]) hold(code, false); };
  let thrown = 0, pulled = 0, stepped = 0, chosen: HTMLElement | null = null;

  game.events.on('prestep', () => {
    const gp = first();
    if (!gp) return;
    const now = performance.now();
    const down = gp.buttons.map(b => b.pressed || b.value > 0.5);
    const press = (i: number) => !!down[i] && !was[i], release = (i: number) => !down[i] && !!was[i];
    let [x, y] = [gp.axes[0] ?? 0, gp.axes[1] ?? 0];
    const far = Math.hypot(x, y);
    if (far > 1) { x /= far; y /= far; }
    const stick = far < SLACK ? null : { x, y };
    if ((stick || down.some(Boolean)) && !pad.on) { pad.on = true; greet(); }
    if (!pad.on) { was = down; return; }

    // A step through a list: the cross, or the stick pushed well over, again while held.
    const stepping = (minus: number, plus: number, axis: number) => {
      const way = press(minus) ? -1 : press(plus) ? 1 : 0;
      if (way) { stepped = now; return way; }
      const pushed = Math.abs(axis) > STEP ? Math.sign(axis) : 0;
      if (pushed && now - stepped > AGAIN) { stepped = now; return pushed; }
      if (!pushed && !down[minus] && !down[plus] && Math.abs(axis) < SLACK) stepped = 0;
      return 0;
    };

    const over = chooser();
    if (over) {
      // Something to choose: nothing of the game is held.
      letGo();
      pad.stick = null;
      pad.run = false;
      const can = [...over.querySelectorAll<HTMLElement>('button, input[type=range]')].filter(b => b.offsetParent && !(b as HTMLButtonElement).disabled);
      if (!chosen || !can.includes(chosen)) chosen = can[0] ?? null;
      const way = stepping(UP, DOWN, y);
      if (way && can.length) chosen = can[(can.indexOf(chosen!) + way + can.length) % can.length];
      for (const b of can) b.classList.toggle('pad-chosen', b === chosen);
      if (press(A) && chosen) chosen.click();
      if (press(B) || press(MENU)) key('Escape');
      was = down;
      return;
    }
    chosen?.classList.remove('pad-chosen');
    chosen = null;

    if (!game.scene.isActive('game')) {
      // The menus before the game: ← → choose, A goes on.
      letGo();
      const way = stepping(LEFT, RIGHT, x);
      if (way) { key(way < 0 ? 'ArrowLeft' : 'ArrowRight'); key(way < 0 ? 'ArrowLeft' : 'ArrowRight', false); }
      if (press(A)) { key('Enter'); key('Enter', false); }
      if (press(B)) key('Escape');
      was = down;
      return;
    }

    // Playing.
    pad.stick = stick;
    if (press(L3)) pad.run = !pad.run;
    if (!stick) pad.run = false;
    const tap = (code: string) => { key(code); key(code, false); };
    if (press(A)) tap('KeyF');
    if (press(B)) tap('ShiftLeft');
    if (press(X)) tap('KeyC');
    if (press(UP)) tap('KeyR');
    if (press(LEFT)) tap('KeyT');
    if (press(MENU)) tap('Escape');
    if (press(VIEW)) tap('KeyI');
    hold('Space', !!down[RT] || now < pulled);
    hold('KeyQ', !!down[LT]);
    // The grenade: held, it is ready; let go, it is thrown (the attack, while it is still held a moment).
    if (press(RB)) { thrown = 0; hold('KeyE', true); }
    if (release(RB) && holding.has('KeyE')) { pulled = now + PULL; thrown = now + THROWN; }
    if (thrown && now >= thrown) { thrown = 0; hold('KeyE', false); }
    was = down;
  });
  // A gamepad gone: whatever it held is let go.
  addEventListener('gamepaddisconnected', () => { letGo(); pad.stick = null; pad.run = false; });
}

if (import.meta.env.DEV) (globalThis as { pad_dbg?: () => unknown }).pad_dbg = () => ({ ...pad });
