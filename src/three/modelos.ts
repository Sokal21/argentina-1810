import * as THREE from 'three';
import { MODELS } from './buildings';
import { MUSKET_TIMES } from './cabral';
import { Cart } from './cart';
import { ChonchonFigure, DRAWN as CHONCHON } from './chonchon';
import { ChonchonBrain } from '../chonchon/brain';
import { Spirit } from './spirit';
import { Stench } from './stench';
import { Wekufe } from './wekufe';
import { RISE, Rising } from './rising';
import { Vomit } from './vomit';
import { Shots } from './shot';
import { Battery3D } from './battery';
import { Dust } from './dust';
import { plan, type SalvoKind } from '../tropa/battery';
import { SHOT as BALLS } from '../bolts';
import { CABRAL_DRESS, model } from './figure';
import { Fling } from './fling';
import { Motion } from './motion';
import { flat } from './paint';
import { DRESSES } from './people';
import { KINDS, TroopBrain } from '../tropa/brain';
import { DRAWN as ROYALIST, LOOKS, Royalists, type Royalist } from './realista';
import { ISO_Y } from '../machi/data';
import { View } from './view';
import { UPRIGHT } from './space';

// Every character's model with each of its clips, to judge them without playing the game: chosen one
// at a time from the list, or all of them side by side to compare their heights. Kept up to date by
// itself: whoever is listed comes from the game's own registers (Cabral, the fusilier, the other
// kinds of the king's men with a model of their own, whoever keeps a house), and a model's clips are
// read off its file, so a new character or a new clip is here as soon as the game has it.

interface Who { name: string; url: string; drawn: number; cart?: boolean; spirit?: boolean; kneels?: boolean; pistol?: boolean; lunge?: (typeof LOOKS)[string]['lunge']; dives?: boolean; stench?: boolean; vomits?: boolean; revolver?: boolean; spots?: boolean; wekufe?: boolean }

/** The kinds of the king's men, named as the game names them. */
const KIND_NAMES: Record<string, string> = { sargento: 'Sargento', capitan: 'El capitán', sableador: 'Sableador', tirador: 'Tirador', frontera: 'Soldado de frontera' };
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
  // The plague-dead soldier of Inti's arc (Tripo from turnaround A, 27 October 2026), a tank: Mixamo's
  // zombie clips on him, two deaths to choose between, and his retching (a cough captured lying down, stood up), his crawls and his getting up out of the ground. Not in the game yet; drawn a head over the
  // frontier soldier he was; in the cloud of his stench.
  { name: 'Apestado', url: 'apestado/3d/apestado_animado.glb', drawn: 88, stench: true, vomits: true },
  // Julio Argentino Roca, the last boss of his road in Inti's arc (Tripo from turnaround A, 28 October
  // 2026): the captain's clips on him (Mixamo's captures again, as tools/mocap/README.md has them), his
  // sabre in his right hand, his revolver in his left; his slash, Mixamo's Sword And Shield Slash; his
  // signal to his battery keyed by hand (anims/senal.py). A head over the captain. Not in the game yet.
  { name: 'Roca', url: 'roca/3d/roca_animado.glb', drawn: 100, pistol: true, revolver: true },
  // Roca's artillery spotter (Tripo from turnaround B, 28 October 2026): a red flag in his right hand and
  // a white in his left (props.signal_flag); Mixamo's breathing idle, Running and the fusilier's fall,
  // and his signals to the battery keyed by hand (anims/senas.py). Not in the game yet.
  { name: 'Observador', url: 'observador/3d/observador_animado.glb', drawn: 76, spots: true },
  { name: 'Buey', url: 'cosas/3d/buey/buey_animado.glb', drawn: 72 },
  // Inti's nahuel: Quaternius's wolf (CC0) in the slate blue of her spirit, its eyes her spells' cyan; its
  // own clips. A puma of ours was tried on the wolf's and the sabre-tooth's skeletons and keyed by hand
  // (puma_animado.glb): its long legs went through its own body as they gathered.
  { name: 'Nahuel', url: 'nahuel/3d/nahuel_animado.glb', drawn: 52, spirit: true },
  { name: 'Puma (intento)', url: 'nahuel/3d/puma_animado.glb', drawn: 52 },
  // The chonchón (Tripo from turnaround C, 25 October 2026): its wings boned and its flap keyed by hand
  // (tools/blender/rig_wings.py). 60 from wingtips to the ends of its hair, as its 2D drawing.
  { name: 'Chonchón', url: 'chonchon/3d/chonchon_animado.glb', drawn: CHONCHON, dives: true },
  // The Wekufe, the last boss of the demon's road in Inti's arc (Tripo from turnaround A, 29 October
  // 2026): a floating horned shadow, his model cut a little under his waist (tools/blender/cut_below.py),
  // below it a long gown of black smoke and fire swinging as his legs, bones under nothing, swing
  // (tools/blender/smoke_tail.py; three/wekufe.ts); his eyes and belly glowing. Mixamo's Mutant Idle and
  // Mutant Swiping, Run To Dive for his going into the earth as he comes out of smoke beside her, and
  // Zombie Agonizing for his death, sinking into it; the Pro Magic Pack's for summoning his spirits and throwing his fire.
  // Not in the game yet.
  { name: 'Wekufe', url: 'wekufe/3d/wekufe_animado.glb', drawn: 150, wekufe: true },
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
/**
 * The musket taken from his back and put back by Mixamo's capture (anims/descolgar.py): as long as
 * the game takes over each (their own pace is 2.2 s and 2.7 s), and in turn as the game plays them,
 * taken, aimed `HOLD` and put back (`SLUNG_AGAIN`).
 */
const UNSLING = MUSKET_TIMES.shoulder, SLING = MUSKET_TIMES.putBack, HOLD = 1.2, SLUNG_AGAIN = 'descolgar_y_guardar';
const TIMING: Record<string, { lasts?: number; once?: boolean }> = {
  mosquete_sacar: { lasts: DRAW }, mosquete_disparo: { lasts: SHOT },
  mosquete_descolgar: { lasts: UNSLING }, mosquete_guardar: { lasts: SLING }, [SLUNG_AGAIN]: { lasts: UNSLING + HOLD + SLING },
  granada_sacar: { lasts: DRAW }, granada_lanzar: { lasts: SHOT },
  tajo: { lasts: 0.5 }, 'Realista:tajo': { lasts: 0.8 }, 'Sableador:tajo': { once: true },
  barrido: { once: true }, estocada: { once: true }, zarpazo: { once: true }, 'El capitán:grito': { lasts: 2.0 }, grito: { lasts: 2.0 }, tiro: { once: true },
  muerte: { once: true }, muerte_b: { once: true }, 'Apestado:golpe': { once: true }, vomito: { once: true }, levantarse: { once: true }, sablazo: { once: true }, senal: { once: true }, senas: { once: true }, rafaga: { once: true }, rodada_mixamo: { once: true }, zambullida: { once: true }, invocar: { once: true }, lanzar: { once: true }, beber: { once: true },
};
/** How long a clip's end is held before it starts over, for one whose end goes on after it, in seconds. */
const HELD: Record<string, number> = { zambullida: 3.2, 'Wekufe:muerte': 3.2, invocar: 6, lanzar: 5.2 };
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
/**
 * The chonchón as the game plays it: its own brain set on Inti standing `DIVE_FROM` off, circling her
 * and diving at her (and biting her, close), drawn by its game figure (three/chonchon.ts); or set
 * on her standing `BITE_FROM` off, close enough to bite her, and put back there after each bite.
 */
const DIVE = 'en_picada', DIVE_FROM = 150, BITE = 'en_mordida', BITE_FROM = 30;
/** Or brought down: struck once and again, as her orbs strike it (red, flashing), falling, sinking; and back up for another go. */
const DOWNED = 'derribado', STRIKES = [0.8, 1.4], AGAIN = 3.5;
/**
 * The plague-dead soldier coming up out of the earth, whole (three/rising.ts): the ground swelling,
 * breaking, him getting up out of it sunk at first, his scream, and the earth settling.
 */
const RISEN = 'salir_de_la_tierra', SCREAM = 2.0;
const risings = new Map<Who, Rising>();
/** His retching, played on his scream (three/vomit.ts): the spray and the pool it leaves, in its cone. */
const RETCH = 'vomitar';
const vomits = new Map<Who, Vomit>();
/**
 * Roca's burst (his fight's second phase, docs/historia/inti/README.md): his burst played (his shot
 * with his body swept from his right to his left, anims/abanico.py), and as it goes off his revolver
 * fanned across the cone before him, from his right, `shots` balls `apart` seconds apart, from
 * one side of `cone` (degrees) to the other; each a ball as the royalists' are (three/shot.ts).
 */
const BURST = 'rafaga', FAN = { shots: 5, apart: 0.09, cone: 50, at: 14 / 49 };
/** Where his revolver's muzzle is, in its own units (props.py's REVOLVER_MUZZLE). */
const REVOLVER_MUZZLE = new THREE.Vector3(0.21, 0, 0.042);

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
let hunting: { brain: ChonchonBrain; figure: ChonchonFigure; her: { x: number; y: number }; close: boolean; downed: boolean; since: number; struck: number } | null = null;
view.apply({ ...view.look, far: 0.6 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), flat('#8a7a50'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
view.scene.add(floor);
view.follow(new THREE.Vector3(0, 30, 0));

// Roca's balls are tracers (the user, 28/10/2026).
const balls = new Shots(view.camera, () => null, () => {}, false, BALLS, true);
view.scene.add(balls.group);
/**
 * The battery's two salvoes of the first phase of Roca's fight, called down by his spotter: his
 * signals played, and as his red flag points (`at`, a share of them) a salvo aimed `ahead` before
 * him (tropa/battery.ts plans it, three/battery.ts shows it), the camera shaken by each blast.
 */
const SALVOES: Record<string, SalvoKind> = { bombardeo_desperdigado: 'scattered', bombardeo_concentrado: 'concentrated' };
const CALL = { at: 15 / 46, ahead: 240 };
/** How long a spotter's flag is from his fist to its far end, in its own units (props.signal_flag). */
const FLAG_LONG = 0.28;
/** Roca calling a salvo himself in his fight's second phase, with his sabre (his `senal`), and how far before him it falls. */
const ROCA_SALVO = 'senal_salva', ROCA_CALL = { at: 26 / 48, ahead: 180 };
/**
 * Roca coming into his fight (the user, 28/10/2026): he drops onto the clearing from high over it, as
 * one leaping down from far off, and lands hard (Mixamo's Hard Landing, his `aterrizaje`), the ground
 * shaken and its dust thrown up. He is seen `high` over the ground and falls, quicker and quicker,
 * held in the clip's first pose for `fall` seconds and then in the clip itself, whose feet meet the
 * ground at `lands` of it; there the camera is shaken for `shaken` seconds, `jolt` pixels.
 */
const LANDING = 'caida', DROP = { high: 320, fall: 0.6, lands: 12 / 48, shaken: 0.6, jolt: 9 };
const dust = new Dust();
view.scene.add(dust.group);
const battery = new Battery3D();
view.scene.add(battery.group);
battery.blasted = blast => view.jolt(blast.great ? 0.45 : 0.25, blast.great ? 6 : 3, true);
/** Where the view is held while a salvo falls (it must be followed each frame for the shake to die away). */
let framed: THREE.Vector3 | null = null;
const spirits: Spirit[] = [];
const stenches: Stench[] = [];
const wekufes = new Map<Who, Wekufe>();
let preyTime = 0;
const preyMark = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: '#7fe8ff' }));
preyMark.visible = false;
view.scene.add(preyMark);
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
    // A spirit, as the game shows it: its halo, its inner light, its motes, its pool of light.
    if (w.spirit) { const s = new Spirit(body); spirits.push(s); view.scene.add(s.group); }
    // The plague-dead soldier's stench, carried off behind him.
    if (w.stench) { const s = new Stench(body, w.drawn * UPRIGHT); stenches.push(s); view.scene.add(s.group); }
    // The Wekufe floating in his smoke, his eyes and belly glowing.
    if (w.wekufe) { const k = new Wekufe(body, w.drawn * UPRIGHT); wekufes.set(w, k); view.scene.add(k.group); }
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
  if (name === BURST) return 2.2;
  if (SALVOES[name] || name === ROCA_SALVO) return 5;
  if (name === LANDING) return DROP.fall + (shown.find(x => x.revolver) ? loaded.get(shown.find(x => x.revolver)!)?.motion.seconds('aterrizaje') ?? 2 : 2);
  if (name === RETCH) return Math.max(...shown.map(x => vomits.get(x)?.lasts ?? 0), 0);
  if (name === RISEN) return Math.max(...shown.map(x => risings.get(x)?.lasts ?? 0), 0);
  for (const w of shown) { const it = loaded.get(w); if (it?.motion.has(name)) return it.motion.seconds(name); }
  return 2;
}

/** Shows one character, or all of them; their clips as buttons. */
async function show(list: Who[]): Promise<void> {
  for (const it of loaded.values()) { it.flung.back(); view.scene.remove(it.body); }
  shown = list;
  const all = await Promise.all(list.map(load));
  all.forEach((it, i) => { it.body.position.x = it.home = (i - (all.length - 1) / 2) * APART; view.scene.add(it.body); });
  // Their clips: with several, those any of them has (each one lacking a clip stands as he is).
  const names = [...new Set([...all.flatMap(it => it.clips), ...(list.some(w => w.lunge) ? [LUNGE] : []), ...(list.some(w => w.dives) ? [DIVE, BITE, DOWNED] : []),
    ...(all.some(it => it.motion.has('mosquete_descolgar')) ? [SLUNG_AGAIN] : []), ...(all.some(it => it.motion.has('levantarse')) ? [RISEN] : []), ...(list.some(w => w.vomits) ? [RETCH] : []), ...(list.some(w => w.revolver) ? [BURST] : []), ...(list.some(w => w.spots) ? Object.keys(SALVOES) : []), ...(list.some(w => w.revolver) ? [ROCA_SALVO, LANDING] : [])])];
  if (!names.includes(clip)) clip = names[0] ?? 'reposo_mixamo';
  clipsBar.replaceChildren();
  const playing = (n: string) => used(n) || n === LUNGE || n === DIVE || n === BITE || n === DOWNED || n === SLUNG_AGAIN || n === RISEN || n === RETCH || n === BURST || !!SALVOES[n] || n === ROCA_SALVO || n === LANDING;
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
    it.body.position.y = it.body.position.z = 0;
    it.body.visible = true;
    risings.get(w)?.update(Infinity);
    vomits.get(w)?.stop();
    // The Wekufe diving into the earth, under it until another clip is played.
    const wekufe = wekufes.get(w);
    if (wekufe) { if (name === 'zambullida') wekufe.dive(it.motion.seconds(name)); else if (name === 'muerte') wekufe.dies(it.motion.seconds(name)); else wekufe.rises(); }
    if (wekufe) { if (name === 'zarpazo') wekufe.claw(it.motion.seconds(name)); else wekufe.unclaw(); }
    if (wekufe) { if (name === 'invocar') wekufe.invoke(it.motion.seconds(name)); else wekufe.uninvoke(); }
    if (wekufe) { if (name === 'lanzar') wekufe.throwFire(it.motion.seconds(name)); else wekufe.unthrowFire(); }
    if (shown.length === 1) view.follow(new THREE.Vector3(0, w.drawn * 0.5, 0));
    if (name === LUNGE && w.lunge) { act(it.body); continue; }
    if ((name === DIVE || name === BITE || name === DOWNED) && w.dives) { hunt(it.body, name === BITE, name === DOWNED); continue; }
    if (name === SLUNG_AGAIN && it.motion.has('mosquete_descolgar')) { slungAgain(it.motion, 0, true); continue; }
    if (name === RISEN && it.motion.has('levantarse')) { rise(w, it.body, it.motion); continue; }
    if (name === ROCA_SALVO && w.revolver) {
      it.motion.play('senal', { once: true, afresh: true, blend: 0.12 });
      framed = new THREE.Vector3(Math.sin(turn) * ROCA_CALL.ahead / 2, w.drawn * 0.5, Math.cos(turn) * ROCA_CALL.ahead / 2);
      continue;
    }
    if (SALVOES[name] && w.spots) {
      it.motion.play('senas', { once: true, afresh: true, blend: 0.12 });
      framed = new THREE.Vector3(Math.sin(turn) * CALL.ahead / 2, w.drawn * 0.5, Math.cos(turn) * CALL.ahead / 2);
      view.apply({ ...view.look, far: 1.1 });
      continue;
    }
    if (name === LANDING && w.revolver) { it.motion.hold('aterrizaje', 0, { afresh: true }); it.body.position.y = DROP.high; continue; }
    if (name === BURST && w.revolver) { it.motion.play('rafaga', { once: true, afresh: true, blend: 0.12 }); continue; }
    if (name === RETCH && w.vomits) {
      let vomit = vomits.get(w);
      if (!vomit) { vomit = new Vomit(it.body, w.drawn * UPRIGHT); vomits.set(w, vomit); view.scene.add(vomit.group); }
      it.body.rotation.y = turn;
      vomit.start();
      it.motion.play('grito', { once: true, lasts: SCREAM, afresh: true, blend: 0.12 });
      continue;
    }
    const c = it.motion.has(name) ? name : 'reposo_mixamo';
    it.motion.play(c, { once: !!t.lasts || !!t.once, lasts: t.lasts, afresh: true, blend: 0.12 });
    // One who holds his musket in both hands lets it fall from them as he falls, as in the game.
    it.flung.back();
    if (w.kneels && c === 'muerte') it.flung.throw(it.body);
    // The spotter lets both his flags fly from his hands (props.signal_flag: their poles 0.28 long).
    if (w.spots && c === 'muerte') for (const flag of ['bandera_roja', 'bandera_blanca']) it.flung.throw(it.body, flag, FLAG_LONG);
  }
}

/** Roca falling onto the ground and landing on it, so far `into` it: see DROP. */
function landing(body: THREE.Group, motion: Motion, into: number, dt: number): void {
  const down = DROP.fall + DROP.lands * motion.seconds('aterrizaje'), was = into - dt;
  if (was < DROP.fall && into >= DROP.fall) motion.play('aterrizaje', { once: true, afresh: true, blend: 0.05 });
  body.position.y = into < down ? DROP.high * (1 - (into / down) ** 2) : 0;
  if (was < down && into >= down) {
    view.jolt(DROP.shaken, DROP.jolt, true);
    const at = new THREE.Vector3(body.position.x, 0, body.position.z);
    dust.cloud(at);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      dust.kick(at.clone().add(new THREE.Vector3(Math.cos(a) * 14, 0, Math.sin(a) * 14)), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 1.5);
    }
  }
}

/** Taken, aimed and put back in turn: the clip for so far `into` it. */
function slungAgain(motion: Motion, into: number, afresh = false): void {
  if (into < UNSLING) motion.play('mosquete_descolgar', { once: true, lasts: UNSLING, afresh, blend: 0.12 });
  else if (into < UNSLING + HOLD) motion.play('mosquete_apuntar', { blend: 0.1 });
  else motion.play('mosquete_guardar', { once: true, lasts: SLING, blend: 0.1 });
}

/** The ground swelling where he is to come up: his rising started, him not drawn until he breaks out. */
function rise(w: Who, body: THREE.Object3D, motion: Motion): void {
  let rising = risings.get(w);
  if (!rising) { rising = new Rising(w.drawn * UPRIGHT, motion.seconds('levantarse')); risings.set(w, rising); view.scene.add(rising.group); }
  rising.start(body.position, turn);
  body.visible = false;
  motion.play('reposo', { afresh: true });
}

/** Coming up out of the earth, so far `into` it: unseen, getting up out of it (sunk), screaming, standing. */
function risen(w: Who, body: THREE.Object3D, motion: Motion, into: number): void {
  const rising = risings.get(w);
  if (!rising) return;
  const up = motion.seconds('levantarse');
  body.visible = rising.out || into >= RISE.warn;
  body.position.y = into < RISE.warn + up ? -rising.sunk : 0;
  if (into < RISE.warn) return;
  if (into < RISE.warn + up) motion.play('levantarse', { once: true, blend: 0 });
  else if (into < RISE.warn + up + SCREAM) motion.play('grito', { once: true, lasts: SCREAM, blend: 0.15 });
  else motion.play('reposo', { blend: 0.25 });
}

/** His revolver fanned across the cone as his shot goes off: each ball as its moment comes. */
function fan(body: THREE.Object3D, motion: Motion, into: number, dt: number): void {
  const first = FAN.at * motion.seconds('rafaga');
  for (let i = 0; i < FAN.shots; i++) {
    const at = first + i * FAN.apart;
    if (!(into - dt < at && into >= at)) continue;
    const gun = body.getObjectByName('pistola');
    if (!gun) return;
    body.updateMatrixWorld(true);
    const muzzle = REVOLVER_MUZZLE.clone().applyMatrix4(gun.matrixWorld);
    const angle = turn + THREE.MathUtils.degToRad(-FAN.cone / 2 + FAN.cone * i / (FAN.shots - 1));
    balls.fire(muzzle, new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)));
  }
}

/** What each carries, shown as the game shows it for the clip: which musket, the sabre, the grenade. */
function carried(w: Who, body: THREE.Object3D): void {
  const musket = clip.startsWith('mosquete') || clip === SLUNG_AGAIN, grenade = clip.startsWith('granada');
  // One who kneels to shoot has it always in his hands.
  // Taken and put back, the one in his hand is moved from his back and to it (props.musket_carried).
  const inHand = w.kneels || clip === 'mosquete_apuntar' || clip === 'mosquete_descolgar' || clip === 'mosquete_guardar' || clip === SLUNG_AGAIN || (clip === 'mosquete_sacar' && into >= DRAW * 0.5) || (clip === 'mosquete_disparo' && into < SHOT * 0.72);
  // The frontier soldier's bayonet thrust is made with his rifle in both fists, one of its own.
  const fixed = body.getObjectByName('fusil_bayoneta'), stabbing = !!fixed && clip === 'bayoneta';
  const back = body.getObjectByName('mosquete'), hand = body.getObjectByName('mosquete_mano');
  if (back) back.visible = !inHand && !stabbing;
  if (hand) hand.visible = inHand;
  if (fixed) fixed.visible = stabbing;
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

/** A chonchón's brain where the gallery sets it, going for her at once rather than after circling a while. */
function brainAt(): ChonchonBrain {
  const brain = new ChonchonBrain(0, 0);
  (brain as unknown as Record<string, number>).wait = 0;
  return brain;
}

/** The chonchón's brain set on Inti, standing off before it (close, to be bitten), and its game figure drawing it. */
function hunt(body: THREE.Group, close: boolean, downed = false): void {
  body.visible = false;
  // Close, she stands to its side, so its face is seen as it bites rather than hidden behind her.
  const inti = WHO[1], off = close ? BITE_FROM : DIVE_FROM, way = close ? turn + Math.PI / 2 : turn;
  const her = { x: Math.sin(way) * off, y: Math.cos(way) * off * ISO_Y };
  const figure = new ChonchonFigure();
  view.scene.add(figure.group);
  // Brought down, it has nobody to go for.
  hunting = { brain: brainAt(), figure, her, close, downed, since: 0, struck: 0 };
  void load(inti).then(it => {
    if (!hunting) return;
    it.body.position.set(her.x, 0, her.y / ISO_Y);
    it.body.rotation.y = way + Math.PI;
    it.motion.play('reposo_mixamo');
    view.scene.add(it.body);
  });
}

/** Steps the move played by the game: its brain and its figure; the view following him. */
function step(dt: number): void {
  if (hunting) {
    const { figure, her } = hunting;
    // Close, it is put back where it bites from a moment after each bite.
    if (hunting.close && hunting.brain.mode === 'fly' && hunting.brain.t > 0.6) hunting.brain = brainAt();
    if (hunting.downed) {
      const was = hunting.since;
      hunting.since += dt;
      for (const at of STRIKES) if (was < at && hunting.since >= at) { hunting.brain.hit(1, 0); hunting.struck = 1; }
      if (hunting.since > AGAIN) { hunting.brain = new ChonchonBrain(0, 0); hunting.since = 0; }
    }
    hunting.struck = Math.max(0, hunting.struck - dt / 0.22);
    const brain = hunting.brain;
    if (dt > 0) brain.update(dt, hunting.downed ? null : her);
    figure.update(dt, brain, hunting.struck);
    view.follow(new THREE.Vector3((brain.x + her.x) / 2, 30, (brain.y + her.y) / 2 / ISO_Y));
  }
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
  if (hunting) {
    view.scene.remove(hunting.figure.group);
    hunting = null;
    const inti = loaded.get(WHO[1]);
    if (inti && !shown.includes(WHO[1])) view.scene.remove(inti.body);
    for (const w of shown) { const it = loaded.get(w); if (it) it.body.visible = true; }
  }
  if (!played) return;
  played = null;
  game.update(0, []);
  const cabral = loaded.get(WHO[0]);
  if (cabral && !shown.includes(WHO[0])) view.scene.remove(cabral.body);
  for (const w of shown) { const it = loaded.get(w); if (it) it.body.visible = true; }
}

// The list, to choose from: each alone, and all together. The one chosen is kept for the next visit.
const choice = document.createElement('select');
for (const w of WHO) choice.append(new Option(w.name, w.name));
choice.append(new Option('Todos juntos', ''));
function choose(): void {
  try { localStorage.setItem('modelos.who', choice.value); } catch { /* kept only while the page is open */ }
  void show(choice.value ? WHO.filter(w => w.name === choice.value) : WHO);
}
choice.onchange = choose;
who.append(choice);

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

try { const kept = localStorage.getItem('modelos.who'); if (kept !== null && [...choice.options].some(o => o.value === kept)) choice.value = kept; } catch { /* the first, then */ }
choose();

let last = performance.now();
view.renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = paused ? 0 : Math.min(0.1, (now - last) / 1000) * pace;
  last = now;
  into += dt;
  // A clip played once starts over after a moment held on its end (longer for one whose end goes on
  // after it: the Wekufe's splash), while "repetir" is on.
  const once = clip !== LUNGE && (clip === RISEN || clip === RETCH || clip === LANDING || shown.some(w => timing(w, clip)));
  if (loop && once && into > length(clip) + (HELD[`${shown[0]?.name}:${clip}`] ?? HELD[clip] ?? 0.8)) play(clip);
  for (const w of shown) {
    const it = loaded.get(w);
    if (!it) continue;
    if (clip === SLUNG_AGAIN && it.motion.has('mosquete_descolgar')) slungAgain(it.motion, into);
    if (clip === RISEN) { risings.get(w)?.update(dt); risen(w, it.body, it.motion, into); }
    if (clip === BURST && w.revolver) fan(it.body, it.motion, into, dt);
    // As his red flag points, the salvo: aimed before him, on the 2D ground.
    if (SALVOES[clip] && w.spots) {
      const at = CALL.at * it.motion.seconds('senas');
      if (into - dt < at && into >= at) battery.salvo(plan(SALVOES[clip], { x: Math.sin(turn) * CALL.ahead, y: Math.cos(turn) * CALL.ahead * ISO_Y }));
    }
    // Roca's own: his sabre cut down to point (frame 26 of his signal), a small concentrated salvo where it points.
    if (clip === ROCA_SALVO && w.revolver) {
      const at = ROCA_CALL.at * it.motion.seconds('senal');
      if (into - dt < at && into >= at) battery.salvo(plan('small', { x: Math.sin(turn) * ROCA_CALL.ahead, y: Math.cos(turn) * ROCA_CALL.ahead * ISO_Y }));
    }
    if (clip === LANDING && w.revolver) landing(it.body, it.motion, into, dt);
    if (clip === RETCH && w.vomits) { vomits.get(w)?.update(dt); if (into > SCREAM) it.motion.play('reposo', { blend: 0.25 }); }
    it.motion.update(dt);
    it.flung.update(dt);
    it.body.rotation.y = turn;
    carried(w, it.body);
  }
  step(dt);
  for (const s of spirits) s.update(dt);
  for (const s of stenches) s.update(dt);
  // What his red fire hunts here: a mark swaying slowly from side to side where he throws, to be seen hit.
  for (const [w, k] of wekufes) {
    preyTime += dt;
    const preyAngle = Math.sin(preyTime * 0.7) * 0.8;
    const far = w.drawn * UPRIGHT * 1.1;
    k.prey.set(Math.cos(preyAngle) * far, w.drawn * UPRIGHT * 0.3, Math.sin(preyAngle) * far);
    preyMark.position.copy(k.prey);
    preyMark.visible = clip === 'lanzar' && shown.includes(w);
    k.update(dt);
  }
  balls.update(dt);
  battery.update(dt);
  dust.update(dt);
  if (framed && (SALVOES[clip] || clip === ROCA_SALVO)) view.follow(framed, dt);
  told.textContent = `${shown.length > 1 ? 'Todos' : shown[0]?.name ?? ''} — ${clip}${paused ? ' (pausa)' : ''}`;
  view.draw();
});
