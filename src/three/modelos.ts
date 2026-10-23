import * as THREE from 'three';
import { MODELS } from './buildings';
import { CABRAL_DRESS, model } from './figure';
import { Fling } from './fling';
import { Motion } from './motion';
import { flat } from './paint';
import { Dust } from './dust';
import { DRESSES } from './people';
import { DRAWN as ROYALIST, LOOKS } from './realista';
import { View } from './view';

// Every character's model with each of its clips, to judge them without playing the game: chosen one
// at a time from the list, or all of them side by side to compare their heights. Kept up to date by
// itself: whoever is listed comes from the game's own registers (Cabral, the fusilier, the other
// kinds of the king's men with a model of their own, whoever keeps a house), and a model's clips are
// read off its file, so a new character or a new clip is here as soon as the game has it.

interface Who { name: string; url: string; drawn: number; kneels?: boolean; pistol?: boolean; lunge?: (typeof LOOKS)[string]['lunge'] }

/** The kinds of the king's men, named as the game names them. */
const KIND_NAMES: Record<string, string> = { sargento: 'Sargento', capitan: 'El capitán', sableador: 'Sableador', tirador: 'Tirador' };
/** Whoever keeps a house or stands about a map, named as the story names them. */
const KEEPER_NAMES: Record<string, string> = { braulio: 'Don Braulio', anselmo: 'Fray Anselmo', tobias: 'Tobías', mateo: 'Mateo' };

const WHO: Who[] = [
  { name: 'Cabral', url: 'cabral/3d/cabral_animado.glb', drawn: CABRAL_DRESS.drawn },
  { name: 'Realista', url: 'realista/3d/realista_animado.glb', drawn: ROYALIST },
  ...Object.entries(LOOKS).map(([kind, look]) => ({ name: KIND_NAMES[kind] ?? kind, url: look.url, drawn: look.drawn, kneels: !!look.kneels, pistol: !!look.pistol, lunge: look.lunge })),
  ...Object.values(MODELS).flatMap(b => b.inside?.keepers ?? [])
    .map(k => ({ name: KEEPER_NAMES[k.who] ?? k.who, url: k.url, drawn: k.drawn })),
  // And whoever stands about a map with a model of their own.
  ...Object.entries(DRESSES).flatMap(([who, d]) => d.url ? [{ name: KEEPER_NAMES[who] ?? who, url: d.url, drawn: d.drawn }] : []),
];

/**
 * How the game times a clip, where it does not play it at its own pace: over so long (`lasts`),
 * or once and held on its last frame (`once`). Any clip not here loops at its own pace. A name is
 * shared by clips of different characters (Cabral's cut and the sableador's two are both `tajo`):
 * one for a character alone is written `Name:clip`, and is looked for first.
 */
const DRAW = 0.45, SHOT = 0.8;
const TIMING: Record<string, { lasts?: number; once?: boolean }> = {
  mosquete_sacar: { lasts: DRAW }, mosquete_disparo: { lasts: SHOT },
  granada_sacar: { lasts: DRAW }, granada_lanzar: { lasts: SHOT },
  tajo: { lasts: 0.5 }, 'Realista:tajo': { lasts: 0.8 }, 'Sableador:tajo': { once: true },
  barrido: { once: true }, estocada: { once: true }, 'El capitán:grito': { lasts: 2.0 }, grito: { lasts: 2.0 }, tiro: { once: true },
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
/**
 * A move the game makes of a clip and his going, shown as a clip of its own: the captain's lunge, his
 * thrust held drawn back, then thrown on as he slides in (dust kicked up), as realista.ts plays it.
 */
const LUNGE = 'estocada_a_fondo';
/** The clips a character stands and walks with, listed first. */
const FIRST = ['reposo_mixamo', 'caminata_mixamo', 'caminata_atras'];
/** How far apart they stand when all are shown, in world units. */
const APART = 70;

const view = new View(document.getElementById('world')!);
const dust = new Dust();
view.scene.add(dust.group);
view.apply({ ...view.look, far: 0.6 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), flat('#8a7a50'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
view.scene.add(floor);
view.follow(new THREE.Vector3(0, 30, 0));

const loaded = new Map<Who, { body: THREE.Group; motion: Motion; clips: string[]; flung: Fling; home: number }>();
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
    it = { body, motion: new Motion(body), clips, flung: new Fling(() => 0), home: 0 };
    loaded.set(w, it);
  }
  return it;
}

/** How the game times a clip for a character. */
function timing(w: Who, name: string): { lasts?: number; once?: boolean } | undefined {
  return TIMING[`${w.name}:${name}`] ?? TIMING[name];
}

/** How long a clip runs as the game plays it, in seconds (for the first shown that has it). */
function length(name: string): number {
  const w = shown.find(x => loaded.get(x)?.motion.has(name));
  const t = w ? timing(w, name) : undefined;
  if (t?.lasts) return t.lasts;
  if (name === LUNGE) return shown.find(x => x.lunge)?.lunge?.time ?? 2;
  for (const w of shown) { const it = loaded.get(w); if (it?.motion.has(name)) return it.motion.seconds(name); }
  return 2;
}

/** Shows one character, or all of them; their clips as buttons. */
async function show(list: Who[], mark: HTMLButtonElement): Promise<void> {
  for (const b of who.querySelectorAll('button')) b.classList.toggle('on', b === mark);
  for (const it of loaded.values()) { it.flung.back(); view.scene.remove(it.body); }
  shown = list;
  const all = await Promise.all(list.map(load));
  all.forEach((it, i) => { it.body.position.x = it.home = (i - (all.length - 1) / 2) * APART; view.scene.add(it.body); });
  // Their clips: with several, those any of them has (each one lacking a clip stands as he is).
  const names = [...new Set([...all.flatMap(it => it.clips), ...(list.some(w => w.lunge) ? [LUNGE] : [])])];
  if (!names.includes(clip)) clip = names[0] ?? 'reposo_mixamo';
  clipsBar.replaceChildren();
  const playing = (n: string) => used(n) || n === LUNGE;
  const ordered = [...names.filter(playing), ...names.filter(n => !playing(n))];
  for (const name of ordered) {
    const b = button(clipsBar, name, () => { play(name); for (const x of clipsBar.children) x.classList.toggle('on', x === b); });
    if (name === clip) b.classList.add('on');
    if (!playing(name)) b.classList.add('unused');
  }
  play(clip);
  view.apply({ ...view.look, far: list.length > 1 ? 1.4 : 0.6 });
  // Framed on the middle of whoever is tallest.
  view.follow(new THREE.Vector3(0, Math.max(...list.map(w => w.drawn)) * 0.5, 0));
}

function play(name: string): void {
  clip = name;
  into = 0;
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    const t = timing(w, name) ?? {};
    it.body.position.x = it.home;
    it.body.position.z = 0;
    if (shown.length === 1) view.follow(new THREE.Vector3(0, w.drawn * 0.5, 0));
    if (name === LUNGE && w.lunge) continue;
    const c = it.motion.has(name) ? name : 'reposo_mixamo';
    it.motion.play(c, { once: !!t.lasts || !!t.once, lasts: t.lasts, afresh: true, blend: 0.12 });
    // One who holds his musket in both hands lets it fall from them as he falls, as in the game.
    it.flung.back();
    if (w.kneels && c === 'muerte') it.flung.throw(it.body);
  }
}

/** What each carries, shown as the game shows it for the clip: which musket, the sabre, the grenade. */
function carried(w: Who, body: THREE.Object3D): void {
  const musket = clip.startsWith('mosquete'), grenade = clip.startsWith('granada');
  // One who kneels to shoot has it always in his hands.
  const inHand = w.kneels || clip === 'mosquete_apuntar' || (clip === 'mosquete_sacar' && into >= DRAW * 0.5) || (clip === 'mosquete_disparo' && into < SHOT * 0.72);
  const back = body.getObjectByName('mosquete'), hand = body.getObjectByName('mosquete_mano');
  if (back) back.visible = !inHand;
  if (hand) hand.visible = inHand;
  const sabre = body.getObjectByName('sable');
  // One with a pistol has it in his left hand and his sabre in his right, both always.
  const thrust = body.getObjectByName('sable_estocada'), thrusting = clip === 'estocada' || clip === LUNGE;
  if (sabre) sabre.visible = w.pistol ? !thrusting || !thrust : !musket && !grenade;
  if (thrust) thrust.visible = thrusting;
  const bomb = body.getObjectByName('granada');
  if (bomb) bomb.visible = clip === 'granada_apuntar' || (clip === 'granada_sacar' && into >= DRAW * 0.36) || (clip === 'granada_lanzar' && into < SHOT * 0.16);
}

/** The lunge as the game plays it: held drawn back, then thrown on, sliding forward the way he faces from behind where he stood, dust kicked up. */
function lunge(l: NonNullable<Who['lunge']>, it: { body: THREE.Group; motion: Motion; home: number }, dt: number): void {
  const m = it.motion, ahead = new THREE.Vector3(Math.sin(turn), 0, Math.cos(turn));
  if (into < l.charge) m.hold(l.clip, l.wind, { blend: 0.2 });
  else m.play(l.clip, { once: true, pace: into < l.hit ? ((l.lands - l.wind) * m.seconds(l.clip)) / (l.hit - l.charge) : 1 });
  const share = Math.min(1, Math.max(0, (into - l.charge) / (l.hit - l.charge)));
  const at = ahead.clone().multiplyScalar(l.dash * (share - 0.5));
  it.body.position.set(it.home + at.x, 0, at.z);
  // Followed as he goes, when he is shown alone: he slides further than the view.
  if (shown.length === 1) view.follow(new THREE.Vector3(it.body.position.x, shown[0].drawn * 0.5, it.body.position.z));
  if (dt > 0 && into >= l.charge && into < l.hit + 0.08) dust.kick(it.body.position.clone(), ahead.clone().negate(), into >= l.hit ? 2 : 1);
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
  const once = clip === LUNGE || shown.some(w => timing(w, clip));
  if (loop && once && into > length(clip) + 0.8) play(clip);
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    if (clip === LUNGE && w.lunge) lunge(w.lunge, it, dt);
    it.motion.update(dt);
    it.flung.update(dt);
    it.body.rotation.y = turn;
    carried(w, it.body);
  }
  dust.update(dt);
  told.textContent = `${shown.length > 1 ? 'Todos' : shown[0]?.name ?? ''} — ${clip}${paused ? ' (pausa)' : ''}`;
  view.draw();
});
