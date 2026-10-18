import * as THREE from 'three';
import { Keys } from '../input';
import { lands, MachiController } from '../machi/controller';
import { ISO_Y, KITS } from '../machi/data';
import { RUN, Stamina } from '../machi/stamina';
import { pushOut, type Footprint } from '../world/footprint';
import { vadoDeLasVizcachas } from '../world/maps/vado';
import { extent, middle, PLOT_H, PLOT_W, walk } from '../world/zones';
import { Dummy, GIRTH } from './dummy';
import { Impacts } from './impact';
import { AimMarks } from './aim';
import { Shots } from './shot';
import { MUSKET } from '../machi/musket';
import { CabralFigure, DRAW, ROLLS, SHOT } from './cabral';
import { CABRAL_DRESS, figure, type Dress } from './figure';
import { mountHud, type Readings } from './hud';
import { ground, UPRIGHT } from './space';
import { mountPanel } from './panel';
import { View } from './view';
import { raiseCountry } from './world';

// The first step of the 3D game: Cabral in the vado, with nothing in it made by hand yet. He is a
// figure of a few shapes and so is everyone else; what is being tried is the look: the camera, the
// light and shadows, the pixels. He moves by the same controller as in the 2D game, and is held by
// the same ground and the same footprints.

const map = vadoDeLasVizcachas;
const FEET: Pick<Footprint, 'hw' | 'hh'> = { hw: 7, hh: 3.5 }; // the ground he stands on, as in the 2D game

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
mountPanel(view);
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

// A practice dummy a few steps from where he arrives, to try his blows on.
const dummy = new Dummy(middle(map.start).x + PLOT_W * 1.6, middle(map.start).y - PLOT_H * 0.3);
view.scene.add(dummy.group, dummy.debris);
const impacts = new Impacts(view.camera, () => view.look);
const marks = new AimMarks();
view.scene.add(marks.group);
// The musket's shot: its ball strikes the dummy as the 2D game's strikes a foe (within the ball's
// girth and the dummy's of its line), and the blast hurts whatever is within its radius.
const shots = new Shots(view.camera, (from, to) => {
  const t = (p: { x: number; y: number }) => ({ x: p.x, y: p.y / ISO_Y });
  const a = t(from), b = t(to), d = t(dummy.spot);
  const ab = { x: b.x - a.x, y: b.y - a.y }, len = ab.x * ab.x + ab.y * ab.y || 1;
  const k = Math.max(0, Math.min(1, ((d.x - a.x) * ab.x + (d.y - a.y) * ab.y) / len));
  const near = { x: a.x + ab.x * k, y: a.y + ab.y * k };
  return Math.hypot(d.x - near.x, d.y - near.y) <= GIRTH + MUSKET.girth ? { x: near.x, y: near.y * ISO_Y } : null;
}, at => {
  view.jolt(0.11, 2);
  const x = dummy.x - at.x, y = (dummy.y - at.y) / ISO_Y;
  if (Math.hypot(x, y) > MUSKET.radius + GIRTH) return;
  dummy.hit(x || 1, y * ISO_Y);
  impacts.spawn(dummy.struckAt(x || 1, y * ISO_Y), ground(cabral.x, cabral.y, CABRAL_DRESS.drawn * 0.6 * UPRIGHT));
});
view.scene.add(shots.group);
view.scene.add(impacts.group);
country.feet.push(dummy.footprint);

const { width, height } = extent(map);
// His kit, but with a speed and a dash of his own here: they are the look's (the panel's
// "Movimiento" and "Rodada"), read every frame.
const kit = { ...KITS.cabral, speed: 126, dash: { time: 0.8, distance: 170 }, shoulder: DRAW, shot: SHOT };
const cabral = new MachiController({ minX: 12, maxX: width - 12, minY: 0, maxY: height }, kit);
Object.assign(cabral, middle(map.start));
// His model, shown doing whatever his controller says (cabral.ts); the figure of blocks on M.
const figured = new CabralFigure();
view.scene.add(figured.group);

const keys = new Keys();
const stamina = new Stamina();
let fallen = false;
/** The arm he had up last step: let go, it goes off. */
let arming: 'musket' | 'grenade' | null = null;

const readings: Readings = {
  playing: 'cabral', life: 1, mana: 1, rage: 0, ultimate: 0,
  get breath() { return { share: stamina.share, winded: stamina.winded }; },
  draughts: { left: 3, ready: true },
  growth: { share: 0, level: 1, points: 0 },
  pack: { gold: 0 },
  skill: () => ({ ready: true, cooldown: 0 }),
};
const hud = mountHud(document.getElementById('hud')!, readings);

// While trying it out: 1 the pixels or a plain scene, P the look's panel, H the HUD, M his model or
// his figure of blocks, K he falls or gets up, C his next roll.
const told = document.getElementById('told')!;
const tell = () => { told.textContent = `${view.pixelated ? 'pixel' : 'sin pixel'} · 1 pixel · P panel del look · H HUD · M modelo o muñeco · Q mosquete · E granada · K morir · C rodada: ${ROLLS[figured.roll]}`; };
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Digit1') view.pixelated = !view.pixelated;
  else if (e.code === 'KeyC') figured.roll = (figured.roll + 1) % ROLLS.length;
  else if (e.code === 'KeyK') {
    if (fallen) cabral.rise(); else cabral.fall();
    fallen = !fallen;
  } else if (e.code === 'KeyM') figured.toggleBlocks();
  else if (e.code === 'KeyH') hud.canvas.style.visibility = hud.canvas.style.visibility === 'hidden' ? '' : 'hidden';
  else return;
  tell();
});
tell();

let last = performance.now();
/** Whether what is up has been let fly (once a readying); whether the attack was held last step; the mouse's button. */
let let_go = false, pullWas = false, mouseHeld = false;
addEventListener('pointerdown', e => { if (e.button === 0 && !(e.target as HTMLElement).closest?.('.lil-gui')) mouseHeld = true; });
addEventListener('pointerup', e => { if (e.button === 0) mouseHeld = false; });
/** The spot of the 2D ground he is aiming at, while he aims at the pointer. */
let aimed: { x: number; y: number } | null = null;
/** Where the pointer is on the screen, once it has moved. */
let pointer: { x: number; y: number } | null = null;
addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; });
const caster = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
/** The spot of the 2D game's ground under the pointer, if it has moved. */
function underPointer(): { x: number; y: number } | null {
  if (!pointer) return null;
  caster.setFromCamera(new THREE.Vector2((pointer.x / innerWidth) * 2 - 1, -(pointer.y / innerHeight) * 2 + 1), view.camera);
  if (!caster.ray.intersectPlane(floor, hit)) return null;
  return { x: hit.x, y: hit.z * ISO_Y };
}
/** What he last let go: the musket or a grenade. */
let loosed: 'musket' | 'grenade' | null = null;
const step = (now: number) => {
  // A long frame (the tab in the background) must not carry him off.
  // `slow` (from the console while developing) plays the game slower: 0 stops it, and `tick`
  // then moves it on by exactly so long, to look at a blow frame by frame.
  const dt = Math.min(0.05, (now - last) / 1000) * ((globalThis as { slow?: number }).slow ?? 1);
  last = now;
  advance(dt);
  requestAnimationFrame(step);
};
requestAnimationFrame(step);
if (import.meta.env.DEV) Object.assign(globalThis, { tick: (seconds: number) => advance(seconds) });

function advance(dt: number): void {
  kit.speed = view.look.speed;
  kit.dash.time = view.look.rollTime;
  kit.dash.distance = view.look.rollDistance;
  const input = keys.read();
  // The arrows cut the way they point, wherever he is walking, as in the 2D game.
  const arrows = keys.attacking;
  if (arrows) {
    const len = Math.hypot(arrows.dx, arrows.dy);
    input.attack = true;
    input.aim = { x: arrows.dx / len, y: arrows.dy / len };
  }
  const running = stamina.update(dt, !cabral.isDashing && keys.running, cabral.isMoving);
  cabral.pace = running ? RUN : 1;
  const from = { x: cabral.x, y: cabral.y };
  // As in the 2D game: Q held readies the musket (E a grenade) and turns him to the pointer; the
  // attack, a click or Space, then lets it fly; letting the key go first puts it away unfired.
  // While it is up the attack is its trigger, not a cut.
  const { strike, second } = keys.abilities();
  const arm = strike ? 'musket' : second ? 'grenade' : null;
  const pulling = input.attack || mouseHeld, trigger = pulling && !pullWas;
  pullWas = pulling;
  if (arm) {
    input.attack = false;
    // Aimed at the spot of ground under the pointer; straight ahead of him if it has not moved yet.
    aimed = underPointer() ?? { x: cabral.x + cabral.faces.x * 100, y: cabral.y + cabral.faces.y * 100 * ISO_Y };
    cabral.shoulder(aimed, arm);
    if (arm !== arming) let_go = false;
    if (trigger && !let_go) {
      cabral.fire();
      loosed = arm;
      let_go = true;
    }
  } else if (arming && !let_go) cabral.lower();
  arming = arm;
  cabral.update(dt, input);
  figured.carry(cabral, from, kit.dash, dt);
  // The last spot aimed at holds while the shot goes off and the musket is slung, then lets go.
  if (!cabral.isShouldering) aimed = null;
  // A blow that lands on the dummy, as the 2D game lands one on a foe; and it is felt.
  const blow = cabral.takeStrike();
  if (blow && lands(blow, dummy.spot, GIRTH)) {
    const x = dummy.x - blow.x, y = (dummy.y - blow.y) / ISO_Y;
    dummy.hit(x || blow.dx, y * ISO_Y);
    // Facing him: toward his chest.
    impacts.spawn(dummy.struckAt(x || blow.dx, y * ISO_Y), ground(cabral.x, cabral.y, CABRAL_DRESS.drawn * 0.6 * UPRIGHT));
    view.jolt(0.07, 1);
  }
  // The musket goes off: from its muzzle, along its barrel.
  if (cabral.takeShot() && loosed === 'musket') {
    const barrel = figured.barrel();
    if (barrel) {
      shots.fire(barrel.tip, barrel.way);
      view.jolt(0.1, 2);
    }
  }
  shots.update(dt);
  dummy.update(dt);
  impacts.update(dt);
  // Held, as in the 2D game, by what stands in the way and by country too thick to cross.
  for (const taken of country.feet) Object.assign(cabral, pushOut({ x: cabral.x, y: cabral.y, ...FEET }, taken));
  Object.assign(cabral, walk(map, from, cabral));
  figured.update(dt, cabral, { from, aimed, fallen, dashTime: kit.dash.time, trail: view.look.trail });
  // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is up.
  const aiming = aimed && cabral.arming?.kind === 'musket' && cabral.arming.phase !== 'fire';
  marks.show(aiming ? figured.aimFrom(cabral) : null, aiming ? aimed : null);
  view.follow(figured.position, dt);
  view.draw();
}

// Handy from the browser console while developing.
if (import.meta.env.DEV) Object.assign(globalThis, { view, cabral, THREE, dummy, figured });
