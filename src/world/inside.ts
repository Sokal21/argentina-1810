import Phaser from 'phaser';
import { Hearth } from '../fx/hearth';
import { middle, type Building, type WorldMap } from './zones';

// Buildings that are drawn, and going into them. Two ways of going in are being tried:
//  - 'fundido': the screen goes dark at the door and comes up again in the room, which is
//    somewhere of its own, with nothing round it;
//  - 'directo': the room is where the house is; going through the door the house fades away
//    and the room under it shows, the world still round it.
// Where nothing says otherwise, it is the first.

export type Entering = 'fundido' | 'directo';
type Vec = { x: number; y: number };

const STRIP = 8;       // how wide each upright slice of a house is drawn, each in front of or behind whoever is by it
const NEAR = 15;       // how near the door one has to come to go through it
const FADE = 260;      // milliseconds the screen takes to go dark, and the house to fade
const OUT = 26;        // how far in front of the door one is left on coming out
const AWAY = { x: 0, y: 1800 }; // where the rooms are, past the bottom of the map, when they are somewhere of their own
/** How far past the bottom of the map the rooms reach. */
export const ROOMS = 2400;

/** How far down the screen a polygon's lower edge is at some point across it: what stands lower is in front of it. */
function lowest(poly: Vec[], x: number): number {
  let y = -Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.x <= x && x <= b.x) || (b.x <= x && x <= a.x)) y = Math.max(y, a.x === b.x ? Math.max(a.y, b.y) : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x));
  }
  if (y > -Infinity) return y;
  // Beyond its ends: the end nearest.
  const xs = poly.map(p => p.x), near = x < Math.min(...xs) ? Math.min(...xs) : Math.max(...xs);
  return lowest(poly, near);
}

/** Whether a point is inside a polygon. */
function within(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

interface Drawn {
  b: Building;
  /** The house, in upright slices. */
  house: Phaser.GameObjects.Image[];
  /** The ground it stands on, which nobody walks through. */
  base: Vec[];
  /** The door, outside, in the world. */
  door: Vec;
  room?: { image: Phaser.GameObjects.Image; floor: Vec[]; door: Vec; arrive: Vec; back?: Phaser.GameObjects.Rectangle; place: (p: [number, number]) => Vec; furniture: { pieces: Phaser.GameObjects.Image[]; poly: Vec[] }[]; fires: Hearth[] };
}

export class Indoors {
  private drawn: Drawn[] = [];
  /** Which room the hero is in, if any, and whether they are on their way in or out. */
  private inside?: Drawn;
  private busy = false;
  /** Having just come out, the door does not take them in again until they have stepped away from it. */
  private armed = true;

  constructor(private scene: Phaser.Scene, map: WorldMap, readonly mode: Entering = 'fundido') {
    for (const b of map.buildings ?? []) {
      if (!b.sprite || !scene.textures.exists(b.sprite)) continue;
      const { x, y } = middle(b.plot);
      const source = scene.textures.get(b.sprite).getSourceImage() as HTMLImageElement;
      // The drawing stands on the plot's middle by the middle of its foot; its own pixels are the world's.
      const at = (p: [number, number]) => ({ x: x - source.width / 2 + p[0], y: y - source.height + p[1] });
      // Its ground, and the house cut in upright slices, each as far forward as the ground's lower edge where it stands.
      const base = (b.base ?? [[0, source.height * 0.8], [source.width, source.height * 0.8], [source.width, source.height], [0, source.height]]).map(at);
      const house = slices(scene, b.sprite, at([0, 0]), base);
      const door = at(b.door ?? [source.width / 2, source.height]);
      const one: Drawn = { b, house, base, door };
      const inside = b.inside;
      if (inside && scene.textures.exists(inside.sprite)) {
        const k = inside.scale ?? 1;
        // Somewhere of its own; or under the house, its door where the house's is.
        const origin = mode === 'fundido'
          ? { x: AWAY.x + x, y: map.plots.length * 64 + AWAY.y }
          : { x: door.x - inside.door[0] * k, y: door.y - inside.door[1] * k };
        const place = (p: [number, number]) => ({ x: origin.x + p[0] * k, y: origin.y + p[1] * k });
        const image = scene.add.image(origin.x, origin.y, inside.sprite).setOrigin(0, 0).setScale(k).setDepth(-1e6 + 6).setAlpha(mode === 'directo' ? 0 : 1);
        const back = mode === 'fundido' ? scene.add.rectangle(image.x + image.displayWidth / 2, image.y + image.displayHeight / 2, image.displayWidth + 2400, image.displayHeight + 1600, 0x07060a).setDepth(-1e6 + 5) : undefined;
        // What stands in the room and hides whoever is behind it: cut out of the room's drawing, it is drawn again over them.
        const furniture = (inside.furniture ?? []).map((cut, n) => {
          const poly = cut.map(place);
          const key = `${inside.sprite}:mueble${n}`;
          if (!scene.textures.exists(key)) {
            const src = scene.textures.get(inside.sprite).getSourceImage() as HTMLImageElement;
            const tex = scene.textures.createCanvas(key, src.width, src.height)!;
            const g = tex.getContext();
            g.beginPath();
            cut.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
            g.closePath();
            g.clip();
            g.drawImage(src, 0, 0);
            tex.refresh();
          }
          return { pieces: slices(scene, key, origin, poly, k), poly };
        });
        if (mode === 'directo') for (const piece of furniture) for (const p of piece.pieces) p.setAlpha(0);
        // Its fires, burning over the drawn ones, and the light they throw.
        const fires = (inside.fires ?? []).map(([fx, fy, fw, fh]) => {
          const corner = place([fx, fy]);
          return new Hearth(scene, { x: corner.x, y: corner.y, w: fw * k, h: fh * k }, k, inside.light ?? 160, -1e6 + 6.5);
        });
        one.room = { image, floor: inside.floor.map(place), door: place(inside.door), arrive: place(inside.arrive), back, place, furniture, fires };
      }
      this.drawn.push(one);
    }
  }

  /** Where a spot in a room's drawing is in the world, for whoever stands in it. */
  spot(building: string, at: [number, number]): Vec | undefined {
    return this.drawn.find(d => d.b.name === building)?.room?.place(at);
  }

  /** Keeps a step outside off the ground the houses stand on, sliding along their walls. */
  block(from: Vec, to: Vec): Vec {
    const walls = this.drawn.filter(d => !(this.mode === 'directo' && d === this.inside)).map(d => d.base);
    return slide(from, to, p => !walls.some(w => within(p, w)));
  }

  /** The building the hero is inside, if any. */
  get within(): string | undefined {
    return this.inside?.b.name;
  }

  /** Puts the hero back inside a building at once, as when a game left there is taken up. Says whether it could. */
  resume(building: string): boolean {
    const d = this.drawn.find(one => one.b.name === building && one.room);
    if (!d) return false;
    this.inside = d;
    if (this.mode === 'fundido') this.scene.cameras.main.removeBounds();
    else { for (const p of d.house) p.setAlpha(0); d.room!.image.setAlpha(1); for (const p of d.room!.furniture.flatMap(f => f.pieces)) p.setAlpha(1); }
    return true;
  }

  /** Keeps the fires burning, in whichever rooms can be seen. */
  update(time: number): void {
    for (const d of this.drawn) {
      const room = d.room;
      if (!room?.fires.length) continue;
      for (const fire of room.fires) fire.update(time, this.mode === 'directo' ? room.image.alpha : 1);
    }
  }

  /** Whether the hero is inside somewhere, where the map's ground does not hold them but the room's floor does. */
  get indoors(): boolean {
    return !!this.inside;
  }

  /** Keeps a step inside on the floor of the room and off what stands on it, sliding along walls. */
  hold(from: Vec, to: Vec): Vec {
    const room = this.inside?.room;
    if (!room) return { ...to };
    return slide(from, to, p => within(p, room.floor) && !room.furniture.some(f => within(p, f.poly)));
  }

  /** Takes the hero in through a door they have come to, or out through one inside. */
  check(hero: Vec): void {
    if (this.busy) return;
    if (!this.inside) {
      const at = this.drawn.find(d => d.room && Phaser.Math.Distance.Between(hero.x, hero.y, d.door.x, d.door.y) < NEAR);
      if (!this.armed) { this.armed = !this.drawn.some(d => Phaser.Math.Distance.Between(hero.x, hero.y, d.door.x, d.door.y) < NEAR * 2); return; }
      if (at) this.go(at, hero, true);
      return;
    }
    const room = this.inside.room!;
    if (Phaser.Math.Distance.Between(hero.x, hero.y, room.door.x, room.door.y) < NEAR) this.go(this.inside, hero, false);
  }

  private go(d: Drawn, hero: Vec, inward: boolean): void {
    const room = d.room!, cam = this.scene.cameras.main;
    const put = () => {
      if (inward) { hero.x = room.arrive.x; hero.y = room.arrive.y; }
      else { hero.x = d.door.x; hero.y = d.door.y + OUT; this.armed = false; }
      this.inside = inward ? d : undefined;
    };
    this.busy = true;
    if (this.mode === 'fundido') {
      cam.fadeOut(FADE, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        put();
        if (inward) cam.removeBounds(); else cam.setBounds(0, 0, this.bounds.width, this.bounds.height);
        cam.fadeIn(FADE, 0, 0, 0);
        this.busy = false;
      });
      return;
    }
    // Straight in: the house fades away over the room, or comes back over it.
    put();
    this.scene.tweens.add({ targets: d.house, alpha: inward ? 0 : 1, duration: FADE * 1.5 });
    this.scene.tweens.add({ targets: room.furniture.flatMap(f => f.pieces), alpha: inward ? 1 : 0, duration: FADE * 1.5 });
    this.scene.tweens.add({ targets: room.image, alpha: inward ? 1 : 0, duration: FADE * 1.5, onComplete: () => { this.busy = false; } });
  }

  /** How big the map is, to give the camera back its bounds on coming out. */
  bounds = { width: 0, height: 0 };
}

// A step that would leave where one may be is kept, or slid along whichever way it can go.
function slide(from: Vec, to: Vec, may: (p: Vec) => boolean): Vec {
  if (may(to)) return { ...to };
  if (may({ x: to.x, y: from.y })) return { x: to.x, y: from.y };
  if (may({ x: from.x, y: to.y })) return { x: from.x, y: to.y };
  return { ...from };
}

/**
 * A drawing stood up in upright slices, its corner at `corner` and shown `k` times its size. Each
 * slice is as far forward as the lower edge of `ground` where it stands, so whoever is in front of
 * that edge is drawn over it and whoever is behind it, under: a long house seen at a slant has its
 * near corner in front of someone by its far end.
 */
function slices(scene: Phaser.Scene, key: string, corner: Vec, ground: Vec[], k = 1): Phaser.GameObjects.Image[] {
  const texture = scene.textures.get(key), source = texture.getSourceImage() as HTMLImageElement;
  const xs = ground.map(p => (p.x - corner.x) / k);
  const from = Math.max(0, Math.floor(Math.min(...xs) / STRIP) * STRIP), to = Math.min(source.width, Math.ceil(Math.max(...xs) / STRIP) * STRIP);
  // Whatever of the drawing is beyond its ground at either side goes with the slice at that end.
  const cuts: [number, number][] = [];
  for (let x = 0; x < source.width; x += STRIP) {
    const a = x < from ? 0 : x, b = x + STRIP >= to ? source.width : x + STRIP;
    if (x >= from || x === 0) cuts.push([a, b]);
    if (b === source.width) break;
  }
  return cuts.map(([a, b]) => {
    const name = `strip${a}`;
    if (!texture.has(name)) texture.add(name, 0, a, 0, b - a, source.height);
    const mid = corner.x + (Math.max(a, from) + Math.min(b, to)) / 2 * k;
    return scene.add.image(corner.x + a * k, corner.y, key, name).setOrigin(0, 0).setScale(k).setDepth(lowest(ground, mid));
  });
}
