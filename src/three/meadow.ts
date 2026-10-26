import * as THREE from 'three';
import { UNHIDING } from './xray';
import type { WorldMap } from '../world/zones';
import { flat } from './paint';
import { PITCH, UPRIGHT } from './space';
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
/**
 * The most ground the field can cover round where the camera looks, across and deep (a phone held
 * upright sees 2000 deep): room is made for that many tufts once, and each frame only as many as the
 * view needs are drawn (`FIELD`); seeing more than that, it is not drawn, a patch from so far off.
 */
const ROOM = { across: 1700, deep: 2100 };
/** How far past the picture's edges the field reaches: across, and deep (the ground rises toward the camera's eye, and a tuft leans). */
const PAST = { across: 32, deep: 128 };

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
  const room = Math.ceil(ROOM.across / CELL) * Math.ceil(ROOM.deep / CELL);
  const mesh = new THREE.InstancedMesh(tuft(map), flat(), room);
  (mesh.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
  // It hides nobody: nobody is shown in red through it.
  mesh.renderOrder = UNHIDING;
  const { lie, span, texels } = heightPicture(terrain);
  // Only the houses there are, for the shader to go round: none, on a map without one.
  const within = houses.slice(0, HOUSES);
  const uniforms = {
    time: { value: 0 }, origin: { value: new THREE.Vector2() }, field: { value: new THREE.Vector2(1, 1) }, lie: { value: lie }, span: { value: span }, texels: { value: texels },
    houses: { value: within.map(h => new THREE.Vector4(h.x, h.z, h.hw, h.hd)) },
    turns: { value: within.map(h => h.turn) },
  };
  const material = mesh.material as THREE.MeshToonMaterial;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float time;
uniform vec2 origin;
uniform vec2 field;
uniform sampler2D lie;
uniform vec2 span;
uniform vec2 texels;
${within.length ? `uniform vec4 houses[${within.length}];\nuniform float turns[${within.length}];` : ''}
float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <begin_vertex>', `
  // Which slot of the field this copy is (the field is as many across as the view needs, this frame),
  // and the cell of the ground it stands in: the one of its kind within the field round the camera.
  vec2 slot = vec2(mod(float(gl_InstanceID), field.x), floor(float(gl_InstanceID) / field.x));
  vec2 cell = origin + mod(slot - origin, field);
  vec2 at = (cell + vec2(hash1(cell), hash1(cell + 7.1))) * ${CELL.toFixed(1)};
  float ground = texture2D(lie, (at / span * (texels - 1.0) + 0.5) / texels).r;
  // Not every cell holds a tuft, and none grows in the water or past the map.
  float grows = step(hash1(cell + 3.3), ${TUFTS.toFixed(2)}) * step(${(WATER_LEVEL + 0.8).toFixed(2)}, ground)
    * step(0.0, at.x) * step(0.0, at.y) * step(at.x, span.x) * step(at.y, span.y);
  // Nor on the floor of a house.
  ${within.length ? `for (int h = 0; h < ${within.length}; h++) {
    vec2 off = at - houses[h].xy, k = vec2(cos(turns[h]), sin(turns[h]));
    vec2 in_ = vec2(off.x * k.x - off.y * k.y, off.x * k.y + off.y * k.x);
    if (abs(in_.x) < houses[h].z + 4.0 && abs(in_.y) < houses[h].w + 4.0) grows = 0.0;
  }` : ''}
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
  // Kept round where the camera looks, as wide and deep as it sees (the screen's height is twice
  // that along the ground, seen from 30° up) and a little past; not drawn from far off, where it
  // would be a patch. Grown for the whole of a 1700 by 2100 field, 44 000 tufts were put through
  // every pass for the 15 000 in view.
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    uniforms.time.value = performance.now() / 1000;
    const cam = camera as THREE.OrthographicCamera;
    const across = Math.ceil((cam.right - cam.left + 2 * PAST.across) / CELL);
    const deep = Math.ceil(((cam.top - cam.bottom) / Math.sin(PITCH) + 2 * PAST.deep) / CELL);
    uniforms.field.value.set(across, deep);
    camera.getWorldDirection(forward);
    hit.copy(camera.position).addScaledVector(forward, -camera.position.y / forward.y);
    uniforms.origin.value.set(Math.floor(hit.x / CELL - across / 2), Math.floor(hit.z / CELL - deep / 2));
    // (Hidden by its count, not by its material: a hidden material is never asked again.)
    mesh.count = across * deep <= room ? across * deep : 0;
  };
  return mesh;
}
