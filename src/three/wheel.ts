import * as THREE from 'three';
import { flat, joined, part, placed } from './paint';

// A cart's wheel come off and broken, built of flat shapes as the game's own things are: an iron
// tyre over a wooden rim, twelve spokes from a thick hub, a stretch of the rim splintered away and
// the two spokes there snapped short. Stood upright in its own frame (x across, y up, its axle
// along z), its foot at the origin, leaning back by `lean` radians as one dropped against nothing.

const WOOD = '#4a4038', HUB = '#3e352e', IRON = '#5c3b2b';
/** How much of the round the rim lacks where it broke, in radians, and where that gap is (from +x, upward). */
const GAP = 0.75, BROKEN_AT = 0.5;

export function brokenWheel(radius = 27, lean = 0.3): THREE.Mesh {
  const arc = Math.PI * 2 - GAP, from = BROKEN_AT + GAP / 2;
  const pieces: THREE.BufferGeometry[] = [];
  // The rim and its tyre, each a torus round all but the gap.
  const ring = (r: number, thick: number, colour: string) => {
    const torus = new THREE.TorusGeometry(r, thick, 4, 28, arc);
    torus.rotateZ(from);
    pieces.push(part(torus, colour));
  };
  ring(radius - 2.4, 2.4, WOOD);
  ring(radius - 0.2, 1.1, IRON);
  // The hub, along the axle.
  pieces.push(part(placed(new THREE.CylinderGeometry(4.5, 4.5, 9, 8), [0, 0, 0], [Math.PI / 2, 0, 0]), HUB));
  // The spokes, evenly round; those that met the rim where it broke are snapped short.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const off = Math.atan2(Math.sin(a - BROKEN_AT), Math.cos(a - BROKEN_AT));
    const long = Math.abs(off) < GAP * 0.75 ? radius * 0.45 : radius - 4;
    const spoke = placed(new THREE.BoxGeometry(long, 2, 2), [Math.cos(a) * (long / 2 + 3), Math.sin(a) * (long / 2 + 3), 0], [0, 0, a]);
    pieces.push(part(spoke, WOOD));
  }
  const geometry = joined(pieces);
  // Its foot on the ground, leant back.
  geometry.translate(0, radius, 0);
  geometry.rotateX(-lean);
  const wheel = new THREE.Mesh(geometry, flat());
  wheel.castShadow = wheel.receiveShadow = true;
  return wheel;
}
