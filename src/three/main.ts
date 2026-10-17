import * as THREE from 'three';
import { Keys } from '../input';
import { MachiController } from '../machi/controller';
import { ISO_Y, KITS } from '../machi/data';
import { RUN, Stamina } from '../machi/stamina';
import { pushOut, type Footprint } from '../world/footprint';
import { vadoDeLasVizcachas } from '../world/maps/vado';
import { extent, middle, walk } from '../world/zones';
import { CABRAL_DRESS, figure, model, type Dress } from './figure';
import { mountHud, type Readings } from './hud';
import { ground, heading } from './space';
import { Motion } from './motion';
import { View } from './view';
import { raiseCountry } from './world';

// The first step of the 3D game: Cabral in the vado, with nothing in it made by hand yet. He is a
// figure of a few shapes and so is everyone else; what is being tried is the look: the camera, the
// light and shadows, the pixels. He moves by the same controller as in the 2D game, and is held by
// the same ground and the same footprints.

const map = vadoDeLasVizcachas;
const FEET: Pick<Footprint, 'hw' | 'hh'> = { hw: 7, hh: 3.5 }; // the ground he stands on, as in the 2D game
/** How fast he turns to face the way he goes, per second. */
const TURN = 14;

// Those standing about, each in something of their colours, until they are drawn.
const DRESSES: Record<string, Dress> = {
  braulio: { drawn: 78, coat: '#7a5a3a', legs: '#4a3a2a', hat: { colour: '#3a2e24', tall: 0.08 } },
  anselmo: { drawn: 80, coat: '#5a4636', legs: '#5a4636' },
  tobias: { drawn: 58, coat: '#8a7a5a', legs: '#5a4a36' },
  mateo: { drawn: 62, coat: '#a08a5a', legs: '#5a4a36' },
  remedios: { drawn: 74, coat: '#8a3a3a', legs: '#6a5a4a' },
  ciriaco: { drawn: 78, coat: '#6a6a4a', legs: '#4a4236' },
  paisano: { drawn: 78, coat: '#9a7a4a', legs: '#3a3a3a', hat: { colour: '#2a2420', tall: 0.07 } },
  chacarero: { drawn: 78, coat: '#7a7a5a', legs: '#4a4236', hat: { colour: '#c8b078', tall: 0.06 } },
  benito: { drawn: 78, coat: '#4a3e34', legs: '#4a3e34' },
  alferez: { drawn: 80, coat: '#2c3a6e', legs: '#d9d4c4', trim: '#a3322a', hat: { colour: '#1c1a1e', tall: 0.12 } },
  malherido: { drawn: 80, coat: '#7a2a24', legs: '#d9d4c4', trim: '#e0d8c0' },
};

const view = new View(document.getElementById('world')!);
const country = raiseCountry(map);
view.scene.add(country.group);

for (const { who, plot, faces } of map.people ?? []) {
  const dress = DRESSES[who];
  if (!dress) continue;
  const { x, y } = middle(plot);
  const body = figure(dress);
  body.position.copy(ground(x, y));
  // They look across the screen the way they are said to, a little toward whoever comes.
  body.rotation.y = (faces === 'left' ? -1 : 1) * Math.PI * 0.35;
  view.scene.add(body);
}

const { width, height } = extent(map);
const cabral = new MachiController({ minX: 12, maxX: width - 12, minY: 0, maxY: height }, KITS.cabral);
Object.assign(cabral, middle(map.start));
// His model, once it has loaded; the figure of blocks until then, and on M to compare.
const blocks = figure(CABRAL_DRESS);
let shaped: THREE.Object3D | null = null;
let body: THREE.Object3D = blocks;
view.scene.add(body);
const wear = (next: THREE.Object3D) => { view.scene.remove(body); body = next; view.scene.add(body); };
let motion: Motion | null = null;
void model('cabral/3d/cabral_animado.glb', CABRAL_DRESS.drawn).then(loaded => { shaped = loaded; motion = new Motion(loaded); wear(loaded); });

const keys = new Keys();
const stamina = new Stamina();
let facing = 0;
let fallen = false;
/** The arm he had up last step: let go, it goes off. */
let arming: 'musket' | 'grenade' | null = null;
/** How long his blows and his dive take, for their clips to last as long. */
const SWING = KITS.cabral.melee?.time ?? 0.5, DIVE = KITS.cabral.dash?.time ?? 0.5;
/** How much quicker his trot is played when he runs. */
const RUN_PACE = 1.4;

const readings: Readings = {
  playing: 'cabral', life: 1, mana: 1, rage: 0, ultimate: 0,
  get breath() { return { share: stamina.share, winded: stamina.winded }; },
  draughts: { left: 3, ready: true },
  growth: { share: 0, level: 1, points: 0 },
  pack: { gold: 0 },
  skill: () => ({ ready: true, cooldown: 0 }),
};
const hud = mountHud(document.getElementById('hud')!, readings);

// While trying it out: 1 the pixels or a plain scene, 2 the edge lines, [ and ] the size of a
// pixel, H the HUD, M his model or his figure of blocks, K he falls or gets up.
const told = document.getElementById('told')!;
const tell = () => { told.textContent = `${view.pixelated ? `pixel ${view.pixel}` : 'sin pixel'} · bordes ${view.edges ? 'sí' : 'no'} · 1 pixel · 2 bordes · [ ] tamaño · H HUD · M modelo o muñeco · Q mosquete · E granada · K morir`; };
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Digit1') view.pixelated = !view.pixelated;
  else if (e.code === 'Digit2') view.edges = !view.edges;
  else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    view.pixel = Math.max(1, Math.min(8, view.pixel + (e.code === 'BracketLeft' ? -1 : 1)));
    view.fit();
  } else if (e.code === 'KeyK') {
    if (fallen) cabral.rise(); else cabral.fall();
    fallen = !fallen;
  } else if (e.code === 'KeyM' && shaped) wear(body === shaped ? blocks : shaped);
  else if (e.code === 'KeyH') hud.canvas.style.visibility = hud.canvas.style.visibility === 'hidden' ? '' : 'hidden';
  else return;
  tell();
});
tell();

let last = performance.now();
let wasSwinging = false;
const step = (now: number) => {
  // A long frame (the tab in the background) must not carry him off.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const input = keys.read();
  const running = stamina.update(dt, !cabral.isDashing && keys.running, cabral.isMoving);
  cabral.pace = running ? RUN : 1;
  const from = { x: cabral.x, y: cabral.y };
  // Q held brings the musket up, E held a grenade back, as in the 2D game; let go, they go off.
  const { strike, second } = keys.abilities();
  const arm = strike ? 'musket' : second ? 'grenade' : null;
  if (arm) {
    // Aimed straight ahead of him, until the pointer is wired in.
    cabral.shoulder({ x: cabral.x + Math.sin(facing) * 100, y: cabral.y + Math.cos(facing) * 100 * ISO_Y }, arm);
  } else if (arming) cabral.fire();
  arming = arm;
  cabral.update(dt, input);
  // Held, as in the 2D game, by what stands in the way and by country too thick to cross.
  for (const taken of country.feet) Object.assign(cabral, pushOut({ x: cabral.x, y: cabral.y, ...FEET }, taken));
  Object.assign(cabral, walk(map, from, cabral));

  const moved = { x: cabral.x - from.x, y: cabral.y - from.y };
  if (Math.hypot(moved.x, moved.y) > 0.01) {
    const want = heading(moved.x, moved.y);
    const turn = Math.atan2(Math.sin(want - facing), Math.cos(want - facing));
    facing += turn * Math.min(1, dt * TURN);
  }
  // What he is doing, in the clip that shows it.
  if (motion) {
    if (fallen) motion.play('defeat_02', { once: true });
    else if (cabral.isDashing) motion.play('dive', { once: true, lasts: DIVE });
    else if (cabral.isSwinging) motion.play('slash', { once: true, lasts: SWING, afresh: !wasSwinging });
    else if (cabral.isShouldering) motion.play(cabral.pose().sheet.startsWith('grenade') ? 'pitch_baseball' : 'shoot', { once: true });
    else if (cabral.isMoving) motion.play('run', { pace: running ? RUN_PACE : 1 });
    else motion.play('idle');
    motion.update(dt);
  }
  wasSwinging = cabral.isSwinging;
  body.position.copy(ground(cabral.x, cabral.y));
  body.rotation.y = facing;
  view.follow(body.position);
  view.draw();
  requestAnimationFrame(step);
};
requestAnimationFrame(step);

// Handy from the browser console while developing.
if (import.meta.env.DEV) Object.assign(globalThis, { view, cabral, THREE });
