import { setVoice, voiceName, VOICES, type VoiceName } from './npc/dialog';
import type Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import { cheats, DIALS, resetDials, setDial, tune, type DialName } from './tuning';

const STYLE = `
  #dev-gear {
    position: fixed; right: 16px; top: 14px; z-index: 20; cursor: pointer;
    font: 12px/1 ui-monospace, Menlo, Consolas, monospace; padding: 6px 9px;
    border: 1px solid #6b5c44; border-radius: 4px; background: #241d17; color: #a89a80;
  }
  #dev-panel {
    position: fixed; right: 16px; top: 48px; z-index: 20; width: 270px; padding: 12px; box-sizing: border-box;
    /* Never taller than the window: what does not fit is scrolled to. */
    max-height: calc(100vh - 60px); overflow-y: auto; overscroll-behavior: contain;
    border: 1px solid #6b5c44; border-radius: 6px; background: rgba(26, 21, 18, .94); color: #cdbfa3;
    font: 12px/1.3 ui-monospace, Menlo, Consolas, monospace; user-select: none;
  }
  #dev-panel[hidden] { display: none; }
  #dev-panel h4 { margin: 10px 0 6px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #8f8168; }
  #dev-panel h4:first-child { margin-top: 0; }
  #dev-panel label { display: block; margin-bottom: 8px; }
  #dev-panel label span { float: right; color: #f0e3c4; }
  #dev-panel input[type=range] { width: 100%; margin: 3px 0 0; accent-color: #e2c478; }
  #dev-panel .row { display: flex; flex-wrap: wrap; gap: 6px; }
  #dev-panel button {
    font: inherit; cursor: pointer; padding: 5px 8px; border: 1px solid #6b5c44; border-radius: 4px;
    background: #241d17; color: #cdbfa3;
  }
  #dev-panel button:hover { background: #3a3027; color: #f0e3c4; }
  #dev-panel .check { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; }
`;

/**
 * The developer's panel: a gear button that opens sliders for the numbers in
 * `tuning` and buttons that act on the running game. Only made while
 * developing.
 */
export function mountDevPanel(game: Phaser.Game): void {
  const scene = () => (game.scene.isActive('game') ? game.scene.getScene('game') as GameScene : null);
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));

  const gear = Object.assign(document.createElement('button'), { id: 'dev-gear', textContent: '⚙ Config' });
  const panel = Object.assign(document.createElement('div'), { id: 'dev-panel', hidden: true });
  // Keep keyboard focus on the page so the game's keys keep working.
  const keepFocus = (el: HTMLElement) => el.addEventListener('mousedown', e => e.preventDefault());
  keepFocus(gear);
  gear.addEventListener('click', () => { panel.hidden = !panel.hidden; });

  const heading = (text: string) => panel.appendChild(Object.assign(document.createElement('h4'), { textContent: text }));
  const row = () => panel.appendChild(Object.assign(document.createElement('div'), { className: 'row' }));
  const button = (into: HTMLElement, text: string, act: (game: GameScene) => void) => {
    const b = Object.assign(document.createElement('button'), { textContent: text });
    keepFocus(b);
    b.addEventListener('click', () => { const s = scene(); if (s) act(s); });
    into.appendChild(b);
  };

  // One slider to a dial, in the groups they are listed under.
  const sliders = new Map<DialName, { input: HTMLInputElement; shown: HTMLElement }>();
  const slider = (name: DialName) => {
    const dial = DIALS[name];
    const label = document.createElement('label');
    const shown = document.createElement('span');
    const input = Object.assign(document.createElement('input'), {
      type: 'range', min: String(dial.min), max: String(dial.max), step: String(dial.step),
    });
    label.append(dial.label, shown, input);
    input.addEventListener('input', () => { setDial(name, Number(input.value)); shown.textContent = input.value; });
    // Once let go it gives the keyboard back to the game.
    input.addEventListener('change', () => input.blur());
    sliders.set(name, { input, shown });
    panel.appendChild(label);
  };
  const refresh = () => sliders.forEach(({ input, shown }, name) => {
    input.value = String(tune[name]);
    shown.textContent = String(Math.round(tune[name] * 100) / 100);
  });

  heading('Luz');
  (['dark', 'reach', 'glow'] as DialName[]).forEach(slider);
  heading('Movimiento');
  (['speed', 'foes'] as DialName[]).forEach(slider);

  heading('Definitiva');
  (['orbs', 'orbLife', 'blows', 'rage', 'beast'] as DialName[]).forEach(slider);

  heading('Voz de los personajes');
  const voices = Object.assign(document.createElement('select'), { style: 'width:100%;font:inherit;background:#2a231c;color:#e6d8b8;border:1px solid #5a4a38;padding:3px' });
  voices.replaceChildren(...Object.entries(VOICES).map(([name, label]) => new Option(label, name)));
  voices.value = voiceName();
  voices.addEventListener('change', () => { setVoice(voices.value as VoiceName); voices.blur(); });
  panel.appendChild(voices);

  heading('Ir a');
  // Filled each time it is opened: the places are those of whatever map is being played.
  const places = Object.assign(document.createElement('select'), { style: 'width:100%;font:inherit;background:#2a231c;color:#e6d8b8;border:1px solid #5a4a38;padding:3px' });
  const fill = () => {
    const names = scene()?.places.map(p => p.name) ?? [];
    places.replaceChildren(new Option(names.length ? 'Elegí un lugar…' : 'Este mapa no tiene lugares', ''), ...names.map(name => new Option(name, name)));
  };
  fill();
  places.addEventListener('mousedown', () => { if (places.options.length <= 1 || !scene()?.places.some(p => p.name === places.options[1].value)) fill(); });
  places.addEventListener('change', () => { if (places.value) scene()?.goTo(places.value); places.value = ''; places.blur(); });
  panel.appendChild(places);
  // And each time the panel is opened, so the list is never that of a game not yet begun.
  gear.addEventListener('click', fill);

  heading('Enemigos');
  const foes = row();
  button(foes, '+ Realista', s => s.spawn('realista'));
  button(foes, '+ Chonchón', s => s.spawn('chonchon'));
  button(foes, '+ Cubo', s => s.spawn('cubo'));

  heading('Personaje');
  const hero = row();
  button(hero, 'Curar y llenar', s => s.restore());
  button(hero, 'Cargar definitiva', s => s.chargeUp());
  const check = Object.assign(document.createElement('label'), { className: 'check' });
  const box = Object.assign(document.createElement('input'), { type: 'checkbox' });
  box.addEventListener('change', () => { cheats.unhurt = box.checked; box.blur(); });
  check.append(box, 'No recibe daño');
  panel.appendChild(check);

  heading('');
  const last = row();
  const reset = Object.assign(document.createElement('button'), { textContent: 'Volver a los valores de fábrica' });
  keepFocus(reset);
  // Everything this panel keeps goes back to how it came: the numbers, and who answers for the people.
  reset.addEventListener('click', () => { resetDials(); setVoice('sonnet'); voices.value = voiceName(); refresh(); });
  last.appendChild(reset);

  refresh();
  document.body.append(gear, panel);
}
