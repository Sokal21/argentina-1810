import * as THREE from 'three';
import { chance } from '../world/chance';
import { plantTrees } from '../world/trees';
import type { WorldMap } from '../world/zones';
import { model } from './figure';
import { ground, UPRIGHT } from './space';

// A forest map's trees in 3D: araucarias where the 2D game plants its trees (world/trees.ts), the same
// ones, and walked round as there (the 2D game keeps their trunks). Two of them (Tripo from concepts,
// 25 October 2026): a grown one, its crown a parasol on a bare trunk, and a young cone. Each tree its
// own turn, size and green; the young one, a flat card as Tripo made it, stood twice across itself.
// All of one kind drawn at once (instanced): there are hundreds.

/** The two, and how tall each stands as a share of the 2D drawing's height (81) times its size. */
const KINDS = [
  { url: 'bosque/3d/araucaria_adulta.glb', tall: 1.5, crossed: false },
  { url: 'bosque/3d/araucaria_joven.glb', tall: 1.1, crossed: true },
];
const DRAWN = 81;
/**
 * The map is planted in square cells this wide (2D pixels), each drawn on its own: drawn as one, every
 * tree of the map was drawn every frame, three times over (picture, edges, shadows), at 21 a second.
 */
const CELL = 640;
/** How far each tree's green may wander from the model's, lighter or darker. */
const TINT = { low: 0.78, high: 1.12 };
/**
 * Seen through: where a tree stands between the camera and Inti, a round hole is opened in it about her,
 * as the 2D game thins a crown that hides her: how wide (world units, across the screen), how far in
 * from its edge it fades, in a dither of the world's pixels.
 */
const HOLE = { wide: 130, soft: 0.3 };
/** And in their shade: how wide a shaft of sun is let through onto her, along the sun's way. */
const SHAFT = 70;

/** Where she is on the picture, how deep, and how much of the world the camera spans, for the hole. */
const cut = {
  at: { value: new THREE.Vector3(9, 9, 9) },
  span: { value: new THREE.Vector2(1, 1) },
  /** Where she stands in the world, and the way toward the sun. */
  spot: { value: new THREE.Vector3(9e9, 0, 0) },
  sun: { value: new THREE.Vector3(0, 1, 0) },
};

/** What a tree's shadow is cast with: none of it from within the shaft of sun onto her. */
function shaded(): THREE.Material {
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = shader => {
    shader.uniforms.cutSpot = cut.spot;
    shader.uniforms.cutSun = cut.sun;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 w = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          w = instanceMatrix * w;
        #endif
        vWorld = (modelMatrix * w).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;\nuniform vec3 cutSpot;\nuniform vec3 cutSun;')
      .replace('void main() {', `void main() {
        if (length(cross(vWorld - cutSpot, cutSun)) < ${SHAFT.toFixed(1)}) discard;`);
  };
  return depth;
}

/** A tree's material, with the hole about her opened in it. */
function holed(material: THREE.Material): THREE.Material {
  const own = material.clone();
  own.onBeforeCompile = shader => {
    shader.uniforms.cutAt = cut.at;
    shader.uniforms.cutSpan = cut.span;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vClip;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvClip = gl_Position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vClip;\nuniform vec3 cutAt;\nuniform vec2 cutSpan;')
      .replace('void main() {', `void main() {
        vec3 ndc = vClip.xyz / vClip.w;
        float d = length((ndc.xy - cutAt.xy) * cutSpan) / ${(HOLE.wide / 2).toFixed(1)};
        if (ndc.z < cutAt.z && d < 1.0) {
          // Fully open in the middle; toward the edge, every other pixel and then fewer.
          vec2 px = floor(gl_FragCoord.xy);
          float bayer = mod(px.x + 2.0 * mod(px.y, 2.0), 4.0) / 4.0 + 0.125;
          if (d < 1.0 - ${HOLE.soft.toFixed(2)} || (1.0 - d) / ${HOLE.soft.toFixed(2)} > bayer) discard;
        }`);
  };
  return own;
}

export class Forest3D {
  readonly group = new THREE.Group();
  /** How tall the tallest tree stands, in world units (0 on a bare map): the sun's shadows are reckoned up to there. */
  tallest = 0;

  /** Opens the hole about a spot (her middle) as this camera sees it. */
  static seeThrough(at: THREE.Vector3, camera: THREE.OrthographicCamera, sunward: THREE.Vector3): void {
    cut.spot.value.copy(at);
    cut.sun.value.copy(sunward).normalize();
    camera.updateMatrixWorld();
    cut.at.value.copy(at).project(camera);
    cut.span.value.set((camera.right - camera.left) / 2, (camera.top - camera.bottom) / 2);
  }

  constructor(map: WorldMap) {
    if (map.bare) return;
    const trees = plantTrees(map, KINDS.length);
    this.tallest = Math.max(0, ...trees.map(t => DRAWN * t.size * KINDS[t.kind].tall * UPRIGHT));
    KINDS.forEach((kind, k) => {
      const mine = trees.filter(t => t.kind === k);
      if (mine.length) void this.plant(kind, mine);
    });
  }

  private async plant(kind: (typeof KINDS)[number], trees: ReturnType<typeof plantTrees>): Promise<void> {
    // One unit tall as loaded (prepare_model.py): its meshes, each with where it stands in the model.
    const shape = await model(kind.url, 1 / UPRIGHT);
    shape.updateMatrixWorld(true);
    const parts: { geometry: THREE.BufferGeometry; material: THREE.Material; at: THREE.Matrix4 }[] = [];
    shape.traverse(o => { if (o instanceof THREE.Mesh) parts.push({ geometry: o.geometry, material: holed(o.material as THREE.Material), at: o.matrixWorld.clone() }); });
    const copies = kind.crossed ? 2 : 1;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    const cells = new Map<string, typeof trees>();
    for (const tree of trees) {
      const key = `${Math.floor(tree.x / CELL)},${Math.floor(tree.y / CELL)}`;
      cells.set(key, [...(cells.get(key) ?? []), tree]);
    }
    const shadow = shaded();
    for (const part of parts) for (const cell of cells.values()) {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, cell.length * copies);
      cell.forEach((tree, i) => {
        const tall = DRAWN * tree.size * kind.tall * UPRIGHT;
        const tint = TINT.low + chance(tree.x, tree.y, 9) * (TINT.high - TINT.low);
        for (let n = 0; n < copies; n++) {
          q.setFromAxisAngle(up, chance(tree.x, tree.y, 7) * Math.PI * 2 + n * Math.PI / 2);
          s.setScalar(tall);
          m.compose(ground(tree.x, tree.y), q, s).multiply(part.at);
          mesh.setMatrixAt(i * copies + n, m);
          mesh.setColorAt(i * copies + n, c.setRGB(tint, tint * (0.95 + chance(tree.x, tree.y, 11) * 0.1), tint));
        }
      });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.customDepthMaterial = shadow;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
  }
}
