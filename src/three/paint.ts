import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Flat colours, lit in a few hard steps, as pixel art is shaded: no smooth fall-off.

/** How many steps of light there are, and how much of its colour the darkest leaves: lit, half lit, in shade. */
const STEPS = 3, DARKEST = 0.45;

/** The steps of light from darkest to full, evenly between. */
function gradient(steps: number, darkest: number): THREE.DataTexture {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const v = steps === 1 ? 1 : darkest + ((1 - darkest) * i) / (steps - 1);
    data.set([v * 255, v * 255, v * 255, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

let steps = gradient(STEPS, DARKEST);
/** Every flat material made, so that its steps of light can be changed after. */
const made: THREE.MeshToonMaterial[] = [];

/** A material of one flat colour, or of the colours painted on each vertex. */
export function flat(colour?: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  const material = colour === undefined
    ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: steps })
    : new THREE.MeshToonMaterial({ color: colour, gradientMap: steps });
  made.push(material);
  return material;
}

/** Changes how many steps of light every flat material is shaded in, and how dark the last. */
export function shadeIn(count: number, darkest: number): void {
  steps.dispose();
  steps = gradient(Math.max(1, Math.round(count)), darkest);
  for (const material of made) {
    material.gradientMap = steps;
    material.needsUpdate = true;
  }
}

/** A piece of a shape, painted one colour all over, so that pieces of several colours can be joined. */
export function part(geometry: THREE.BufferGeometry, colour: THREE.ColorRepresentation): THREE.BufferGeometry {
  // Faces are kept apart so each is lit flat.
  const piece = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(colour);
  const n = piece.getAttribute('position').count;
  const colours = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colours.set([c.r, c.g, c.b], i * 3);
  piece.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  piece.deleteAttribute('uv');
  piece.computeVertexNormals();
  return piece;
}

/** Several painted pieces as one shape. */
export function joined(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(pieces)!;
}

/** A piece moved, turned and stretched where it goes in its shape. */
export function placed(geometry: THREE.BufferGeometry, at: [number, number, number], turn: [number, number, number] = [0, 0, 0], stretch: [number, number, number] = [1, 1, 1]): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)),
    new THREE.Vector3(...stretch),
  );
  return geometry.applyMatrix4(m);
}
