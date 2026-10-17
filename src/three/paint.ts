import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Flat colours, lit in a few hard steps, as pixel art is shaded: no smooth fall-off.

/** Lit, half lit, in shade: how much of its colour each step of light leaves. */
const STEPS = [0.45, 0.75, 1];

const gradient = (() => {
  const data = new Uint8Array(STEPS.length * 4);
  STEPS.forEach((v, i) => data.set([v * 255, v * 255, v * 255, 255], i * 4));
  const texture = new THREE.DataTexture(data, STEPS.length, 1, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
})();

/** A material of one flat colour, or of the colours painted on each vertex. */
export function flat(colour?: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  return colour === undefined
    ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient })
    : new THREE.MeshToonMaterial({ color: colour, gradientMap: gradient });
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
