import * as THREE from 'three';
import { chance } from '../world/chance';
import { trail } from '../world/trail';
import { middle, type WorldMap } from '../world/zones';
import { model } from './figure';
import { flat } from './paint';
import { ground, UPRIGHT } from './space';

// What lies about on a map, drawn as it lies: the boy's poncho where he fell, and the friar's wood for
// the fires (a bundle of logs tied with a cord, as its 2D drawing), to be picked up as in the 2D game, and the trails of blood the 2D game lays (world/trail.ts), mark for mark where it
// lays them.

/** The trail's two reds, from the 2D game's marks. */
const MARK = ['#4a1410', '#6b1c16'];
/**
 * The boy's poncho, crumpled where it fell (Tripo from a picture of it, 23 October 2026; three times
 * as wide as it is high): drawn so it lies 44 across, about as wide as its 2D drawing.
 */
const PONCHO = { url: 'cosas/3d/poncho.glb', drawn: 44 / 3 / UPRIGHT };

/** The bundle of wood: how long, how many logs, how thick, their colours; the cord round it. */
const WOOD = { long: 30, logs: 7, thick: [2.2, 3.2], colours: ['#4a3a28', '#5e4a32', '#3a2e20'], cord: '#b09a6a' };

/** How high over the ground the sign of what F does stands over something lying there. */
const OVER = 34;

/** Everything a map has lying about, and its trails. */
export class Strewn {
  readonly group = new THREE.Group();
  /** What lies where, drawn: by what it is. */
  private readonly lying = new Map<string, { body: THREE.Object3D; x: number; y: number }>();

  constructor(map: WorldMap) {
    for (const { what, plot } of map.things ?? []) {
      if (what !== 'poncho' && what !== 'lena') continue;
      const { x, y } = middle(plot), spot = new THREE.Group();
      spot.position.copy(ground(x, y));
      spot.rotation.y = 0.4;
      this.group.add(spot);
      this.lying.set(what, { body: spot, x, y });
      if (what === 'poncho') void model(PONCHO.url, PONCHO.drawn).then(cloth => spot.add(cloth));
      else spot.add(bundle());
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
    if (one) { one.body.visible = false; this.lying.delete(what); one.body.removeFromParent(); }
  }

  /** Whether it is there just now: what waits on the story is not, until it has happened. */
  there(what: string, on: boolean): void {
    const one = this.lying.get(what);
    if (one) one.body.visible = on;
  }

  /** How high the sign over whatever lies at this spot of the 2D ground stands, if anything does. */
  over(at: { x: number; y: number }): number | undefined {
    for (const one of this.lying.values()) if (one.body.visible && Math.hypot(one.x - at.x, one.y - at.y) < 1) return OVER;
    return undefined;
  }
}

/** A bundle of logs lying on the ground, side by side and piled, tied round with a cord at each end. */
function bundle(): THREE.Group {
  const wood = new THREE.Group();
  for (let n = 0; n < WOOD.logs; n++) {
    const thick = WOOD.thick[0] + chance(n, 3, 23) * (WOOD.thick[1] - WOOD.thick[0]);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, WOOD.long * (0.85 + chance(n, 4, 23) * 0.25), 6).rotateZ(Math.PI / 2), flat(WOOD.colours[n % WOOD.colours.length]));
    // Four along the bottom, three on them.
    const row = n < 4 ? 0 : 1, across = row ? n - 4 - 1 : n - 1.5;
    log.position.set((chance(n, 5, 23) - 0.5) * 3, thick + row * 4.4, across * 4.6);
    log.castShadow = log.receiveShadow = true;
    wood.add(log);
  }
  for (const end of [-1, 1]) {
    const cord = new THREE.Mesh(new THREE.TorusGeometry(9, 0.7, 4, 10).rotateY(Math.PI / 2), flat(WOOD.cord));
    cord.position.set(end * WOOD.long * 0.3, 5, 0);
    cord.scale.set(1, 0.75, 1);
    wood.add(cord);
  }
  return wood;
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
