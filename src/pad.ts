import type Phaser from 'phaser';

// Playing with a gamepad (an Xbox one, or any the browser maps the standard way): the left stick
// walks, and the hero always faces the way it is pushed; nothing is aimed with the other stick,
// which in this view made walking impossible. What is let fly goes straight ahead, with no help to
// aim: the musket down the way he faces, the grenade as far as it reaches ahead. Its buttons
// press the keyboard's keys, which the game already knows, so nothing of the game is told apart:
//
//   left stick  walk                 L3          run, until the stick is let go
//   RT          sabre (with LT held: fire the musket; with RB held: throw the grenade)
//   LT held     the musket up        RB held     a grenade ready: the stick moves where it lands,
//                                                within its reach, and he stands (let go, it is put away)
//   B           dodge                A           talk, do, take what is offered
//   X           drink                ↑           rage (in a talk, the choices)
//   ←           the shop, by a seller            ≡ pause      ⧉ the hero's page
//   R3          Inti: lock onto the nearest enemy, or let go     right stick  Inti: a flick moves the lock
//               to whoever stands that way; with LT held (the lightning), it moves where the bolt falls
//
// In a talk, the shop, the hero's page or the pause, the cross (or the stick) goes to whatever can
// be chosen the way it is pushed (a slider's ← → move it), what is chosen looks as the mouse over it
// would have it, A chooses it and B leaves. On the hero's page LB and RB turn to the bag and the notebook. In the menus before the game, ← → choose and A goes on. Any real key or
// mouse movement takes the game back to the keyboard and the mouse.

type Vec = { x: number; y: number };

export const pad = {
  /** Whether the game is played with the gamepad just now: its last word came from it. */
  on: false,
  /** Which way the left stick is pushed, as seen on screen, up to 1 long; null at rest. */
  stick: null as Vec | null,
  /** Running: L3 is a switch, until the stick is let go. */
  run: false,
  /** R3 was pressed, and the game has not yet taken it. */
  lock: false,
  /** The right stick was flicked this way (as seen on screen), and the game has not yet taken it. */
  flick: null as Vec | null,
  /** Which way the right stick is pushed, as seen on screen, up to 1 long; null at rest. */
  right: null as Vec | null,
};

/** The standard mapping's buttons. */
const A = 0, B = 1, X = 2, LB = 4, RB = 5, LT = 6, RT = 7, VIEW = 8, MENU = 9, L3 = 10, R3 = 11, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
/** How little of a stick's push is taken as none; how far a stick goes to be a step in a menu, and how soon one held steps again (ms). */
const SLACK = 0.25, STEP = 0.6, AGAIN = 260;
/** After a grenade's button is let go: how long the attack is pressed for the game to see it, and the grenade still held for the throw to be made (ms). */
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

/** Where something can be chosen over the game, if anywhere is: a talk, the shop, the hero's page, the pause. */
function chooser(): HTMLElement | null {
  for (const id of ['dialog', 'shop', 'sheet', 'pause']) {
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

/**
 * Of what can be chosen, the nearest the way pushed from what is chosen, on screen: within the
 * half-plane that way, the nearer and the straighter the better. None, if nothing lies that way.
 */
function toward(from: HTMLElement, can: HTMLElement[], dx: number, dy: number): HTMLElement | null {
  const mid = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const at = mid(from);
  let best: HTMLElement | null = null, least = Infinity;
  for (const el of can) {
    if (el === from) continue;
    const p = mid(el), along = (p.x - at.x) * dx + (p.y - at.y) * dy, aside = Math.abs((p.x - at.x) * dy - (p.y - at.y) * dx);
    if (along < 1) continue;
    const score = along + aside * 3;
    if (score < least) { least = score; best = el; }
  }
  return best;
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
  let chosen: HTMLElement | null = null, chosenAt = 0;
  /** Whether the right stick has come back to rest since its last flick. */
  let rested = true;
  /** When each way of stepping last stepped (a held stick steps again after a while), by its first button. */
  const stepped: Record<number, number> = {};

  game.events.on('prestep', () => {
    const gp = first();
    if (!gp) return;
    const now = performance.now();
    const down = gp.buttons.map(b => b.pressed || b.value > 0.5);
    const press = (i: number) => !!down[i] && !was[i];
    let [x, y] = [gp.axes[0] ?? 0, gp.axes[1] ?? 0];
    const far = Math.hypot(x, y);
    if (far > 1) { x /= far; y /= far; }
    const stick = far < SLACK ? null : { x, y };
    if ((stick || down.some(Boolean)) && !pad.on) { pad.on = true; greet(); }
    if (!pad.on) { was = down; return; }

    // A step through a list: the cross, or the stick pushed well over, again while held.
    const stepping = (minus: number, plus: number, axis: number) => {
      const way = press(minus) ? -1 : press(plus) ? 1 : 0;
      if (way) { stepped[minus] = now; return way; }
      const pushed = Math.abs(axis) > STEP ? Math.sign(axis) : 0;
      if (pushed && now - (stepped[minus] ?? 0) > AGAIN) { stepped[minus] = now; return pushed; }
      if (!pushed && !down[minus] && !down[plus] && Math.abs(axis) < SLACK) stepped[minus] = 0;
      return 0;
    };

    const over = chooser();
    if (over) {
      // Something to choose: nothing of the game is held.
      letGo();
      pad.stick = null;
      pad.run = false;
      const can = [...over.querySelectorAll<HTMLElement>('button, input[type=range]')].filter(b => b.offsetParent && !(b as HTMLButtonElement).disabled);
      const before = chosen;
      // Drawn again (something bought, a point given), it is chosen where it was.
      if (!chosen || !can.includes(chosen)) chosen = can[Math.min(chosenAt, can.length - 1)] ?? null;
      const along = stepping(UP, DOWN, y), across = stepping(LEFT, RIGHT, x);
      if (chosen instanceof HTMLInputElement && across) {
        if (across > 0) chosen.stepUp(5); else chosen.stepDown(5);
        chosen.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (chosen && (along || across)) chosen = toward(chosen, can, across, along) ?? chosen;
      if (chosen !== before) {
        // As the mouse would: off what was chosen, onto what is.
        if (before?.isConnected) before.dispatchEvent(new MouseEvent('mouseleave'));
        chosen?.dispatchEvent(new MouseEvent('mouseenter'));
      }
      chosenAt = chosen ? can.indexOf(chosen) : 0;
      for (const b of can) b.classList.toggle('pad-chosen', b === chosen);
      if (press(A) && chosen) chosen.click();
      if (press(B) || press(MENU)) key('Escape');
      if (press(VIEW) && over.id === 'sheet') key('KeyI');
      // On the hero's page, the bag (LB) or the notebook (RB).
      if (over.id === 'sheet' && (press(LB) || press(RB))) over.dispatchEvent(new CustomEvent('pad-tab', { detail: press(LB) ? 'bolsa' : 'cuaderno' }));
      was = down;
      return;
    }
    chosen?.classList.remove('pad-chosen');
    chosen = null;
    chosenAt = 0;

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
    if (press(R3)) pad.lock = true;
    // A flick of the right stick: pushed well over from rest, once until it is let back.
    const [rx, ry] = [gp.axes[2] ?? 0, gp.axes[3] ?? 0], rfar = Math.hypot(rx, ry);
    pad.right = rfar < SLACK ? null : { x: rx / Math.max(1, rfar), y: ry / Math.max(1, rfar) };
    // With the lightning held it aims the bolt, and is no flick.
    if (down[LT]) rested = false;
    else if (rested && rfar > STEP) { pad.flick = { x: rx / rfar, y: ry / rfar }; rested = false; }
    else if (rfar < SLACK) rested = true;
    if (!stick) pad.run = false;
    const tap = (code: string) => { key(code); key(code, false); };
    if (press(A)) tap('KeyF');
    if (press(B)) tap('ShiftLeft');
    if (press(X)) tap('KeyC');
    if (press(UP)) tap('KeyR');
    if (press(LEFT)) tap('KeyT');
    if (press(MENU)) tap('Escape');
    if (press(VIEW)) tap('KeyI');
    hold('Space', !!down[RT]);
    hold('KeyQ', !!down[LT]);
    // The grenade, as the musket: held, it is ready, and the trigger throws it; let go, it is put away.
    hold('KeyE', !!down[RB]);
    was = down;
  });
  // A gamepad gone: whatever it held is let go.
  addEventListener('gamepaddisconnected', () => { letGo(); pad.stick = null; pad.run = false; });
}

if (import.meta.env.DEV) (globalThis as { pad_dbg?: () => unknown }).pad_dbg = () => ({ ...pad });
