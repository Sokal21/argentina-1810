import * as THREE from 'three';
import { vadoDeLasVizcachas } from '../world/maps/vado';
import { extent, faults, letterAt, middle, PLOT_H, PLOT_W, zoneAt, type WorldMap } from '../world/zones';
import { raisePeople } from '../three/people';
import { ground, onTheGround } from '../three/space';
import { View } from '../three/view';
import { raiseCountry } from '../three/world';

// A page for looking at maps while they are being made, drawn as the 3D game draws them: the
// relief, the water, the plants, the buildings and those standing about, in the game's light and
// pixels. Nothing of the game runs here. Only the vado is in 3D so far.

/** The camera's distance, as the look has it (world units to each pixel): as in the game, and the nearest and furthest. */
const GAME_FAR = 1.8, NEAR = 0.5, FAR = 40;
const PAN = 900;                   // screen pixels a second, on the keys
const LINE = '#f0e3c4';
/** How far above the ground lines are drawn, so they lie over it. */
const LIFT = 1.5;

const map: WorldMap = vadoDeLasVizcachas;
const wrong = faults(map);
const info = document.getElementById('info')!;
const labels = document.getElementById('labels')!;
const { width, height } = extent(map);

const view = new View(document.getElementById('world')!);
const country = raiseCountry(map);
const people = raisePeople(map);
view.scene.add(country.group, people);
/** Plants, fences and buildings, shown and hidden together with T. */
const standing = country.group.children.filter(o => o instanceof THREE.InstancedMesh || (o instanceof THREE.Mesh && !(o.geometry instanceof THREE.PlaneGeometry)));

/** A line along the ground from one spot of the 2D map to another, following its rise and fall. */
function along(points: THREE.Vector3[], from: { x: number; y: number }, to: { x: number; y: number }): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, (to.y - from.y) * 2) / 32));
  for (let i = 0; i < steps; i++) {
    const a = i / steps, b = (i + 1) / steps;
    points.push(ground(from.x + (to.x - from.x) * a, from.y + (to.y - from.y) * a, LIFT),
      ground(from.x + (to.x - from.x) * b, from.y + (to.y - from.y) * b, LIFT));
  }
}
function lines(points: THREE.Vector3[], opacity: number): THREE.LineSegments {
  const drawn = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity, depthTest: false }));
  drawn.renderOrder = 10;
  drawn.frustumCulled = false;
  return drawn;
}
const cols = map.plots[0].length, rows = map.plots.length;
// Every plot's edge (G), and where one zone gives way to another or to country nobody crosses.
const gridPoints: THREE.Vector3[] = [], borderPoints: THREE.Vector3[] = [];
for (let c = 0; c <= cols; c++) along(gridPoints, { x: c * PLOT_W, y: 0 }, { x: c * PLOT_W, y: rows * PLOT_H });
for (let r = 0; r <= rows; r++) along(gridPoints, { x: 0, y: r * PLOT_H }, { x: cols * PLOT_W, y: r * PLOT_H });
for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
  const here = letterAt(map, c, r);
  if (here !== letterAt(map, c - 1, r)) along(borderPoints, { x: c * PLOT_W, y: r * PLOT_H }, { x: c * PLOT_W, y: (r + 1) * PLOT_H });
  if (here !== letterAt(map, c, r - 1)) along(borderPoints, { x: c * PLOT_W, y: r * PLOT_H }, { x: (c + 1) * PLOT_W, y: r * PLOT_H });
}
const grid = lines(gridPoints, 0.12), borders = lines(borderPoints, 0.45);
grid.visible = false;
view.scene.add(grid, borders);
// How much of the map the game shows at once, round the pointer (V).
const frame = lines([], 0.6);
view.scene.add(frame);

/** A name pinned to a spot on the map. */
interface Label { el: HTMLElement; x: number; y: number }
const pinned: Label[] = [];
function name(text: string, kind: string, x: number, y: number): void {
  const el = document.createElement('span');
  el.textContent = text;
  el.className = kind;
  labels.appendChild(el);
  pinned.push({ el, x, y });
}
for (const [letter, zone] of Object.entries(map.zones)) {
  let x = 0, y = 0, n = 0;
  map.plots.forEach((line, row) => [...line].forEach((l, col) => {
    if (l !== letter) return;
    const at = middle([col, row]);
    x += at.x; y += at.y; n++;
  }));
  if (n) name(zone.name, zone.safe ? 'zone safe' : 'zone', x / n, y / n - (zone.safe ? PLOT_H : 0));
}
const home = middle(map.start);
name('Llegada', 'mark', home.x, home.y + 14);
for (const { name: what, plot } of map.objectives) {
  const at = middle(plot);
  name(what, 'mark', at.x, at.y + 14);
}

/** The spot of the 2D map in the middle of the screen, and how far off the camera stands. */
let centre = { x: width / 2, y: height / 2 }, far = GAME_FAR;
let showFrame = true;
/** Screen pixels to each unit of the map. */
const scale = () => view.pixel / far;
function setFar(next: number): void {
  far = Math.max(NEAR, Math.min(FAR, next));
  view.apply({ ...view.look, far });
}
/** Stands back until the whole map is in view. */
function fit(): void {
  centre = { x: width / 2, y: height / 2 };
  setFar(Math.max(width / innerWidth, height / innerHeight) * view.pixel / 0.92);
}
/** The spot of the map under a point of the screen, on the ground. */
const caster = new THREE.Raycaster();
function spot(sx: number, sy: number): { x: number; y: number } | null {
  caster.setFromCamera(new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1), view.camera);
  return onTheGround(caster.ray);
}
// Changes how far off the camera stands, keeping still what is under a point of the screen.
function zoomAt(sx: number, sy: number, next: number): void {
  const held = { x: centre.x + (sx - innerWidth / 2) / scale(), y: centre.y + (sy - innerHeight / 2) / scale() };
  setFar(next);
  centre = { x: held.x - (sx - innerWidth / 2) / scale(), y: held.y - (sy - innerHeight / 2) / scale() };
}

let pointer = { x: innerWidth / 2, y: innerHeight / 2 }, dragging = false;
const world = document.getElementById('world')!;
world.addEventListener('pointerdown', e => { dragging = true; world.setPointerCapture(e.pointerId); });
world.addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', e => {
  if (dragging) centre = { x: centre.x - e.movementX / scale(), y: centre.y - e.movementY / scale() };
  pointer = { x: e.clientX, y: e.clientY };
});
addEventListener('wheel', e => zoomAt(e.clientX, e.clientY, far * Math.exp(e.deltaY * 0.0015)), { passive: true });
const held = new Set<string>();
addEventListener('keyup', e => held.delete(e.code));
addEventListener('keydown', e => {
  held.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyF') fit();
  if (e.code === 'KeyG') grid.visible = !grid.visible;
  if (e.code === 'KeyV') showFrame = !showFrame;
  if (e.code === 'KeyT') { const shown = !people.visible; people.visible = shown; for (const o of standing) o.visible = shown; }
  if (e.code === 'KeyO') view.apply({ ...view.look, shadows: !view.look.shadows });
  if (e.code === 'Digit1') view.pixelated = !view.pixelated;
  if (e.code === 'Digit2') zoomAt(pointer.x, pointer.y, GAME_FAR);
});

function report(at: { x: number; y: number } | null): void {
  const zone = at && zoneAt(map, at.x, at.y);
  const inside = !!at && at.x >= 0 && at.y >= 0 && at.x < width && at.y < height;
  const under = !inside || !at ? '' : `${zone ? zone.name + (zone.safe ? ' (segura)' : '') : 'Espesura'} · parcela ${Math.floor(at.x / PLOT_W)},${Math.floor(at.y / PLOT_H)} · ${Math.round(at.x)},${Math.round(at.y)} · altura ${country.terrain.at(at.x, at.y).toFixed(1)}`;
  const html = `<b>${map.name}</b> · ${cols}×${rows} parcelas · ${width}×${height} px · alejamiento ${far.toFixed(2)}`
    + `<br>${under}`
    + wrong.map(fault => `<br><span class="fault">${fault}</span>`).join('');
  if (info.innerHTML !== html) info.innerHTML = html;
}

let last = performance.now();
function step(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const pan = PAN * dt / scale();
  centre.x += (Number(held.has('KeyD')) - Number(held.has('KeyA'))) * pan;
  centre.y += (Number(held.has('KeyS')) - Number(held.has('KeyW'))) * pan;
  view.follow(ground(centre.x, centre.y), dt);
  const at = spot(pointer.x, pointer.y);
  // The game's view, round the pointer, while the map is seen from further than the game sees it.
  frame.visible = showFrame && !!at && far > GAME_FAR;
  if (frame.visible && at) {
    const w = (innerWidth / view.pixel) * GAME_FAR / 2, h = (innerHeight / view.pixel) * GAME_FAR / 2, points: THREE.Vector3[] = [];
    const corners = [{ x: at.x - w, y: at.y - h }, { x: at.x + w, y: at.y - h }, { x: at.x + w, y: at.y + h }, { x: at.x - w, y: at.y + h }];
    corners.forEach((c, i) => along(points, c, corners[(i + 1) % 4]));
    frame.geometry.setFromPoints(points);
  }
  view.camera.updateMatrixWorld();
  const projected = new THREE.Vector3();
  for (const { el, x, y } of pinned) {
    projected.copy(ground(x, y, 20)).project(view.camera);
    el.style.transform = `translate(${Math.round((projected.x + 1) / 2 * innerWidth)}px, ${Math.round((1 - projected.y) / 2 * innerHeight)}px) translate(-50%, -50%)`;
  }
  report(at);
  view.draw();
  requestAnimationFrame(step);
}
fit();
requestAnimationFrame(step);

// Within reach of the console while developing.
if (import.meta.env.DEV) Object.assign(window, { view, country });
