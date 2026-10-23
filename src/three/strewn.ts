import * as THREE from 'three';
import { chance } from '../world/chance';
import { trail } from '../world/trail';
import { middle, type WorldMap } from '../world/zones';
import { flat } from './paint';
import { ground } from './space';

// What lies about on a map, drawn as it lies: the boy's poncho where he fell, to be picked up as in
// the 2D game, and the trails of blood the 2D game lays (world/trail.ts), mark for mark where it
// lays them.

/** The poncho's colours, from its 2D drawing: the cloth, its folds, its lighter hem and the blood on it. */
const CLOTH = ['#8c3b30', '#7a3128', '#a85a48'], BLOOD = '#4a1410';
/** The trail's two reds, from the 2D game's marks. */
const MARK = ['#4a1410', '#6b1c16'];

/** A poncho dropped on the ground, crumpled: a cloth of flat faces, raised in a heap where it fell. */
function poncho(seed: number): THREE.Mesh {
  const wide = 44, deep = 30, across = 7, down = 5;
  const sheet = new THREE.PlaneGeometry(wide, deep, across, down).toNonIndexed();
  sheet.rotateX(-Math.PI / 2);
  const p = sheet.getAttribute('position') as THREE.BufferAttribute;
  // Each corner of the grid raised as far as the heap and a little chance say, the same wherever it is met.
  const height = (x: number, z: number) => {
    const heap = Math.max(0, 1 - Math.hypot((x + 6) / 16, (z + 4) / 11));
    return 1 + heap * 9 + chance(Math.round(x * 10), Math.round(z * 10), seed) * 2.5;
  };
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  // One colour a face, as pixel art is painted: mostly the cloth, darker in its folds, blood about the middle.
  const colours: number[] = [], c = new THREE.Color();
  for (let f = 0; f < p.count / 3; f++) {
    const x = p.getX(f * 3), z = p.getZ(f * 3), roll = chance(f, 0, seed + 1);
    const bloody = Math.hypot(x - 4, z - 2) < 9 && roll < 0.6;
    c.set(bloody ? BLOOD : CLOTH[Math.floor(roll * CLOTH.length)]).convertSRGBToLinear();
    for (let k = 0; k < 3; k++) colours.push(c.r, c.g, c.b);
  }
  sheet.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  sheet.computeVertexNormals();
  const mesh = new THREE.Mesh(sheet, flat());
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** How high over the ground the sign of what F does stands over something lying there. */
const OVER = 34;

/** Everything a map has lying about, and its trails. */
export class Strewn {
  readonly group = new THREE.Group();
  /** What lies where, drawn: by what it is. */
  private readonly lying = new Map<string, { body: THREE.Object3D; x: number; y: number }>();

  constructor(map: WorldMap) {
    for (const { what, plot } of map.things ?? []) {
      if (what !== 'poncho') continue;
      const { x, y } = middle(plot), cloth = poncho(plot[0] * 31 + plot[1]);
      cloth.position.copy(ground(x, y));
      cloth.rotation.y = 0.4;
      this.group.add(cloth);
      this.lying.set(what, { body: cloth, x, y });
    }
    this.group.add(...trails(map));
  }

  /** Whether this thing is drawn lying here, to be picked up. */
  lies(what: string): boolean {
    return this.lying.has(what);
  }

  /** Picked up: it is gone from the ground. */
  taken(what: string): void {
    const one = this.lying.get(what);
    if (one) one.body.visible = false;
  }

  /** How high the sign over whatever lies at this spot of the 2D ground stands, if anything does. */
  over(at: { x: number; y: number }): number | undefined {
    for (const one of this.lying.values()) if (one.body.visible && Math.hypot(one.x - at.x, one.y - at.y) < 1) return OVER;
    return undefined;
  }
}

/** A map's trails: a flat blot of blood a mark, as big as the 2D game draws it, lying on the ground. */
function trails(map: WorldMap): THREE.Object3D[] {
  const marks = (map.trails ?? []).flatMap(({ from, to }) => trail(map, from, to));
  if (!marks.length) return [];
  {
    const blot = new THREE.CircleGeometry(5, 7).rotateX(-Math.PI / 2);
    // White, so each mark's own colour is the colour it is drawn.
    const drawn = new THREE.InstancedMesh(blot, flat('#ffffff'), marks.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
    marks.forEach((mark, i) => {
      const size = 0.5 + mark.size * 0.7, at = ground(mark.x, mark.y, 0.3);
      // Round on the ground, so twice as wide as deep on the screen, as the 2D game's mark; a little
      // longer one way than the other, turned each its own way.
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), chance(i, 1, 7) * Math.PI);
      s.set(size * 1.2, 1, size * 0.9);
      drawn.setMatrixAt(i, m.compose(at, q, s));
      drawn.setColorAt(i, c.set(MARK[i % 2]));
    });
    drawn.receiveShadow = true;
    return [drawn];
  }
}
