import * as THREE from 'three';
import { MODELS } from './buildings';
import { CABRAL_DRESS, model } from './figure';
import { Motion } from './motion';
import { flat } from './paint';
import { DRAWN as ROYALIST, LOOKS } from './realista';
import { View } from './view';

// Every character's model with each of its clips, to judge them without playing the game: chosen one
// at a time from the list, or all of them side by side to compare their heights. Kept up to date by
// itself: whoever is listed comes from the game's own registers (Cabral, the fusilier, the other
// kinds of the king's men with a model of their own, whoever keeps a house), and a model's clips are
// read off its file, so a new character or a new clip is here as soon as the game has it.

interface Who { name: string; url: string; drawn: number }

/** The kinds of the king's men, named as the game names them. */
const KIND_NAMES: Record<string, string> = { sargento: 'Sargento', capitan: 'El capitán', sableador: 'Sableador', tirador: 'Tirador' };
/** Whoever keeps a house, named as the story names them. */
const KEEPER_NAMES: Record<string, string> = { braulio: 'Don Braulio', anselmo: 'Fray Anselmo', tobias: 'Tobías', mateo: 'Mateo' };

const WHO: Who[] = [
  { name: 'Cabral', url: 'cabral/3d/cabral_animado.glb', drawn: CABRAL_DRESS.drawn },
  { name: 'Realista', url: 'realista/3d/realista_animado.glb', drawn: ROYALIST },
  ...Object.entries(LOOKS).map(([kind, look]) => ({ name: KIND_NAMES[kind] ?? kind, url: look.url, drawn: look.drawn })),
  ...Object.values(MODELS).flatMap(b => b.inside?.keeper ? [b.inside.keeper] : [])
    .map(k => ({ name: KEEPER_NAMES[k.who] ?? k.who, url: k.url, drawn: k.drawn })),
];

/**
 * How the game times a clip, where it does not play it at its own pace: over so long (`lasts`),
 * or once and held on its last frame (`once`). Any clip not here loops at its own pace.
 */
const DRAW = 0.45, SHOT = 0.8;
const TIMING: Record<string, { lasts?: number; once?: boolean }> = {
  mosquete_sacar: { lasts: DRAW }, mosquete_disparo: { lasts: SHOT },
  granada_sacar: { lasts: DRAW }, granada_lanzar: { lasts: SHOT },
  tajo: { lasts: 0.5 }, barrido: { once: true }, grito: { lasts: 2.0 },
  muerte: { once: true }, rodada_mixamo: { once: true }, beber: { once: true },
};
/**
 * The clips the game plays: any whose name is written in quotes in the 3D game's code. Found there,
 * not listed here, so a clip is counted as soon as the game plays it; the rest of a model's clips
 * (tried and left, or come with Tripo's rig) are shown after, dimmed.
 */
const CODE = Object.entries(import.meta.glob('./**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  .filter(([path]) => !path.endsWith('modelos.ts')).map(([, text]) => text).join('\n');
const used = (name: string) => CODE.includes(`'${name}'`);
/** The clips a character stands and walks with, listed first. */
const FIRST = ['reposo_mixamo', 'caminata_mixamo', 'caminata_atras'];
/** How far apart they stand when all are shown, in world units. */
const APART = 70;

const view = new View(document.getElementById('world')!);
view.apply({ ...view.look, far: 0.6 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), flat('#8a7a50'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
view.scene.add(floor);
view.follow(new THREE.Vector3(0, 30, 0));

const loaded = new Map<Who, { body: THREE.Group; motion: Motion; clips: string[] }>();
let shown: Who[] = [], clip = 'reposo_mixamo', into = 0, paused = false, turn = 0, pace = 1, loop = true;

const who = document.getElementById('who')!, clipsBar = document.getElementById('clips')!, told = document.getElementById('told')!;

function button(parent: HTMLElement, text: string, act: () => void): HTMLButtonElement {
  const b = Object.assign(document.createElement('button'), { textContent: text });
  b.onclick = act;
  parent.append(b);
  return b;
}

async function load(w: Who) {
  let it = loaded.get(w);
  if (!it) {
    const body = await model(w.url, w.drawn);
    const clips = body.animations.map(a => a.name);
    clips.sort((a, b) => (FIRST.indexOf(a) + 1 || 99) - (FIRST.indexOf(b) + 1 || 99) || a.localeCompare(b));
    it = { body, motion: new Motion(body), clips };
    loaded.set(w, it);
  }
  return it;
}

/** How long a clip runs as the game plays it, in seconds. */
function length(name: string): number {
  const t = TIMING[name];
  if (t?.lasts) return t.lasts;
  for (const w of shown) { const it = loaded.get(w); if (it?.motion.has(name)) return it.motion.seconds(name); }
  return 2;
}

/** Shows one character, or all of them; their clips as buttons. */
async function show(list: Who[], mark: HTMLButtonElement): Promise<void> {
  for (const b of who.querySelectorAll('button')) b.classList.toggle('on', b === mark);
  for (const it of loaded.values()) view.scene.remove(it.body);
  shown = list;
  const all = await Promise.all(list.map(load));
  all.forEach((it, i) => { it.body.position.x = (i - (all.length - 1) / 2) * APART; view.scene.add(it.body); });
  // Their clips: with several, those any of them has (each one lacking a clip stands as he is).
  const names = [...new Set(all.flatMap(it => it.clips))];
  if (!names.includes(clip)) clip = names[0] ?? 'reposo_mixamo';
  clipsBar.replaceChildren();
  const ordered = [...names.filter(used), ...names.filter(n => !used(n))];
  for (const name of ordered) {
    const b = button(clipsBar, name, () => { play(name); for (const x of clipsBar.children) x.classList.toggle('on', x === b); });
    if (name === clip) b.classList.add('on');
    if (!used(name)) b.classList.add('unused');
  }
  play(clip);
  view.apply({ ...view.look, far: list.length > 1 ? 1.4 : 0.6 });
  // Framed on the middle of whoever is tallest.
  view.follow(new THREE.Vector3(0, Math.max(...list.map(w => w.drawn)) * 0.5, 0));
}

function play(name: string): void {
  clip = name;
  into = 0;
  const t = TIMING[name] ?? {};
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    const c = it.motion.has(name) ? name : 'reposo_mixamo';
    it.motion.play(c, { once: !!t.lasts || !!t.once, lasts: t.lasts, afresh: true, blend: 0.12 });
  }
}

/** What each carries, shown as the game shows it for the clip: which musket, the sabre, the grenade. */
function carried(body: THREE.Object3D): void {
  const musket = clip.startsWith('mosquete'), grenade = clip.startsWith('granada');
  const inHand = clip === 'mosquete_apuntar' || (clip === 'mosquete_sacar' && into >= DRAW * 0.5) || (clip === 'mosquete_disparo' && into < SHOT * 0.72);
  const back = body.getObjectByName('mosquete'), hand = body.getObjectByName('mosquete_mano');
  if (back) back.visible = !inHand;
  if (hand) hand.visible = inHand;
  const sabre = body.getObjectByName('sable');
  if (sabre) sabre.visible = !musket && !grenade;
  const bomb = body.getObjectByName('granada');
  if (bomb) bomb.visible = clip === 'granada_apuntar' || (clip === 'granada_sacar' && into >= DRAW * 0.36) || (clip === 'granada_lanzar' && into < SHOT * 0.16);
}

// The list: each alone, and all together.
for (const w of WHO) { const b = button(who, w.name, () => void show([w], b)); }
const together = button(who, 'Todos juntos', () => void show(WHO, together));

// What is done with whoever is shown.
const tools = document.getElementById('tools')!;
const pause = button(tools, 'pausa', () => { paused = !paused; pause.classList.toggle('on', paused); });
const again = button(tools, 'repetir', () => { loop = !loop; again.classList.toggle('on', loop); });
again.classList.add('on');
button(tools, 'pixel', () => { view.pixelated = !view.pixelated; });
function slider(text: string, min: number, max: number, value: number, step: number, set: (v: number) => void): void {
  const label = document.createElement('label');
  const input = Object.assign(document.createElement('input'), { type: 'range', min, max, value, step });
  input.oninput = () => set(Number(input.value));
  label.append(text, input);
  tools.append(label);
}
slider('giro', -180, 180, 0, 15, v => { turn = THREE.MathUtils.degToRad(v); });
slider('velocidad', 0.1, 1, 1, 0.05, v => { pace = v; });
slider('cerca', 0.25, 1.8, 0.6, 0.05, v => view.apply({ ...view.look, far: v }));

void show([WHO[0]], who.querySelector('button')!);

let last = performance.now();
view.renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = paused ? 0 : Math.min(0.1, (now - last) / 1000) * pace;
  last = now;
  into += dt;
  // A clip played once starts over after a moment held on its end, while "repetir" is on.
  const t = TIMING[clip];
  if (loop && t && into > length(clip) + 0.8) play(clip);
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    it.motion.update(dt);
    it.body.rotation.y = turn;
    carried(it.body);
  }
  told.textContent = `${shown.length > 1 ? 'Todos' : shown[0]?.name ?? ''} — ${clip}${paused ? ' (pausa)' : ''}`;
  view.draw();
});
