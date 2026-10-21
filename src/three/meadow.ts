import * as THREE from 'three';
import type { WorldMap } from '../world/zones';
import { flat } from './paint';
import { UPRIGHT } from './space';
import { heightPicture, WATER_LEVEL, type Terrain } from './terrain';

// Grass to the ankle over all the dry ground, with the wind in it, as the 2D game's meadow
// (fx/meadow.ts): tufts of three blades, the middle one tallest, leaning further the higher up,
// and swells of wind crossing the country so that tufts along their way lie over one after
// another. The map is far too big to grow it all: a field of tufts is kept round where the camera
// looks, each slot of it standing in whichever cell of the ground it falls on, and where each
// tuft stands, how high and whether it grows at all (not in water) is worked out on the GPU.

/** How far apart the tufts' cells are, in world units; the share of them that hold a tuft. */
const CELL = 9, TUFTS = 0.7;
/** How tall the tallest blade grows (to the ankle), how wide a blade is at its foot (wider than a pixel of the picture, or the pixels eat it). */
const TALL = 11 * UPRIGHT, WIDE = 2;
/** How far a gust carries the tip of the tallest blade, how fast the swells cross, and which way. */
const LEAN = 4 * UPRIGHT, GUSTS = 0.32, WIND = new THREE.Vector2(1, 0.35).normalize();
/** How much ground the field covers round where the camera looks, across and deep. Seeing more than that across, it is not drawn. */
const FIELD = { across: 1700, deep: 2100 };

/** The blades' colours, from the map's ground: darker at the foot, lighter at the tip. */
function shades(map: WorldMap): { foot: THREE.Color; tip: THREE.Color } {
  const tones = map.ground.map(hex => new THREE.Color(hex));
  const mean = tones.reduce((sum, c) => sum.add(c), new THREE.Color(0, 0, 0)).multiplyScalar(1 / tones.length);
  return { foot: mean.clone().multiplyScalar(0.8), tip: mean.clone().multiplyScalar(1.3) };
}

/** One tuft: four blades side by side, a little apart in depth, leaning out, the middle ones tallest. */
function tuft(map: WorldMap): THREE.BufferGeometry {
  const { foot, tip } = shades(map);
  const positions: number[] = [], colours: number[] = [], normals: number[] = [];
  for (const [x, z, tall, out] of [[-3, 0.8, 0.6, -1.6], [-1, -0.4, 0.95, -0.4], [1.1, 0.3, 1, 0.6], [3, -0.6, 0.7, 1.8]]) {
    positions.push(x - WIDE / 2, 0, z, x + WIDE / 2, 0, z, x + out, TALL * tall, z);
    colours.push(foot.r, foot.g, foot.b, foot.r, foot.g, foot.b, tip.r, tip.g, tip.b);
    // Lit as the ground is, whichever way they face.
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shape.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  shape.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return shape;
}

/** How many houses' floors are kept clear of grass, at most. */
const HOUSES = 4;

/** `houses`: where the floors of those gone into lie, each its middle (3D ground), half its length and depth, and its turn. */
export function growMeadow(map: WorldMap, terrain: Terrain, houses: { x: number; z: number; hw: number; hd: number; turn: number }[] = []): THREE.InstancedMesh {
  const across = Math.ceil(FIELD.across / CELL), deep = Math.ceil(FIELD.deep / CELL), count = across * deep;
  const mesh = new THREE.InstancedMesh(tuft(map), flat(), count);
  (mesh.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
  const slots = new Float32Array(count * 2);
  for (let k = 0; k < count; k++) { slots[k * 2] = k % across; slots[k * 2 + 1] = Math.floor(k / across); }
  mesh.geometry.setAttribute('slot', new THREE.InstancedBufferAttribute(slots, 2));
  const { lie, span, texels } = heightPicture(terrain);
  const uniforms = {
    time: { value: 0 }, origin: { value: new THREE.Vector2() }, lie: { value: lie }, span: { value: span }, texels: { value: texels },
    houses: { value: Array.from({ length: HOUSES }, (_, i) => houses[i] ? new THREE.Vector4(houses[i].x, houses[i].z, houses[i].hw, houses[i].hd) : new THREE.Vector4(0, 0, -1, -1)) },
    turns: { value: Array.from({ length: HOUSES }, (_, i) => houses[i]?.turn ?? 0) },
  };
  const material = mesh.material as THREE.MeshToonMaterial;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 slot;
uniform float time;
uniform vec2 origin;
uniform sampler2D lie;
uniform vec2 span;
uniform vec2 texels;
uniform vec4 houses[${HOUSES}];
uniform float turns[${HOUSES}];
float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <begin_vertex>', `
  // The cell of the ground this slot stands in: the one of its kind within the field round the camera.
  vec2 field = vec2(${across.toFixed(1)}, ${deep.toFixed(1)});
  vec2 cell = origin + mod(slot - origin, field);
  vec2 at = (cell + vec2(hash1(cell), hash1(cell + 7.1))) * ${CELL.toFixed(1)};
  float ground = texture2D(lie, (at / span * (texels - 1.0) + 0.5) / texels).r;
  // Not every cell holds a tuft, and none grows in the water or past the map.
  float grows = step(hash1(cell + 3.3), ${TUFTS.toFixed(2)}) * step(${(WATER_LEVEL + 0.8).toFixed(2)}, ground)
    * step(0.0, at.x) * step(0.0, at.y) * step(at.x, span.x) * step(at.y, span.y);
  // Nor on the floor of a house.
  for (int h = 0; h < ${HOUSES}; h++) {
    vec2 off = at - houses[h].xy, k = vec2(cos(turns[h]), sin(turns[h]));
    vec2 in_ = vec2(off.x * k.x - off.y * k.y, off.x * k.y + off.y * k.x);
    if (abs(in_.x) < houses[h].z + 4.0 && abs(in_.y) < houses[h].w + 4.0) grows = 0.0;
  }
  float size = grows * (0.7 + 0.5 * hash1(cell + 5.5));
  vec3 transformed = position * size;
  // The wind: swells crossing the ground, laying the blades over further the higher up they are.
  float swell = sin(dot(at, vec2(${WIND.x.toFixed(3)}, ${WIND.y.toFixed(3)})) * 0.012 - time * ${(GUSTS * 6).toFixed(2)});
  float gust = pow(0.5 + 0.5 * swell, 3.0) * 0.85 + 0.15 * sin(time * 2.3 + at.x * 0.05);
  float up = position.y / ${TALL.toFixed(2)};
  transformed.xz += vec2(${WIND.x.toFixed(3)}, ${WIND.y.toFixed(3)}) * ${LEAN.toFixed(2)} * gust * up * up * size;
  transformed.y -= ${(LEAN * 0.3).toFixed(2)} * gust * up * up * size;
  transformed += vec3(at.x, ground, at.y);
  // No two tufts quite the same colour (the colour is set before the place: it is tinted here), and
  // the tips pale as a gust lays them over, so that the wind is seen crossing.
  vColor.rgb *= (0.88 + 0.24 * hash1(cell + 9.9)) * (1.0 + 0.35 * gust * up);`);
  };
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  const forward = new THREE.Vector3(), hit = new THREE.Vector3();
  // Kept round where the camera looks, and not drawn from far off, where it would be a patch.
  mesh.onBeforeRender = (_renderer, scene, camera) => {
    uniforms.time.value = performance.now() / 1000;
    const cam = camera as THREE.OrthographicCamera;
    camera.getWorldDirection(forward);
    hit.copy(camera.position).addScaledVector(forward, -camera.position.y / forward.y);
    uniforms.origin.value.set(Math.floor(hit.x / CELL - across / 2), Math.floor(hit.z / CELL - deep / 2));
    // (Hidden by its count, not by its material: a hidden material is never asked again.)
    // Nor in the pass that finds the picture's edges (drawn with a material of its own, it would not
    // be placed, and outlines on every blade were not wanted).
    mesh.count = !scene.overrideMaterial && cam.right - cam.left < FIELD.across * 0.95 ? count : 0;
  };
  return mesh;
}
