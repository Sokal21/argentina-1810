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
import { CabralFigure, DRAW, MUSKET_TIMES, ROLLS, SHOT, THROWN } from './cabral';
import { GrenadeMarks, Grenades, within } from './grenade';
import { GRENADE } from '../machi/grenade';
import { CABRAL_DRESS } from './figure';
import { sunCursor } from './cursor';
import { People } from './people';
import { mountHud, type Readings } from './hud';
import { ground, onTheGround, UPRIGHT } from './space';
import { mountPanel } from './panel';
import { View } from './view';
import { raiseCountry } from './world';

// The first step of the 3D game: Cabral in the vado, with nothing in it made by hand yet. He is a
// figure of a few shapes and so is everyone else; what is being tried is the look: the camera, the
// light and shadows, the pixels. He moves by the same controller as in the 2D game, and is held by
// the same ground and the same footprints.

const map = vadoDeLasVizcachas;
const FEET: Pick<Footprint, 'hw' | 'hh'> = { hw: 7, hh: 3.5 }; // the ground he stands on, as in the 2D game

const view = new View(document.getElementById('world')!);
// The pointer is a Sol de Mayo, as in the game.
document.body.style.cursor = sunCursor();
mountPanel(view);
const country = raiseCountry(map);
view.scene.add(country.group);
for (const ask of country.houses.flatMap(house => house.asks)) view.over.add(ask);

const people = new People(map);
view.scene.add(people.group);

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
// His grenade: where it goes off it jolts the camera, and the dummy is struck if it is within the blast.
const throwing = new GrenadeMarks();
const grenades = new Grenades(view.camera, at => {
  view.jolt(0.14, 3);
  const x = dummy.x - at.x, y = (dummy.y - at.y) / ISO_Y;
  if (Math.hypot(x, y) > GRENADE.radius + GIRTH) return;
  dummy.hit(x || 1, y * ISO_Y);
  impacts.spawn(dummy.struckAt(x || 1, y * ISO_Y), ground(at.x, at.y, 10));
});
view.scene.add(throwing.group, grenades.group);
country.feet.push(dummy.footprint);

const { width, height } = extent(map);
// His kit, but with a speed and a dash of his own here: they are the look's (the panel's
// "Movimiento" and "Rodada"), read every frame.
const kit = { ...KITS.cabral, speed: 126, dash: { time: 0.8, distance: 170 }, shoulder: DRAW, shot: SHOT, musketTimes: MUSKET_TIMES };
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
const caster = new THREE.Raycaster();
/** The spot of the 2D game's ground under the pointer, if it has moved. */
function underPointer(): { x: number; y: number } | null {
  if (!pointer) return null;
  caster.setFromCamera(view.pointAt(pointer.x, pointer.y), view.camera);
  return onTheGround(caster.ray);
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
  const shot = cabral.takeShot();
  if (shot && loosed === 'musket') {
    const barrel = figured.barrel();
    if (barrel) {
      shots.fire(barrel.tip, barrel.way);
      view.jolt(0.1, 2);
    }
  }
  // The grenade is thrown at the spot aimed at, pulled in to his reach; it leaves his hand as the throw does.
  else if (shot && loosed === 'grenade' && aimed) {
    grenades.lob(cabral, within(cabral, aimed, GRENADE.range), SHOT * THROWN, () => figured.grenade());
  }
  shots.update(dt);
  grenades.update(dt);
  dummy.update(dt);
  impacts.update(dt);
  // Held, as in the 2D game, by what stands in the way and by country too thick to cross.
  for (const taken of country.feet) Object.assign(cabral, pushOut({ x: cabral.x, y: cabral.y, ...FEET }, taken));
  Object.assign(cabral, walk(map, from, cabral));
  // Into a house only by its door; and seen from within once inside.
  people.update(dt);
  for (const house of country.houses) {
    Object.assign(cabral, house.hold(from, cabral));
    house.update(dt, cabral);
  }
  figured.update(dt, cabral, { from, aimed, fallen, dashTime: kit.dash.time, trail: view.look.trail });
  // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is up.
  const aiming = aimed && cabral.arming?.kind === 'musket' && cabral.arming.phase !== 'fire';
  marks.show(aiming ? figured.aimFrom(cabral) : null, aiming ? aimed : null);
  // How far he can throw and the patch it would land on, while a grenade is drawn back.
  const drawing = aimed && cabral.arming?.kind === 'grenade' && cabral.arming.phase !== 'fire';
  throwing.show(drawing ? cabral : null, drawing ? aimed : null);
  view.follow(figured.position, dt);
  view.draw();
}

// Handy from the browser console while developing.
if (import.meta.env.DEV) Object.assign(globalThis, { view, cabral, THREE, dummy, figured });
