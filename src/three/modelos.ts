import * as THREE from 'three';
import { model } from './figure';
import { Motion } from './motion';
import { flat } from './paint';
import { View } from './view';

// The characters' models side by side, playing their clips one after another as the game plays
// them, to judge each clip without playing the game: every clip on its own, or the whole round.

/** Timed as main.ts times Cabral's: the draw, the shot until slung again, the cut. */
const DRAW = 0.45, SHOT = 0.8, SLUNG = 0.72, SWING = 0.5;
/** The sergeant's sweep, as long as his blow in the game (src/tropa/brain.ts). */
const BLOW = 0.9;

interface Step {
  clip: string;
  /** How long it is shown for, in seconds. */
  seconds: number;
  /** Played once in this long, rather than looped at its own pace. */
  lasts?: number;
  /** Played once at its own pace and held on its last frame. */
  once?: boolean;
}

/** The round: standing, walking, the musket drawn, aimed and fired, then the cut. */
const ROUND: Step[] = [
  { clip: 'reposo_mixamo', seconds: 2 },
  { clip: 'caminata_mixamo', seconds: 2.5 },
  { clip: 'mosquete_sacar', seconds: DRAW, lasts: DRAW },
  { clip: 'mosquete_apuntar', seconds: 1.2 },
  { clip: 'mosquete_disparo', seconds: SHOT + 0.3, lasts: SHOT },
  { clip: 'reposo_mixamo', seconds: 0.8 },
  { clip: 'tajo', seconds: SWING + 0.4, lasts: SWING },
  { clip: 'reposo_mixamo', seconds: 1 },
  { clip: 'granada_sacar', seconds: DRAW, lasts: DRAW },
  { clip: 'granada_apuntar', seconds: 1.2 },
  { clip: 'granada_lanzar', seconds: SHOT + 0.3, lasts: SHOT },
  { clip: 'reposo_mixamo', seconds: 0.8 },
  { clip: 'barrido', seconds: BLOW + 0.5, lasts: BLOW },
  { clip: 'reposo_mixamo', seconds: 0.8 },
  { clip: 'muerte', seconds: 4, once: true },
];

/** What is played for a clip a model lacks: Cabral dies by the library's fall. */
const INSTEAD: Record<string, string> = { muerte: 'defeat_02' };

/** Each, and how tall he is drawn: the sergeant a head over the rest, as in the 2D game. */
const WHO = [
  { name: 'Cabral', url: 'cabral/3d/cabral_animado.glb', drawn: 82 },
  { name: 'Realista', url: 'realista/3d/realista_animado.glb', drawn: 78 },
  { name: 'Sargento', url: 'tropa/sargento3d/sargento_animado.glb', drawn: 90 },
];
/** How far apart they stand, in world units. */
const APART = 70;

const view = new View(document.getElementById('world')!);
view.apply({ ...view.look, far: 0.6 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), flat('#8a7a50'));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
view.scene.add(floor);
view.follow(new THREE.Vector3(0, 30, 0));

const bodies: { body: THREE.Object3D; motion: Motion }[] = [];
let step = 0, into = 0, only: Step | null = null, paused = false, turn = 0, pace = 1;

const playing = () => only ?? ROUND[step];
function start(s: Step): void {
  into = 0;
  for (const { motion } of bodies) {
    const clip = motion.has(s.clip) ? s.clip : INSTEAD[s.clip] ?? s.clip;
    motion.play(clip, { once: !!s.lasts || s.once, lasts: s.lasts, afresh: true, blend: s.lasts ? 0.05 : 0.15 });
  }
}

/** Which musket is seen, on his back or in his hands, and the sabre put away, as the game does. */
function carried(body: THREE.Object3D, s: Step): void {
  const musket = s.clip.startsWith('mosquete');
  const inHand = s.clip === 'mosquete_apuntar' || (s.clip === 'mosquete_sacar' && into >= DRAW * 0.5)
    || (s.clip === 'mosquete_disparo' && into < SHOT * SLUNG);
  const back = body.getObjectByName('mosquete'), hand = body.getObjectByName('mosquete_mano'), sabre = body.getObjectByName('sable');
  if (back) back.visible = !inHand;
  if (hand) hand.visible = inHand;
  // The sergeant's halberd: standing in his fist, or slid down it to be swung.
  const pole = body.getObjectByName('alabarda'), swung = body.getObjectByName('alabarda_mano');
  if (pole && swung) { pole.visible = s.clip !== 'barrido'; swung.visible = s.clip === 'barrido'; }
  const grenade = s.clip.startsWith('granada'), bomb = body.getObjectByName('granada');
  if (sabre) sabre.visible = !musket && !grenade;
  // In his hand from when he takes it (granada.py: frame 4 of 11) until it leaves it (frame 3 of 19).
  if (bomb) bomb.visible = s.clip === 'granada_apuntar' || (s.clip === 'granada_sacar' && into >= DRAW * 0.36)
    || (s.clip === 'granada_lanzar' && into < SHOT * 0.16);
}

const told = document.getElementById('told')!;
const bar = document.getElementById('bar')!;
const buttons: HTMLButtonElement[] = [];
function button(text: string, act: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = text;
  b.onclick = act;
  bar.append(b);
  return b;
}
function mark(on: HTMLButtonElement): void {
  for (const b of buttons) b.classList.toggle('on', b === on);
}
const round = button('todo', () => { only = null; step = 0; start(ROUND[0]); mark(round); });
buttons.push(round);
for (const clip of [...new Set(ROUND.map(s => s.clip))]) {
  const s = ROUND.find(r => r.clip === clip)!;
  const b = button(clip, () => { only = { ...s, seconds: Math.max(s.seconds, (s.lasts ?? 0) + 0.8) }; start(only); mark(b); });
  buttons.push(b);
}
const pause = button('pausa', () => { paused = !paused; pause.classList.toggle('on', paused); });
button('pixel', () => { view.pixelated = !view.pixelated; });
function slider(text: string, min: number, max: number, value: number, stepBy: number, set: (v: number) => void): void {
  const label = document.createElement('label');
  const input = Object.assign(document.createElement('input'), { type: 'range', min, max, value, step: stepBy });
  input.oninput = () => set(Number(input.value));
  label.append(text, input);
  bar.append(label);
}
slider('giro', -180, 180, 0, 15, v => { turn = THREE.MathUtils.degToRad(v); });
slider('velocidad', 0.1, 1, 1, 0.05, v => { pace = v; });
slider('cerca', 0.25, 1.8, 0.6, 0.05, v => view.apply({ ...view.look, far: v }));
mark(round);

void Promise.all(WHO.map(w => model(w.url, w.drawn))).then(loaded => {
  loaded.forEach((body, i) => {
    body.position.x = (i - (loaded.length - 1) / 2) * APART;
    view.scene.add(body);
    bodies.push({ body, motion: new Motion(body) });
  });
  start(playing());
});

let last = performance.now();
view.renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = paused ? 0 : (Math.min(0.1, (now - last) / 1000)) * pace;
  last = now;
  into += dt;
  const s = playing();
  if (into >= s.seconds) {
    if (!only) step = (step + 1) % ROUND.length;
    start(playing());
  }
  for (const { body, motion } of bodies) {
    motion.update(dt);
    body.rotation.y = turn;
    carried(body, playing());
  }
  told.textContent = `${WHO.map(w => w.name).join(' · ')} — ${playing().clip}${paused ? ' (pausa)' : ''}`;
  view.draw();
});
