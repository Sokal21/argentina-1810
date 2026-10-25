import * as THREE from 'three';
import { MODELS } from './buildings';
import { Cart } from './cart';
import { CABRAL_DRESS, model } from './figure';
import { Fling } from './fling';
import { Motion } from './motion';
import { flat } from './paint';
import { DRESSES } from './people';
import { KINDS, TroopBrain } from '../tropa/brain';
import { DRAWN as ROYALIST, LOOKS, Royalists, type Royalist } from './realista';
import { ISO_Y } from '../machi/data';
import { View } from './view';

// Every character's model with each of its clips, to judge them without playing the game: chosen one
// at a time from the list, or all of them side by side to compare their heights. Kept up to date by
// itself: whoever is listed comes from the game's own registers (Cabral, the fusilier, the other
// kinds of the king's men with a model of their own, whoever keeps a house), and a model's clips are
// read off its file, so a new character or a new clip is here as soon as the game has it.

interface Who { name: string; url: string; drawn: number; cart?: boolean; kneels?: boolean; pistol?: boolean; lunge?: (typeof LOOKS)[string]['lunge'] }

/** The kinds of the king's men, named as the game names them. */
const KIND_NAMES: Record<string, string> = { sargento: 'Sargento', capitan: 'El capitán', sableador: 'Sableador', tirador: 'Tirador' };
/** Whoever keeps a house or stands about a map, named as the story names them. */
const KEEPER_NAMES: Record<string, string> = { braulio: 'Don Braulio', anselmo: 'Fray Anselmo', tobias: 'Tobías', mateo: 'Mateo' };

const WHO: Who[] = [
  { name: 'Cabral', url: 'cabral/3d/cabral_animado.glb', drawn: CABRAL_DRESS.drawn },
  // Inti, the machi (Tripo from turnaround B, 25 October 2026), with every clip of the Pro Magic Pack on
  // her to choose among: 81 tall, as her 2D drawing.
  { name: 'Inti', url: 'machi/3d/inti_animado.glb', drawn: 81 },
  { name: 'Realista', url: 'realista/3d/realista_animado.glb', drawn: ROYALIST },
  ...Object.entries(LOOKS).map(([kind, look]) => ({ name: KIND_NAMES[kind] ?? kind, url: look.url, drawn: look.drawn, kneels: !!look.kneels, pistol: !!look.pistol, lunge: look.lunge })),
  ...Object.values(MODELS).flatMap(b => b.inside?.keepers ?? [])
    .map(k => ({ name: KEEPER_NAMES[k.who] ?? k.who, url: k.url, drawn: k.drawn })),
  // And whoever stands about a map with a model of their own.
  ...Object.entries(DRESSES).flatMap(([who, d]) => d.url ? [{ name: KEEPER_NAMES[who] ?? who, url: d.url, drawn: d.drawn }] : []),
  // The ox that is to draw the carts (not in the game yet): 72 to the tips of its horns, a little
  // under Cabral. Tripo's model on Quaternius's bull's skeleton (CC0, tools/blender/fit_to_bull.py),
  // playing the bull's own clips: carried over onto Tripo's own rig, its walk came out strange.
  { name: 'Buey', url: 'cosas/3d/buey/buey_animado.glb', drawn: 72 },
  // The ox cart whole, as the game draws it (three/cart.ts): going, its wheels rolling and its oxen
  // walking, in place; or standing, its oxen breathing and grazing now and then.
  { name: 'Carreta', url: '', drawn: 110, cart: true },
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
 * A move the game makes of a clip and his going, shown as a clip of its own: the captain's lunge. Not
 * acted out here but played by the game itself: his own brain (tropa/brain.ts) lunging at Cabral
 * standing `LUNGE_FROM` off, and his figure as the game draws it (three/realista.ts), so its charge,
 * its red glint, its slide (stopping short of him), its dust and its thrust are the game's own.
 */
const LUNGE = 'estocada_a_fondo', LUNGE_FROM = 180;
/** The clips a character stands and walks with, listed first. */
const FIRST = ['reposo_mixamo', 'caminata_mixamo', 'caminata_atras'];
/** How fast the cart goes in the gallery, world units a second (the 2D game's carts go 40 to 46). */
const CART_PACE = 44;
/** How far apart they stand when all are shown, in world units. */
const APART = 70;

const view = new View(document.getElementById('world')!);
/** The game's own royalists, for a move shown as the game plays it. */
const game = new Royalists();
view.scene.add(game.group);
let played: { who: Royalist & { mind: TroopBrain }; target: { x: number; y: number }; over: number } | null = null;
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

/** The cart, played as the game plays it: going (in place: it is brought back each frame) or standing. */
async function loadCart(w: Who) {
  const cart = new Cart();
  await cart.loaded;
  let going = false, ahead = 0;
  const motion = {
    play: (name: string) => { going = name === 'anda'; },
    has: (name: string) => name === 'anda' || name === 'quieta',
    seconds: () => 3,
    update: (dt: number) => {
      if (going) ahead += dt * CART_PACE;
      const home = cart.group.position.x;
      cart.update(dt, new THREE.Vector3(Math.sin(turn) * ahead, 0, Math.cos(turn) * ahead), turn);
      cart.group.position.set(home, 0, 0);
    },
  } as unknown as Motion;
  const it = { body: cart.group, motion, clips: ['anda', 'quieta'], flung: new Fling(() => 0), home: 0 };
  loaded.set(w, it);
  return it;
}

async function load(w: Who) {
  if (w.cart && !loaded.has(w)) return loadCart(w);
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
  leave();
  clip = name;
  into = 0;
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    const t = timing(w, name) ?? {};
    it.body.position.x = it.home;
    it.body.position.z = 0;
    if (shown.length === 1) view.follow(new THREE.Vector3(0, w.drawn * 0.5, 0));
    if (name === LUNGE && w.lunge) { act(it.body); continue; }
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

/**
 * The lunge as the game plays it: the captain's brain set on Cabral standing off before him (the way
 * "giro" turns him), only his lunge ready (his shout, his shot and his call put off), stepped each
 * frame and drawn by the game's own figure; and over again a moment after it is done.
 */
function act(body: THREE.Group): void {
  body.visible = false;
  const cabral = WHO[0];
  const brain = new TroopBrain(KINDS.capitan, 0, 0);
  const put = brain as unknown as Record<string, number>;
  put.lunging = 0;
  put.shout = put.reload = put.calling = 99;
  brain.relentless = true;
  const target = { x: Math.sin(turn) * LUNGE_FROM, y: Math.cos(turn) * LUNGE_FROM * ISO_Y };
  played = { who: { mind: brain, hurt: 0, look3d: 'capitan' }, target, over: 0 };
  // Cabral standing where he is lunged at, facing him.
  void load(cabral).then(it => {
    if (!played) return;
    it.body.position.set(target.x, 0, target.y / ISO_Y);
    it.body.rotation.y = turn + Math.PI;
    it.motion.play('reposo_mixamo');
    view.scene.add(it.body);
  });
}

/** Steps the move played by the game: its brain and its figure; the view following him. */
function step(dt: number): void {
  if (!played) return;
  const { who, target } = played;
  if (dt > 0) who.mind.update(dt, target);
  game.update(dt, [who]);
  if (who.mind.mode !== 'lunge' && who.mind.t > 0.05) played.over += dt;
  if (played.over > 1.2) { const it = loaded.get(shown[0]); if (it) act(it.body); }
  if (shown.length === 1) view.follow(new THREE.Vector3(who.mind.x, shown[0].drawn * 0.5, who.mind.y / ISO_Y));
}

/** Leaves the move played by the game: the captain and Cabral as the gallery shows them again. */
function leave(): void {
  if (!played) return;
  played = null;
  game.update(0, []);
  const cabral = loaded.get(WHO[0]);
  if (cabral && !shown.includes(WHO[0])) view.scene.remove(cabral.body);
  for (const w of shown) { const it = loaded.get(w); if (it) it.body.visible = true; }
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
  const once = clip !== LUNGE && shown.some(w => timing(w, clip));
  if (loop && once && into > length(clip) + 0.8) play(clip);
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    it.motion.update(dt);
    it.flung.update(dt);
    it.body.rotation.y = turn;
    carried(w, it.body);
  }
  step(dt);
  told.textContent = `${shown.length > 1 ? 'Todos' : shown[0]?.name ?? ''} — ${clip}${paused ? ' (pausa)' : ''}`;
  view.draw();
});
