import type Phaser from 'phaser';
import type { Hero } from './machi/data';
import type { GameScene } from './scenes/GameScene';

// Playing by touch, on a phone held upright: a stick under the left thumb to
// walk with, and under the right one a button for each thing the keyboard
// does. A button that aims is pressed and dragged the way it should go, and
// lets fly when it is let go; pressed and let go at once, it goes for whoever
// of the enemy is nearest. The buttons are the squares of each hero's own
// page, with the pictures of their HUD in them.

type Vec = { x: number; y: number };
/** The buttons that can be dragged to aim. */
export type Aimed = 'attack' | 'first' | 'second';

/** Whether the game is played by touch. ?tactil=1 says so on any machine, ?tactil=0 that it is not. */
const asked = new URLSearchParams(location.search).get('tactil');
export const touch = {
  on: asked !== null ? asked !== '0' : matchMedia('(pointer: coarse)').matches,
  /** Which way the stick is pushed, as seen on screen, and how far: up to 1 long. Null at rest. */
  stick: null as Vec | null,
  /** A button being dragged to aim, and how far from where it was pressed: up to 1 long. */
  drag: null as { by: Aimed; x: number; y: number } | null,
};

/** What a prompt over something says: with the key that does it, or by touch the deed alone. */
export function prompt(key: string, does: string): string {
  return touch.on ? does.replace(/^./, first => first.toUpperCase()) : `${key} · ${does}`;
}

// How far the stick's knob travels from its middle, how far a button is dragged for a full
// aim, and how little of either is taken as no push at all.
const TRAVEL = 46, AIM = 54, SLACK = 0.22;

const STYLE = `
  html, body { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  #pad { position: fixed; inset: 0; z-index: 14; pointer-events: none; user-select: none; --hud: 110px; --u: 3; font: 21px/1 'Jacquard 12', Georgia, serif; color: #f0e3c4; }
  #pad[hidden] { display: none; }
  #pad > * { pointer-events: auto; touch-action: none; }
  /* The left of the screen below its middle is the stick's: it comes up wherever the thumb lands. */
  #pad .field { position: absolute; left: 0; bottom: 0; width: 50%; height: 48%; }
  #pad .base {
    position: absolute; left: 86px; bottom: calc(var(--hud) + 82px); width: 0; height: 0; pointer-events: none; opacity: .5; transition: opacity .15s;
  }
  #pad .base.held { opacity: .9; }
  #pad .base::before {
    content: ''; position: absolute; left: -58px; top: -58px; width: 116px; height: 116px; box-sizing: border-box; border-radius: 50%;
    background: rgba(12, 10, 8, .35); border: 3px solid rgba(226, 196, 120, .55); box-shadow: 0 0 0 3px rgba(10, 8, 7, .6);
  }
  #pad .knob {
    position: absolute; left: -25px; top: -25px; width: 50px; height: 50px; box-sizing: border-box; border-radius: 50%;
    background: var(--accent); border: 3px solid #0a0807; box-shadow: inset 0 0 0 3px rgba(255, 255, 255, .25);
  }
  /* The buttons: a square of the hero's own page each, lit while it is held. */
  #pad button {
    all: unset; position: absolute; pointer-events: auto; touch-action: none; display: flex; align-items: center; justify-content: center; box-sizing: border-box;
    width: calc(22px * var(--u)); height: calc(22px * var(--u));
    background: var(--square) 0 0 / 200% 100% no-repeat; image-rendering: pixelated; filter: drop-shadow(0 3px 0 rgba(0, 0, 0, .5));
  }
  #pad button.held { background-position: 100% 0; transform: translate(0, 2px); }
  #pad button img { image-rendering: pixelated; pointer-events: none; width: calc(var(--w, 30) * 1.6px); }
  #pad button.off img, #pad button.off .glyph { filter: grayscale(1) brightness(.5); }
  #pad button.lit { animation: pad-lit .7s steps(2) infinite; }
  @keyframes pad-lit { 50% { filter: drop-shadow(0 0 6px var(--accent)) brightness(1.25); } }
  /* What is still cooling down has a shade over it, which lifts. */
  #pad button i { position: absolute; left: 12%; right: 12%; top: 12%; height: calc(76% * var(--cool, 0)); background: rgba(12, 10, 8, .72); pointer-events: none; }
  #pad button b { position: absolute; right: 9px; bottom: 6px; font-weight: normal; color: #f0e3c4; text-shadow: 0 2px 0 #14110f, 0 0 4px #000; pointer-events: none; }
  #pad .glyph { font-size: 42px; color: #2a1d12; pointer-events: none; }
  #pad .attack { right: 10px; bottom: calc(var(--hud) + 14px); --u: 4; }
  #pad .attack img { width: 48px; }
  #pad .dash { right: 106px; bottom: calc(var(--hud) + 14px); }
  #pad .first { right: 106px; bottom: calc(var(--hud) + 88px); }
  #pad .second { right: 21px; bottom: calc(var(--hud) + 110px); }
  #pad .power { right: 106px; bottom: calc(var(--hud) + 162px); }
  #pad .flask { right: 21px; bottom: calc(var(--hud) + 184px); }
  /* What can be done with whatever is near, said on a board over the buttons. */
  #pad .deeds { position: absolute; right: 10px; bottom: calc(var(--hud) + 262px); display: flex; flex-direction: column; align-items: flex-end; gap: 10px; pointer-events: none; }
  #pad .deeds button {
    position: static; pointer-events: auto; width: auto; height: auto; min-width: 96px; min-height: 46px; padding: 0 16px; background: #1c140e; filter: none;
    box-shadow: 0 0 0 2px var(--accent), 0 0 0 4px #0a0807, 0 4px 0 4px rgba(0, 0, 0, .45); white-space: nowrap;
  }
  #pad .deeds button.held { background: #2a2018; }
  #pad .deeds button[hidden] { display: none; }
  /* Up in the corner: the hero's page, and stopping the game. */
  #pad .top { position: absolute; right: 8px; top: 8px; display: flex; gap: 8px; pointer-events: none; }
  body.dev #pad .top { top: 52px; }
  #pad .top button { position: static; pointer-events: auto; --u: 2; }
  #pad .top .page::before { content: ''; width: 30px; height: 20px; background: var(--page) center / contain no-repeat; image-rendering: pixelated; }
  #pad .top .stop::before { content: ''; width: 5px; height: 18px; background: #2a1d12; box-shadow: 10px 0 0 #2a1d12; margin-right: 10px; }
  #pad .top .page b { right: -4px; bottom: -6px; color: #8fd18a; }
  /* The orb she casts, for her attack. */
  #pad .orb { width: 34px; height: 34px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff 0 12%, #bef8fc 30%, #46e6fa 62%, #1f6fa8 100%); box-shadow: 0 0 0 3px #0a0807; pointer-events: none; }
  body.touch #state { display: none; }
  /* Held on its side there is no height to spare: the stick and the buttons go down beside the HUD, not over it. */
  @media (orientation: landscape) and (max-height: 520px) {
    #pad { --low: 10px; }
    #pad .field { height: 70%; width: 40%; }
    #pad .base { bottom: 86px; left: 96px; }
    #pad .attack, #pad .dash { bottom: var(--low); }
    #pad .first { bottom: calc(var(--low) + 74px); }
    #pad .second { bottom: calc(var(--low) + 96px); }
    #pad .power { bottom: calc(var(--low) + 148px); }
    #pad .flask { bottom: calc(var(--low) + 170px); }
    #pad .deeds { right: 200px; bottom: calc(var(--hud) + 10px); flex-direction: row; }
  }
`;

interface Look { accent: string; attack: string; first: string; second: string; power: string; flask: string }
const LOOKS: Record<Hero, Look> = {
  inti: { accent: '#46e6fa', attack: '', first: 'hud/iconos/rayo.png', second: 'hud/iconos/lawen.png', power: 'hud/iconos/nahuel.png', flask: 'hud/iconos/calabaza.png' },
  cabral: { accent: '#ff7a00', attack: 'cosas/sable.png', first: 'hud/iconos/mosquete.png', second: 'hud/iconos/granada.png', power: 'hud/iconos/furia.png', flask: 'hud/iconos/chifle.png' },
};

let tall = 110;

/** A key pressed or let go without a keyboard: whatever listens for the key hears it. */
export function key(code: string, down = true): void {
  dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
}

/** Puts the stick and the buttons over a game, where it is played by touch. */
export function mountTouch(game: Phaser.Game): void {
  // Whoever touches the screen is playing by touch, whatever the machine said of itself.
  if (!touch.on && asked === null) {
    addEventListener('touchstart', () => { if (!touch.on) { touch.on = true; mountTouch(game); } }, { once: true, passive: true });
    return;
  }
  if (!touch.on || document.getElementById('pad')) return;
  document.body.classList.add('touch');
  if (import.meta.env.DEV) document.body.classList.add('dev');
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const pad = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pad', hidden: true }));
  pad.style.setProperty('--hud', `${tall}px`);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, ...kids: Node[]) => {
    const node = Object.assign(document.createElement(tag), { className });
    node.append(...kids);
    return node;
  };
  // Nothing held on the screen brings up the browser's own menus.
  pad.addEventListener('contextmenu', e => e.preventDefault());

  // The stick.
  const knob = el('div', 'knob'), base = el('div', 'base', knob), field = el('div', 'field');
  let thumb: number | null = null, centre = { x: 0, y: 0 };
  const rest = () => {
    thumb = null;
    touch.stick = null;
    base.classList.remove('held');
    base.style.left = base.style.top = base.style.bottom = '';
    knob.style.transform = '';
  };
  const push = (e: PointerEvent) => {
    let x = (e.clientX - centre.x) / TRAVEL, y = (e.clientY - centre.y) / TRAVEL;
    const far = Math.hypot(x, y);
    if (far > 1) { x /= far; y /= far; }
    knob.style.transform = `translate(${x * TRAVEL}px, ${y * TRAVEL}px)`;
    touch.stick = far < SLACK ? null : { x, y };
  };
  field.addEventListener('pointerdown', e => {
    if (thumb !== null) return;
    thumb = e.pointerId;
    field.setPointerCapture(e.pointerId);
    centre = { x: e.clientX, y: e.clientY };
    base.classList.add('held');
    Object.assign(base.style, { left: `${centre.x}px`, top: `${centre.y}px`, bottom: 'auto' });
    push(e);
  });
  field.addEventListener('pointermove', e => { if (e.pointerId === thumb) push(e); });
  for (const over of ['pointerup', 'pointercancel'] as const) field.addEventListener(over, e => { if (e.pointerId === thumb) rest(); });

  // A button: what pressing it and letting it go do, and whether dragging it aims.
  const held = new Set<() => void>();
  const button = (className: string, down: () => void, up?: () => void, aims?: Aimed, ...kids: Node[]) => {
    const b = el('button', className, ...kids);
    let finger: number | null = null, from = { x: 0, y: 0 };
    const release = () => {
      if (finger === null) return;
      finger = null;
      held.delete(release);
      b.classList.remove('held');
      up?.();
      if (aims && touch.drag?.by === aims) touch.drag = null;
    };
    b.addEventListener('pointerdown', e => {
      if (finger !== null) return;
      e.preventDefault();
      finger = e.pointerId;
      b.setPointerCapture(e.pointerId);
      from = { x: e.clientX, y: e.clientY };
      b.classList.add('held');
      held.add(release);
      down();
    });
    b.addEventListener('pointermove', e => {
      if (e.pointerId !== finger || !aims) return;
      let x = (e.clientX - from.x) / AIM, y = (e.clientY - from.y) / AIM;
      const far = Math.hypot(x, y);
      if (far > 1) { x /= far; y /= far; }
      // Once it has been dragged it stays an aim, even brought back to the middle.
      if (far >= SLACK || touch.drag?.by === aims) touch.drag = { by: aims, x, y };
    });
    for (const over of ['pointerup', 'pointercancel'] as const) b.addEventListener(over, e => { if (e.pointerId === finger) release(); });
    return b;
  };
  const picture = () => document.createElement('img');
  const held2 = (code: string) => [() => key(code), () => key(code, false)] as const;
  const act = (what: string) => () => game.events.emit('act', what);

  const icons = { attack: picture(), first: picture(), second: picture(), power: picture(), flask: picture() };
  const orb = el('div', 'orb');
  const cool = { first: el('i', ''), second: el('i', '') };
  const left = el('b', ''), points = el('b', '');
  const buttons = {
    attack: button('attack', ...held2('Space'), 'attack', icons.attack, orb),
    dash: button('dash', () => key('ShiftLeft'), undefined, undefined, Object.assign(el('span', 'glyph'), { textContent: '»' })),
    first: button('first', ...held2('KeyQ'), 'first', icons.first, cool.first),
    second: button('second', ...held2('KeyE'), 'second', icons.second, cool.second),
    power: button('power', () => key('KeyR'), undefined, undefined, icons.power),
    flask: button('flask', act('drink'), undefined, undefined, icons.flask, left),
  };
  const deed = button('', act('interact')), buy = button('', () => key('KeyT'));
  buy.textContent = 'Comprar';
  const page = button('page', () => key('KeyI'), undefined, undefined, points), stop = button('stop', () => key('Escape'));
  pad.append(field, base, ...Object.values(buttons), el('div', 'deeds', buy, deed), el('div', 'top', page, stop));

  // Each frame: whether there is a game to play just now, and how each button stands.
  let hero: Hero | undefined, shown = false;
  const letGo = () => { rest(); for (const release of [...held]) release(); touch.drag = null; };
  game.events.on('poststep', () => {
    const playing = game.scene.isActive('game');
    if (playing !== shown) {
      shown = playing;
      pad.hidden = !playing;
      // Whatever was held when the game stopped is no longer held.
      if (!playing) letGo();
    }
    if (!playing) return;
    const scene = game.scene.getScene('game') as GameScene;
    if (scene.playing !== hero) {
      hero = scene.playing;
      const look = LOOKS[hero];
      pad.style.setProperty('--accent', look.accent);
      pad.style.setProperty('--square', `url(hud/cuadro_${hero}.png)`);
      pad.style.setProperty('--page', `url(hud/hoja_${hero}.png)`);
      for (const name of ['attack', 'first', 'second', 'power', 'flask'] as const) {
        icons[name].src = look[name];
        icons[name].hidden = !look[name];
      }
      orb.hidden = !!look.attack;
    }
    const [first, second] = scene.skills;
    for (const [name, skill] of [['first', first], ['second', second]] as const) {
      buttons[name].classList.toggle('off', !skill.ready && skill.cooldown <= 0);
      cool[name].style.setProperty('--cool', String(skill.cooldown));
    }
    buttons.power.classList.toggle('off', scene.ultimate < 1);
    buttons.power.classList.toggle('lit', scene.ultimate >= 1);
    const draughts = scene.draughts.left;
    buttons.flask.classList.toggle('off', !draughts);
    if (left.textContent !== String(draughts)) left.textContent = String(draughts);
    const offer = scene.offer ?? '';
    deed.hidden = !offer;
    if (offer && deed.textContent !== offer) deed.textContent = offer;
    buy.hidden = !scene.seller;
    const owed = scene.growth.points ? `+${scene.growth.points}` : '';
    if (points.textContent !== owed) points.textContent = owed;
  });
  addEventListener('blur', letGo);
}

/** How tall the HUD stands at the foot of the screen, in the page's own pixels: the buttons sit over it. */
export function clearOf(hud: number): void {
  tall = Math.round(hud);
  document.getElementById('pad')?.style.setProperty('--hud', `${Math.round(hud)}px`);
}

if (import.meta.env.DEV) (globalThis as { touch_dbg?: () => unknown }).touch_dbg = () => ({ ...touch });
