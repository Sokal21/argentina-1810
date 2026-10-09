import type Phaser from 'phaser';
import type { Hero } from '../machi/data';
import { ollama } from './ollama';
import { PULPERO, type Favour } from './pulpero';
import { Talk } from './talk';

// `framed` is for a portrait cut square out of a picture, which wants an
// edge; one drawn as a figure on nothing stands free, like his.
const HEROES: Record<Hero, { name: string; portrait: string; accent: string; framed: boolean }> = {
  inti: { name: 'Inti', portrait: 'dialogo/inti.png', accent: '#46e6fa', framed: true },
  cabral: { name: 'Cabral', portrait: 'dialogo/cabral.png', accent: '#ff7a00', framed: false },
};
const NPC = { portrait: 'pulpero/retrato.png', accent: '#e2c478' };
const TYPE = 28;   // milliseconds a letter

/** What a favour does to the game, which the scene that opened the talk supplies. */
export type Effects = Partial<Record<Favour['key'], () => void>>;

// He remembers each of them for as long as the page is open.
const talks = new Map<Hero, Talk>();
let open = false;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/**
 * The talking screen, as in the old role-playing games: the world stops and
 * darkens, the two of them face each other in large, and what is said goes
 * in a box below. The player types; he answers.
 */
export function openDialog(game: Phaser.Game, hero: Hero, effects: Effects = {}): void {
  if (open) return;
  open = true;
  const talk = talks.get(hero) ?? new Talk(PULPERO, hero, ollama());
  talks.set(hero, talk);

  const root = el('dialog'), text = el('dialog-text'), note = el('dialog-note'), name = el('dialog-name');
  const form = el<HTMLFormElement>('dialog-form'), input = el<HTMLInputElement>('dialog-input');
  el<HTMLImageElement>('dialog-hero').src = HEROES[hero].portrait;
  el('dialog-hero').classList.toggle('framed', HEROES[hero].framed);
  el<HTMLImageElement>('dialog-npc').src = NPC.portrait;
  root.style.setProperty('--hero', HEROES[hero].accent);
  root.style.setProperty('--npc', NPC.accent);

  game.scene.pause('game');
  document.body.classList.add('talking');
  root.hidden = false;
  note.textContent = '';

  let typing = 0;
  // Whoever speaks has their name on the plate and their side lit.
  const speak = (who: 'npc' | 'hero', words: string, slowly: boolean): Promise<void> => new Promise(done => {
    clearInterval(typing);
    root.dataset.speaker = who;
    name.textContent = who === 'npc' ? talk.npc.name : HEROES[hero].name;
    if (!slowly) { text.textContent = words; done(); return; }
    let shown = 0;
    text.textContent = '';
    typing = window.setInterval(() => {
      text.textContent = words.slice(0, ++shown);
      if (shown >= words.length) { clearInterval(typing); done(); }
    }, TYPE);
  });

  const close = () => {
    if (!open) return;
    open = false;
    clearInterval(typing);
    root.hidden = true;
    document.body.classList.remove('talking');
    form.removeEventListener('submit', submit);
    removeEventListener('keydown', escape, true);
    // Any key held when the talk began is no longer held.
    dispatchEvent(new Event('blur'));
    game.scene.resume('game');
  };
  const escape = (e: KeyboardEvent) => {
    if (e.code !== 'Escape') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    close();
  };

  let busy = false;
  const submit = async (e: Event) => {
    e.preventDefault();
    const said = input.value.trim();
    if (!said || busy || talk.over) return;
    busy = true;
    input.value = '';
    input.disabled = true;
    note.textContent = '';
    await speak('hero', said, false);
    // He takes a moment, as anyone would.
    const dots = window.setInterval(() => { note.textContent = `${talk.npc.name} lo piensa${'.'.repeat(1 + Date.now() / 400 % 3 | 0)}`; }, 200);
    try {
      const turn = await talk.say(said);
      clearInterval(dots);
      note.textContent = '';
      await speak('npc', turn.says, true);
      for (const favour of turn.done) {
        effects[favour.key]?.();
        note.textContent = favour.note;
      }
      if (turn.over) { note.textContent = `${talk.npc.name} no quiere saber más nada con vos.`; talks.delete(hero); }
    } catch (error) {
      clearInterval(dots);
      talk.lines.pop();
      note.textContent = 'Nadie contesta: el modelo local no responde. ¿Está corriendo Ollama?';
      console.error(error);
    }
    busy = false;
    input.disabled = talk.over;
    if (!talk.over) input.focus();
  };

  form.addEventListener('submit', submit);
  addEventListener('keydown', escape, true);
  input.disabled = false;
  input.value = '';
  // He picks up where they left off, or greets whoever is new.
  const last = [...talk.lines].reverse().find(line => line.who === 'npc');
  void speak('npc', last?.text ?? talk.npc.greets, true);
  input.focus();
}
