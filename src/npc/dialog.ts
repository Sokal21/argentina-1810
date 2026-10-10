import type Phaser from 'phaser';
import type { Hero } from '../machi/data';
import { claude } from './claude';
import { ollama } from './ollama';
import type { Npc } from './npc';
import { offered, scripted, type Script } from './script';
import { SCRIPTS } from './scripts';
import { Talk, type Voice } from './talk';

// `framed` is for a portrait cut square out of a picture, which wants an
// edge; one drawn as a figure on nothing stands free, like his.
const HEROES: Record<Hero, { name: string; portrait: string; accent: string; framed: boolean }> = {
  inti: { name: 'Inti', portrait: 'dialogo/inti.png', accent: '#46e6fa', framed: true },
  cabral: { name: 'Cabral', portrait: 'dialogo/cabral.png', accent: '#ff7a00', framed: false },
};
const TYPE = 28;   // milliseconds a letter

/** What a favour does to the game, which the scene that opened the talk supplies. */
export interface Effects {
  /** A favour that mends the hero. */
  heal?: () => void;
  /** They were told something: the key of what. */
  told?: (key: string) => void;
  /** Something they asked was taken on: the key of what. */
  agreed?: (key: string) => void;
  /** The talk is over, and something was said in it. */
  talked?: () => void;
  /** They have had enough, for good. */
  closed?: () => void;
}

// Each remembers each hero for as long as the page is open, and one who has had enough stays so.
const talks = new Map<string, Talk>();

/** Whether someone has had enough of a hero, and will have no more to do with them. */
export function closedTo(hero: Hero, npc: Npc): boolean {
  return !!talks.get(`${hero}:${npc.id}`)?.over;
}

/** Whether every one of some people has had enough of a hero: nobody is left to talk to. */
export function shunned(hero: Hero, people: Npc[]): boolean {
  return people.length > 0 && people.every(npc => talks.get(`${hero}:${npc.id}`)?.over);
}
let open = false;

/** Who can answer for them: written choices, Claude in one of three sizes, or a model on this machine. */
export const VOICES = { opciones: 'Opciones escritas', sonnet: 'Claude Sonnet', haiku: 'Claude Haiku', opus: 'Claude Opus', ollama: 'Ollama (local)' } as const;
export type VoiceName = keyof typeof VOICES;
const KEPT = '1810.voz';

/**
 * Who answers for them now. Where the game is published nobody does: what to say is
 * chosen from what was written for each of them. While developing it is whatever was
 * last picked in the settings panel, or named in the address as ?voz=…; Claude Sonnet
 * if neither.
 */
export function voiceName(): VoiceName {
  if (!import.meta.env.DEV) return 'opciones';
  const asked = new URLSearchParams(location.search).get('voz') ?? localStorage.getItem(KEPT);
  return asked && asked in VOICES ? asked as VoiceName : 'sonnet';
}

/** Picks who answers from now on. Conversations begin again: nobody carries on in another's voice. */
export function setVoice(name: VoiceName): void {
  localStorage.setItem(KEPT, name);
  // The address no longer says otherwise.
  const url = new URL(location.href);
  if (url.searchParams.has('voz')) { url.searchParams.delete('voz'); history.replaceState(null, '', url); }
  talks.clear();
}

function voice(script: Script | undefined): Voice {
  if (script) return scripted(script);
  const name = voiceName();
  return name === 'ollama' ? ollama() : claude(name === 'haiku' || name === 'opus' ? name : 'sonnet');
}

/** Whether what is said is chosen rather than written. */
export function chosen(): boolean {
  return voiceName() === 'opciones';
}

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/**
 * The talking screen, as in the old role-playing games: the world stops and
 * darkens, the two of them face each other in large, and what is said goes
 * in a box below. The player types; he answers.
 */
export function openDialog(game: Phaser.Game, hero: Hero, npc: Npc, effects: Effects = {}): void {
  if (open) return;
  open = true;
  const known = `${hero}:${npc.id}`;
  const script = chosen() ? SCRIPTS[npc.id] ?? { who: npc.id, beats: [] } : undefined;
  const talk = talks.get(known) ?? new Talk(npc, hero, voice(script));
  talks.set(known, talk);

  const root = el('dialog'), text = el('dialog-text'), note = el('dialog-note'), name = el('dialog-name');
  const form = el<HTMLFormElement>('dialog-form'), input = el<HTMLInputElement>('dialog-input'), options = el('dialog-options');
  form.hidden = !!script;
  options.hidden = !script;
  options.replaceChildren();
  el<HTMLImageElement>('dialog-hero').src = HEROES[hero].portrait;
  el('dialog-hero').classList.toggle('framed', HEROES[hero].framed);
  // Someone not drawn yet is talked to with nobody on their side of the screen.
  const face = el<HTMLImageElement>('dialog-npc');
  face.hidden = !npc.portrait;
  if (npc.portrait) face.src = npc.portrait;
  root.style.setProperty('--hero', HEROES[hero].accent);
  root.style.setProperty('--npc', npc.accent);

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
    removeEventListener('keydown', pick);
    // Any key held when the talk began is no longer held.
    dispatchEvent(new Event('blur'));
    game.scene.resume('game');
    if (talk.lines.some(line => line.who === 'player')) effects.talked?.();
  };
  const escape = (e: KeyboardEvent) => {
    if (e.code !== 'Escape') return;
    e.stopImmediatePropagation();
    e.preventDefault();
    close();
  };

  // What can be said now, where it is chosen: each on a line, also taken by its number.
  const offer = () => {
    if (!script) return;
    const beat = talk.over ? undefined : offered(script, talk.trust, talk.lines, key => talk.took(key));
    options.replaceChildren(...(beat?.options ?? []).map((option, n) => {
      const button = Object.assign(document.createElement('button'), { textContent: option.says });
      button.dataset.n = String(n + 1);
      button.addEventListener('click', () => { void tell(option.says); });
      return button;
    }));
    if (!beat && !talk.over && !note.textContent) note.textContent = `${npc.name} no tiene más que decirte por ahora.`;
  };
  const pick = (e: KeyboardEvent) => {
    const button = options.children[Number(e.key) - 1] as HTMLButtonElement | undefined;
    if (script && !busy && button) { e.preventDefault(); button.click(); }
  };

  let busy = false;
  const submit = (e: Event) => {
    e.preventDefault();
    void tell(input.value.trim());
  };
  const tell = async (said: string) => {
    if (!said || busy || talk.over) return;
    busy = true;
    input.value = '';
    input.disabled = true;
    options.replaceChildren();
    note.textContent = '';
    await speak('hero', said, false);
    // He takes a moment, as anyone would.
    const dots = script ? 0 : window.setInterval(() => { note.textContent = `${talk.npc.name} lo piensa${'.'.repeat(1 + Date.now() / 400 % 3 | 0)}`; }, 200);
    try {
      const turn = await talk.say(said);
      clearInterval(dots);
      note.textContent = '';
      await speak('npc', turn.says, true);
      for (const favour of turn.done) {
        if (favour.effect) effects[favour.effect]?.();
        else effects.told?.(favour.key);
        note.textContent = favour.note;
      }
      for (const errand of turn.agreed) {
        effects.agreed?.(errand.key);
        note.textContent = errand.note;
      }
      if (turn.over) { note.textContent = `${talk.npc.name} no quiere saber más nada con vos.`; effects.closed?.(); }
    } catch (error) {
      clearInterval(dots);
      talk.lines.pop();
      note.textContent = 'Nadie contesta: el modelo no responde.';
      console.error(error);
    }
    busy = false;
    input.disabled = talk.over;
    if (!talk.over && !script) input.focus();
    offer();
  };

  form.addEventListener('submit', submit);
  addEventListener('keydown', escape, true);
  addEventListener('keydown', pick);
  input.disabled = false;
  input.value = '';
  // He picks up where they left off, or greets whoever is new.
  const last = [...talk.lines].reverse().find(line => line.who === 'npc');
  if (talk.over) {
    // There is nothing more to be had from them.
    void speak('npc', npc.closed, true);
    note.textContent = `${npc.name} no quiere saber más nada con vos.`;
    input.disabled = true;
    return;
  }
  void speak('npc', last?.text ?? talk.npc.greets, true).then(offer);
  if (!script) input.focus();
}
