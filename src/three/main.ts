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
import { CABRAL_DRESS, figure, model, type Dress } from './figure';
import { mountHud, type Readings } from './hud';
import { ground, heading, UPRIGHT } from './space';
import { Motion } from './motion';
import mixamoTravel from './rolls/rodada_mixamo.json';
import { Trail } from './trail';
import { mountPanel } from './panel';
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
/** Seconds to draw the musket from his back to the shoulder: longer than the 2D game's 0.25, chosen by the user. */
const DRAW = 0.45;
/** Seconds from the shot until the musket is slung again: a big kick and a slow return, chosen by the user. */
const SHOT = 0.8;
// The musket passes between his back and his hands where both hands hold it round in front of him
// (mosquete.py's ROUND): any later, the left hand had already let go of it.
/** The share of the draw at which the musket is in his hands (frame 4 of 6). */
const DRAWN = 0.67;
/** The share of the shot's clip at which the musket goes back to his back (frame 12 of 19). */
const SLUNG = 0.63;
// His kit, but with a speed and a dash of his own here: they are the look's (the panel's
// "Movimiento" and "Rodada"), read every frame.
const kit = { ...KITS.cabral, speed: 126, dash: { time: 0.8, distance: 170 }, shoulder: DRAW, shot: SHOT };
const cabral = new MachiController({ minX: 12, maxX: width - 12, minY: 0, maxY: height }, kit);
Object.assign(cabral, middle(map.start));
// His model, once it has loaded; the figure of blocks until then, and on M to compare.
const blocks = figure(CABRAL_DRESS);
let shaped: THREE.Object3D | null = null;
let body: THREE.Object3D = blocks;
view.scene.add(body);
const wear = (next: THREE.Object3D) => { view.scene.remove(body); body = next; view.scene.add(body); };
let motion: Motion | null = null;
let trail: Trail | null = null;
/** How far his trot carries him in a second at its own speed, in world units. */
/**
 * How he goes: Mixamo's Walking, the user's pick (it replaced CMU's 07_01, still in the model);
 * the library's run if it is missing.
 */
const GAIT = 'caminata_mixamo';
/**
 * His rolls, to be chosen between on C: Mixamo's "Stand To Roll", the user's pick; four from CMU's
 * motion capture (subjects 127 and 128, "run, dive over, roll, run"); his own keyed in Blender;
 * and the library's dive.
 */
const ROLLS = ['rodada_mixamo', 'rodada_127_23', 'rodada_127_24', 'rodada_128_10', 'rodada_128_11', 'rodada', 'dive'];
let roll = 0;
/** For each roll put on from motion capture, how far its actor had come at each of its frames. */
const TRAVEL: Record<string, number[]> = { rodada_mixamo: mixamoTravel };
/** How long into the dash he is. */
let dashing = 0;
/**
 * A roll's moments, as shares of its clip and of the dash's time: he leaves the ground at the
 * first, lands at the second. Between them is the flight, given less of the dash than the capture
 * gave it, so he flies quicker; the takeoff and the roll and getting up keep their pace. The clip
 * is shown by this, and he is moved by it (as far as the actor had come at that moment), so
 * neither runs ahead of the other and he never slides.
 */
const ROLL_PHASES = { clip: [0.24, 0.53], time: [0.09, 0.33] };
function rollAt(t: number): number {
  const [ca, cb] = ROLL_PHASES.clip, [ta, tb] = ROLL_PHASES.time;
  t = Math.max(0, Math.min(1, t));
  if (t < ta) return (t / ta) * ca;
  if (t < tb) return ca + ((t - ta) / (tb - ta)) * (cb - ca);
  return cb + ((t - tb) / (1 - tb)) * (1 - cb);
}
/** How far along its way the actor had come at a share of the clip. */
function travelled(travel: number[], share: number): number {
  const at = Math.max(0, Math.min(1, share)) * (travel.length - 1), k = Math.floor(at);
  return k >= travel.length - 1 ? travel[travel.length - 1] : travel[k] + (travel[k + 1] - travel[k]) * (at - k);
}
/** Where the dash set out from, and the way it goes on the 2D ground (screen units, per unit of its distance). */
let dashFrom = { x: 0, y: 0 }, dashWay = { x: 0, y: 0 };
/** How long into the dash he is this frame (before `dashing` is moved on at its end). */
let intoDash = () => 0;
let gait = { name: 'run', reach: 0 };
void model('cabral/3d/cabral_animado.glb', CABRAL_DRESS.drawn).then(loaded => {
  shaped = loaded;
  motion = new Motion(loaded);
  // The arc his sabre leaves as he cuts, from just past the guard to the point.
  const blade = loaded.getObjectByName('sable');
  if (blade) {
    trail = new Trail(blade, 0.06, 0.34);
    view.scene.add(trail.mesh);
  }
  // Measured in his own units, which are grown to his height.
  const name = motion.has(GAIT) ? GAIT : 'run';
  gait = { name, reach: motion.reach(name, 'L_Foot') * loaded.scale.x };
  wear(loaded);
});

const keys = new Keys();
const stamina = new Stamina();
let facing = 0;
let fallen = false;
/** The arm he had up last step: let go, it goes off. */
let arming: 'musket' | 'grenade' | null = null;
/** How long his blows and his dive take, for their clips to last as long. */
const SWING = KITS.cabral.melee?.time ?? 0.5;
/** How quickly what he is taken to be going at follows how fast he really goes, per second. */
const SETTLE = 10;
/** The slowest his trot is played, as a share of its own speed: turning on the spot, he still steps. */
const LEAST_PACE = 0.35;
let going = 0;

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
const tell = () => { told.textContent = `${view.pixelated ? 'pixel' : 'sin pixel'} · 1 pixel · P panel del look · H HUD · M modelo o muñeco · Q mosquete · E granada · K morir · C rodada: ${ROLLS[roll]}`; };
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Digit1') view.pixelated = !view.pixelated;
  else if (e.code === 'KeyC') roll = (roll + 1) % ROLLS.length;
  else if (e.code === 'KeyK') {
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
let wasDashing = false;
/** How long the musket has been coming up or held, and how long since it was fired (null: not yet). */
let shouldered = 0, fired: number | null = null;
/** What he last let go: the musket or a grenade. */
let loosed: 'musket' | 'grenade' | null = null;
/** Whether what is up has been let fly (once a readying); whether the attack was held last step; the mouse's button. */
let let_go = false, pullWas = false, mouseHeld = false;
addEventListener('pointerdown', e => { if (e.button === 0 && !(e.target as HTMLElement).closest?.('.lil-gui')) mouseHeld = true; });
addEventListener('pointerup', e => { if (e.button === 0) mouseHeld = false; });
/** How long the musket is, butt to muzzle, in its own units (tools/blender/props.py). */
const MUSKET_LENGTH = 0.62;
/** The spot of the 2D ground he is aiming at, while he aims at the pointer. */
let aimed: { x: number; y: number } | null = null;
/** Where the pointer is on the screen, once it has moved. */
let pointer: { x: number; y: number } | null = null;
addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; });
const caster = new THREE.Raycaster(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
/** Where the held musket's barrel is: its butt end, the way it points along the ground, and its muzzle. */
function barrel(gun: THREE.Object3D): { from: THREE.Vector3; way: THREE.Vector3; tip: THREE.Vector3 } {
  gun.updateWorldMatrix(true, false);
  const from = new THREE.Vector3().setFromMatrixPosition(gun.matrixWorld);
  const along = new THREE.Vector3(1, 0, 0).transformDirection(gun.matrixWorld);
  const tip = new THREE.Vector3(MUSKET_LENGTH, 0.02, 0).applyMatrix4(gun.matrixWorld);
  return { from, way: new THREE.Vector3(along.x, 0, along.z).normalize(), tip };
}
/** The spot of the 2D game's ground under the pointer, if it has moved. */
function underPointer(): { x: number; y: number } | null {
  if (!pointer) return null;
  caster.setFromCamera(new THREE.Vector2((pointer.x / innerWidth) * 2 - 1, -(pointer.y / innerHeight) * 2 + 1), view.camera);
  if (!caster.ray.intersectPlane(floor, hit)) return null;
  return { x: hit.x, y: hit.z * ISO_Y };
}
/** How long into the cut he is. */
let swung = 0;
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
  // Q held brings the musket up, E held a grenade back, as in the 2D game; let go, they go off.
  const { strike, second } = keys.abilities();
  const arm = strike ? 'musket' : second ? 'grenade' : null;
  // As in the 2D game: Q held readies the musket (E a grenade) and turns him to the pointer; the
  // attack, a click or Space, then lets it fly; letting the key go first puts it away unfired.
  // While it is up the attack is its trigger, not a cut.
  const pulling = input.attack || mouseHeld, trigger = pulling && !pullWas;
  pullWas = pulling;
  if (arm) {
    input.attack = false;
    // Aimed at the spot of ground under the pointer; straight ahead of him if it has not moved yet.
    aimed = underPointer();
    cabral.shoulder(aimed ?? { x: cabral.x + Math.sin(facing) * 100, y: cabral.y + Math.cos(facing) * 100 * ISO_Y }, arm);
    if (arm !== arming) { shouldered = 0; fired = null; let_go = false; }
    if (trigger && !let_go) {
      cabral.fire();
      loosed = arm;
      let_go = true;
      if (arm === 'musket') fired = 0;
    }
  } else if (arming && !let_go) cabral.lower();
  arming = arm;
  cabral.update(dt, input);
  // The last spot aimed at holds while the shot goes off and the musket is slung, then lets go.
  if (!cabral.isShouldering) aimed = null;
  intoDash = () => (cabral.isDashing ? (wasDashing ? dashing + dt : dt) : 0);
  // A roll from motion capture moves him as its actor moved, not by the controller's own curve.
  if (cabral.isDashing && TRAVEL[ROLLS[roll]]) {
    if (!wasDashing) {
      dashFrom = from;
      const dx = cabral.x - from.x, dy = (cabral.y - from.y) / ISO_Y, len = Math.hypot(dx, dy) || 1;
      dashWay = { x: dx / len, y: (dy / len) * ISO_Y };
    }
    const share = travelled(TRAVEL[ROLLS[roll]], rollAt(intoDash() / kit.dash.time)) * kit.dash.distance;
    cabral.x = dashFrom.x + dashWay.x * share;
    cabral.y = dashFrom.y + dashWay.y * share;
  }
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
    const gun = shaped?.getObjectByName('mosquete_mano');
    if (gun) {
      shaped!.updateMatrixWorld(true);
      const { tip, way } = barrel(gun);
      shots.fire(tip, way);
      view.jolt(0.1, 2);
    }
  }
  shots.update(dt);
  dummy.update(dt);
  impacts.update(dt);
  // Held, as in the 2D game, by what stands in the way and by country too thick to cross.
  for (const taken of country.feet) Object.assign(cabral, pushOut({ x: cabral.x, y: cabral.y, ...FEET }, taken));
  Object.assign(cabral, walk(map, from, cabral));

  const moved = { x: cabral.x - from.x, y: cabral.y - from.y };
  // Cutting or aiming he faces where the controller turned him; walking, the way he goes.
  const fighting = cabral.isSwinging || cabral.isShouldering;
  // How fast he goes over the 3D ground, smoothed: a step held against a plant is still a step.
  const over = ground(moved.x, moved.y).length() / Math.max(dt, 1e-3);
  going += (over - going) * Math.min(1, dt * SETTLE);
  if (fighting || Math.hypot(moved.x, moved.y) > 0.01) {
    // Aiming at the pointer he turns to it at any angle, not only the eight ways.
    const want = aimed && cabral.isShouldering ? heading(aimed.x - cabral.x, aimed.y - cabral.y)
      : fighting ? Math.atan2(cabral.faces.x, cabral.faces.y) : heading(moved.x, moved.y);
    const turn = Math.atan2(Math.sin(want - facing), Math.cos(want - facing));
    facing += turn * Math.min(1, dt * TURN);
  }
  // What he is doing, in the clip that shows it.
  if (motion) {
    if (fallen) motion.play('defeat_02', { once: true });
    // His own roll, keyed in Blender; the library's dive if it is missing.
    else if (cabral.isDashing) {
      // A roll from motion capture is shown by its phases (see ROLL_PHASES), which also move him;
      // any other is played by the clock.
      const name = ROLLS[roll], travel = TRAVEL[name];
      if (travel) {
        motion.hold(name, rollAt(intoDash() / kit.dash.time), { afresh: !wasDashing && cabral.isDashing, blend: 0.05 });
      } else motion.play(name, { once: true, lasts: kit.dash.time, afresh: !wasDashing, blend: 0.05 });
    }
    // His own cut, keyed in Blender to land when the game's blow does; the library's if it is missing.
    else if (cabral.isSwinging) motion.play(motion.has('tajo') ? 'tajo' : 'slash', { once: true, lasts: SWING, afresh: !wasSwinging, blend: 0.05 });
    else if (cabral.isShouldering && cabral.pose().sheet.startsWith('grenade')) motion.play('pitch_baseball', { once: true });
    else if (cabral.isShouldering && motion.has('mosquete_apuntar')) {
      // The musket: drawn from his back while it comes up, held aiming, then the shot and slinging it again.
      if (fired !== null) motion.play('mosquete_disparo', { once: true, lasts: SHOT, afresh: fired === 0, blend: 0.03 });
      else if (shouldered < DRAW) motion.play('mosquete_sacar', { once: true, lasts: DRAW, afresh: shouldered === 0, blend: 0.06 });
      else motion.play('mosquete_apuntar', { blend: 0.05 });
    } else if (cabral.isShouldering) motion.play('shoot', { once: true });
    // His trot keeps step with the ground: played as fast as he goes, however fast that is.
    else if (cabral.isMoving) motion.play(gait.name, { pace: gait.reach ? Math.max(LEAST_PACE, going / gait.reach) : 1 });
    // Standing: Mixamo's Breathing Idle, the user's pick; his own keyed in Blender, or the library's, if missing.
    else motion.play(['reposo_mixamo', 'reposo', 'idle'].find(name => motion!.has(name))!);
    motion.update(dt);
  }
  swung = cabral.isSwinging ? (wasSwinging ? swung + dt : 0) : 0;
  wasSwinging = cabral.isSwinging;
  dashing = cabral.isDashing ? (wasDashing ? dashing + dt : dt) : 0;
  if (cabral.isShouldering) {
    if (fired === null) shouldered += dt;
    else fired += dt;
  } else fired = null;
  // Which musket is seen, the one on his back or the one in his hands, and the sabre put away
  // while he has the musket up: the hands take it halfway through drawing it, and give it back
  // halfway through slinging it.
  if (shaped) {
    const musket = cabral.isShouldering && !cabral.pose().sheet.startsWith('grenade');
    const inHand = musket && (fired === null ? shouldered >= DRAW * DRAWN : fired < SHOT * SLUNG);
    const back = shaped.getObjectByName('mosquete'), hand = shaped.getObjectByName('mosquete_mano'), sabre = shaped.getObjectByName('sable');
    if (back) back.visible = !inHand;
    if (hand) hand.visible = inHand;
    if (sabre) sabre.visible = !musket;
  }
  wasDashing = cabral.isDashing;
  body.position.copy(ground(cabral.x, cabral.y));
  body.rotation.y = facing;
  // Aiming at the pointer, he is turned so the line of the barrel, not the middle of him, runs
  // through the spot: the musket lies against his right shoulder, beside his middle, and turned
  // only by his middle it ran alongside the pointer and missed it.
  const gun = shaped?.getObjectByName('mosquete_mano');
  const muzzle = gun?.visible && aimed ? barrel(gun) : null;
  if (muzzle && aimed) {
    const spot = ground(aimed.x, aimed.y);
    const want = Math.atan2(spot.x - muzzle.from.x, spot.z - muzzle.from.z), has = Math.atan2(muzzle.way.x, muzzle.way.z);
    facing += Math.atan2(Math.sin(want - has), Math.cos(want - has));
    body.rotation.y = facing;
  }
  // The line of the shot and the ring of its blast, as the 2D game draws them while the musket is
  // up: from the muzzle once it is in his hands, from his shoulder while he draws it.
  const aiming = aimed && cabral.isShouldering && fired === null && !cabral.pose().sheet.startsWith('grenade');
  marks.show(aiming ? (muzzle ? barrel(gun!).tip : ground(cabral.x, cabral.y, MUSKET.height * UPRIGHT)) : null, aiming ? aimed : null);
  view.follow(body.position, dt);
  // The cut's arc, from where his blade is now: only while it sweeps (frames 3 to 9 of 12), not as
  // he winds up or comes back to guard.
  body.updateMatrixWorld(true);
  trail?.update(view.look.trail && swung > SWING * 3 / 12 && swung < SWING * 9 / 12);
  view.draw();
}

// Handy from the browser console while developing.
if (import.meta.env.DEV) Object.assign(globalThis, { view, cabral, THREE, dummy, trail: () => trail });
