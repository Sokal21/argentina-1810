import * as THREE from 'three';
import { ISO_Y } from '../machi/data';
import { chance } from '../world/chance';
import { FEET, FOOT, GROWN } from '../world/country';
import { palisade, walls } from '../world/fences';
import type { Footprint } from '../world/footprint';
import { plantCountry } from '../world/plants';
import { SHALLOW, WET, waterLevels } from '../world/water';
import { extent, letterAt, middle, PLOT_H, PLOT_W, type WorldMap } from '../world/zones';
import { flat, joined, part, placed } from './paint';
import { ground, standOn, UPRIGHT } from './space';
import { LOOK, sunWay } from './look';
import { CELL, clouds, shapeTerrain, swell, WATER_LEVEL, type Terrain } from './terrain';

// A map of open country stood up in 3D from the same code that lays out the 2D one: the
// ground patched in its colours and shaped into its relief (terrain.ts), the water standing in
// its hollows, the plants where plantCountry puts them, the fences and the buildings. For now each
// thing is a few flat-coloured shapes, in place of its model.

/**
 * How much ground each pixel of the ground's picture covers, in world units; how far its tone
 * wanders between the map's darkest and lightest colours (shares of the way), over how far its
 * broadest swells run (clouds: swells within swells), and how much they lighten and darken it; how
 * high above the water mud reaches, and its colour.
 */
const TEXEL = 8;
const GROUND = { from: 0.08, to: 0.92, across: 700, light: 0.14, shore: 3, mud: '#56492a' };
/**
 * The slopes shaded into the picture, lighter facing the sun and darker away, as a map shows its
 * hills: the light's own steps hardly told a gentle slope from the flat. How strongly, and how far
 * apart the heights are compared.
 */
const HILLSHADE = { strength: 4, darkest: 0.62, lightest: 1.28, step: 8 };
/** How much darker the ground nobody crosses is. */
const WILD_SHADE = 0.72;
const WATER = { deep: '#3e5c66', shallow: '#5b7672', wet: '#6f7444' };

export interface Country3D {
  group: THREE.Group;
  /** The ground taken up by whatever stands where people walk: plants in the way and buildings. */
  feet: Footprint[];
  /** The lie of the land: everything put on the map stands on it. */
  terrain: Terrain;
}

export function raiseCountry(map: WorldMap): Country3D {
  const group = new THREE.Group();
  const feet: Footprint[] = [];
  // The relief first: whatever is put on the map after stands on it.
  const terrain = shapeTerrain(map);
  standOn(terrain.at);
  group.add(paintGround(map, terrain), pourWater(map));
  const { meshes, taken } = plantPlants(map);
  group.add(...meshes);
  feet.push(...taken);
  group.add(...raiseFences(map));
  const built = raiseBuildings(map);
  group.add(...built.meshes);
  feet.push(...built.taken);
  return { group, feet, terrain };
}

function paintGround(map: WorldMap, terrain: Terrain): THREE.Mesh {
  const { width, height } = extent(map);
  const depth = height / ISO_Y;
  // One flat colour over all of it, the map's own, its tone wandering a little in broad swells and
  // smaller ones; darker where nobody walks, mud where the water stands or has stood. No patches:
  // the picture is smooth and the pixels are the render's.
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width / TEXEL);
  canvas.height = Math.ceil(depth / TEXEL);
  const ctx = canvas.getContext('2d')!, picture = ctx.createImageData(canvas.width, canvas.height);
  // The map's colours from darkest to lightest: the tone wanders along them, never to either end.
  const tones = map.ground.map(hex => new THREE.Color(hex)).sort((a, b) => a.getHSL({ h: 0, s: 0, l: 0 }).l - b.getHSL({ h: 0, s: 0, l: 0 }).l);
  const water = waterLevels(map);
  const cols = map.plots[0].length, rows = map.plots.length;
  /** A share of something each plot has, read smoothly between the middles of the plots. */
  const smooth = (x: number, y: number, of: (col: number, row: number) => number) => {
    const u = Math.max(0, Math.min(cols - 1, x / PLOT_W - 0.5)), v = Math.max(0, Math.min(rows - 1, y / PLOT_H - 0.5));
    const i = Math.min(cols - 2, Math.floor(u)), j = Math.min(rows - 2, Math.floor(v)), fu = u - i, fv = v - j;
    const a = of(i, j), b = of(i + 1, j), c = of(i, j + 1), d = of(i + 1, j + 1);
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  const wildOf = (c: number, r: number) => (letterAt(map, c, r) === undefined ? 1 : 0);
  const marshOf = (c: number, r: number) => (water[r][c] >= WET && water[r][c] < SHALLOW ? 1 : 0);
  const s = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  const written = { r: 0, g: 0, b: 0 }, slope = new THREE.Vector3(), sun = sunWay(LOOK);
  const colour = new THREE.Color(), mud = new THREE.Color(GROUND.mud), wet = new THREE.Color(WATER.wet);
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const x = (px + 0.5) * TEXEL, z = (py + 0.5) * TEXEL, y = z * ISO_Y;
      // Its tone wanders like clouds, stretched so the swells reach well toward either end.
      const cloud = Math.max(0, Math.min(1, (clouds(x, z, GROUND.across, 31) - 0.5) * 2.2 + 0.5));
      const tone = GROUND.from + (GROUND.to - GROUND.from) * cloud;
      const at = tone * (tones.length - 1), k = Math.min(tones.length - 2, Math.floor(at));
      // The map's colours lie close together: the clouds lighten and darken it too.
      colour.copy(tones[k]).lerp(tones[k + 1], at - k).multiplyScalar(1 + GROUND.light * (cloud - 0.5) * 2);
      // The marsh: wet patches here and there.
      const marsh = smooth(x, y, marshOf);
      if (marsh > 0.05) colour.lerp(wet, s(0.5, 0.62, swell(x, z, 48, 41)) * marsh * 0.8);
      // Mud along the water and under it.
      colour.lerp(mud, s(WATER_LEVEL + GROUND.shore, WATER_LEVEL - 1, terrain.at(x, y)));
      // Darker where nobody walks.
      colour.multiplyScalar(1 - (1 - WILD_SHADE) * s(0.3, 0.8, smooth(x, y, wildOf)));
      // The slope, toward the sun or away from it.
      const h = HILLSHADE.step, dx = terrain.at(x + h, y) - terrain.at(x - h, y), dz = terrain.at(x, y + h * ISO_Y) - terrain.at(x, y - h * ISO_Y);
      slope.set(-dx / (2 * h), 1, -dz / (2 * h)).normalize();
      colour.multiplyScalar(Math.max(HILLSHADE.darkest, Math.min(HILLSHADE.lightest, 1 + HILLSHADE.strength * (slope.dot(sun) - sun.y))));
      // The picture is in the screen's colours (sRGB); Three keeps its colours linear, which written
      // as they are came out dark and brown.
      const o = (py * canvas.width + px) * 4, rgb = colour.getRGB(written, THREE.SRGBColorSpace);
      picture.data[o] = rgb.r * 255;
      picture.data[o + 1] = rgb.g * 255;
      picture.data[o + 2] = rgb.b * 255;
      picture.data[o + 3] = 255;
    }
  }
  ctx.putImageData(picture, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = flat('#ffffff');
  material.map = texture;
  // Shaped to the relief: one vertex for each height reckoned, the picture laid over it as before.
  const { heights } = terrain, across = terrain.cols * CELL, deep = terrain.rows * CELL;
  const shape = new THREE.PlaneGeometry(across, deep, terrain.cols, terrain.rows);
  shape.rotateX(-Math.PI / 2);
  shape.translate(across / 2, 0, deep / 2);
  const position = shape.getAttribute('position') as THREE.BufferAttribute, uv = shape.getAttribute('uv') as THREE.BufferAttribute;
  const pictured = { across: canvas.width * TEXEL, deep: canvas.height * TEXEL };
  for (let k = 0; k < position.count; k++) {
    position.setY(k, heights[k]);
    // The picture covers the map, which the heights may run a little past.
    uv.setXY(k, position.getX(k) / pictured.across, 1 - position.getZ(k) / pictured.deep);
  }
  shape.computeVertexNormals();
  const mesh = new THREE.Mesh(shape, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** The water standing in the hollows: one level, seen wherever the ground lies below it. */
function pourWater(map: WorldMap): THREE.Mesh {
  const { width, height } = extent(map), depth = height / (PLOT_H / PLOT_W);
  const material = flat(WATER.shallow);
  material.transparent = true;
  material.opacity = 0.82;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(width / 2, WATER_LEVEL, depth / 2);
  mesh.receiveShadow = true;
  return mesh;
}

/** Each plant as a few shapes, standing on its foot, as tall and wide as its drawing at size 1. */
function plantShape(kind: string): THREE.BufferGeometry | undefined {
  // What the drawings measure, in their own pixels.
  const tall = (h: number) => h * UPRIGHT;
  switch (kind) {
    case 'cortadera': {
      const h = tall(88), pieces = [part(placed(new THREE.ConeGeometry(30, h * 0.6, 6), [0, h * 0.3, 0]), '#8b8448')];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        pieces.push(part(placed(new THREE.ConeGeometry(4, h * 0.5, 4), [Math.cos(a) * 10, h * 0.72, Math.sin(a) * 10], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]), '#e3d8ad'));
      }
      return joined(pieces);
    }
    case 'cardo': {
      const h = tall(108);
      return joined([
        part(placed(new THREE.CylinderGeometry(2, 3, h * 0.8, 4), [0, h * 0.4, 0]), '#6f7a52'),
        part(placed(new THREE.IcosahedronGeometry(20), [0, h * 0.3, 0], [0, 0, 0], [1, 0.7, 1]), '#7c8a5c'),
        part(placed(new THREE.IcosahedronGeometry(9), [0, h * 0.85, 0]), '#8a5a92'),
      ]);
    }
    case 'tuna': {
      const pieces: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 5; i++) {
        const a = i * 1.7;
        pieces.push(part(placed(new THREE.SphereGeometry(16, 6, 4), [Math.cos(a) * 14 * (i ? 1 : 0), 16 + (i % 3) * 18, Math.sin(a) * 10 * (i ? 1 : 0)], [0, a, 0.3 * (i % 2 ? 1 : -1)], [1, 1.2, 0.35]), '#5d7b3b'));
      }
      return joined(pieces);
    }
    case 'maiz': {
      const h = tall(104), pieces: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 4; i++) {
        const x = (i % 2 ? 1 : -1) * 14, z = (i < 2 ? 1 : -1) * 10;
        pieces.push(part(placed(new THREE.CylinderGeometry(2, 3, h, 4), [x, h / 2, z]), '#8a9a42'));
        pieces.push(part(placed(new THREE.ConeGeometry(10, h * 0.5, 4), [x, h * 0.45, z]), '#7a8c38'));
        pieces.push(part(placed(new THREE.ConeGeometry(3, 14, 4), [x, h + 6, z]), '#d8c06a'));
      }
      return joined(pieces);
    }
    case 'tala': {
      const h = tall(112);
      return joined([
        part(placed(new THREE.CylinderGeometry(4, 6, h * 0.55, 5), [0, h * 0.27, 0]), '#5e4a38'),
        part(placed(new THREE.IcosahedronGeometry(60), [0, h * 0.68, 0], [0, 0, 0], [1, 0.5, 0.8]), '#56633a'),
      ]);
    }
    case 'junco': {
      const h = tall(80), pieces: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) {
        const a = i * 2.1, r = 4 + (i % 3) * 5, k = 0.75 + (i % 3) * 0.12;
        pieces.push(part(placed(new THREE.ConeGeometry(2.5, h * k, 4), [Math.cos(a) * r, h * k / 2, Math.sin(a) * r], [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]), i % 2 ? '#4f6a3a' : '#5d7842'));
      }
      return joined(pieces);
    }
    case 'ombu':
    case 'ombu_chico': {
      const h = tall(125);
      return joined([
        part(placed(new THREE.CylinderGeometry(14, 24, h * 0.5, 7), [0, h * 0.25, 0]), '#6b5a4a'),
        part(placed(new THREE.CylinderGeometry(30, 34, 6, 7), [0, 3, 0]), '#5f5040'),
        part(placed(new THREE.IcosahedronGeometry(70, 1), [0, h * 0.7, 0], [0, 0, 0], [1, 0.55, 0.85]), '#4b6a32'),
        part(placed(new THREE.IcosahedronGeometry(40), [35, h * 0.6, 20], [0, 0, 0], [1, 0.6, 1]), '#557638'),
      ]);
    }
  }
  return undefined;
}

function plantPlants(map: WorldMap): { meshes: THREE.InstancedMesh[]; taken: Footprint[] } {
  const byKind = new Map<string, ReturnType<typeof plantCountry>>();
  const taken: Footprint[] = [];
  for (const plant of plantCountry(map)) {
    const size = plant.size * (GROWN[plant.kind] ?? 1);
    byKind.set(plant.kind, [...(byKind.get(plant.kind) ?? []), { ...plant, size }]);
    if (plant.inTheWay) {
      // As the 2D game reckons it, so that the same plants are walked round.
      const foot = FEET[plant.kind] ?? FOOT, hh = foot.hh * size;
      taken.push({ x: plant.x, y: plant.y - hh, hw: foot.hw * size, hh });
    }
  }
  const material = flat();
  const meshes: THREE.InstancedMesh[] = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), tint = new THREE.Color();
  for (const [kind, plants] of byKind) {
    const shape = plantShape(kind);
    if (!shape) continue;
    const mesh = new THREE.InstancedMesh(shape, material, plants.length);
    plants.forEach((plant, i) => {
      q.setFromAxisAngle(new THREE.Object3D().up, plant.which * Math.PI * 2);
      m.compose(ground(plant.x, plant.y), q, new THREE.Vector3(plant.size, plant.size, plant.size));
      mesh.setMatrixAt(i, m);
      // No two quite the same colour.
      const k = 0.88 + chance(plant.x, plant.y, 3) * 0.24;
      mesh.setColorAt(i, tint.setRGB(k, k, k));
    });
    mesh.castShadow = mesh.receiveShadow = true;
    meshes.push(mesh);
  }
  return { meshes, taken };
}

function raiseFences(map: WorldMap): THREE.InstancedMesh[] {
  const kinds: [ReturnType<typeof palisade>, THREE.BufferGeometry][] = [
    [palisade(map), joined([part(placed(new THREE.CylinderGeometry(2, 2.5, 34, 5), [0, 17, 0]), '#6b5238')])],
    [walls(map), joined([part(placed(new THREE.BoxGeometry(6, 40, 6), [0, 20, 0]), '#b59a72')])],
  ];
  const material = flat();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  return kinds.filter(([stakes]) => stakes.length).map(([stakes, shape]) => {
    const mesh = new THREE.InstancedMesh(shape, material, stakes.length);
    stakes.forEach((stake, i) => mesh.setMatrixAt(i, m.compose(ground(stake.x, stake.y), q, one)));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  });
}

function raiseBuildings(map: WorldMap): { meshes: THREE.Mesh[]; taken: Footprint[] } {
  const meshes: THREE.Mesh[] = [], taken: Footprint[] = [];
  for (const b of map.buildings ?? []) {
    const { x, y } = middle(b.plot);
    // Its front foot is on the plot; it runs `deep` back from there and is `tall` as drawn.
    const tall = b.tall * UPRIGHT, roof = Math.min(b.deep, b.wide) * 0.45;
    const wall = new THREE.Color(b.colour), eaves = wall.clone().multiplyScalar(0.55);
    // A gabled roof: a three-sided prism lying along its width, its point up. Laid on its side the
    // prism's point is 1 above its axis and its foot 0.5 below, and its foot is √3 across.
    const ridge = new THREE.CylinderGeometry(1, 1, b.wide + 8, 3, 1, false, Math.PI / 2);
    const up = roof / 1.5, across = (b.deep + 12) / Math.sqrt(3);
    const shape = joined([
      part(placed(new THREE.BoxGeometry(b.wide, tall, b.deep), [0, tall / 2, -b.deep / 2]), wall),
      part(placed(ridge, [0, tall + up / 2, -b.deep / 2], [0, 0, Math.PI / 2], [up, 1, across]), eaves),
      // A door, where it has one.
      ...(b.door ? [part(placed(new THREE.BoxGeometry(18, 34, 2), [0, 17, 1]), '#3a2a1e')] : []),
    ]);
    const mesh = new THREE.Mesh(shape, flat());
    mesh.position.copy(ground(x, y));
    mesh.castShadow = mesh.receiveShadow = true;
    meshes.push(mesh);
    const back = b.deep / 2;
    taken.push({ x, y: y - back / 2, hw: b.wide / 2, hh: back / 2 });
  }
  return { meshes, taken };
}
