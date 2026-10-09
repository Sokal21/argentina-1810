import Phaser from 'phaser';
import { blow } from '../fx/wind';
import { fenceRuns, stakes } from './fences';
import type { Footprint } from './footprint';
import { plantCountry } from './plants';
import { castShadow, mirrored } from './scenery';
import { extent, middle, type WorldMap } from './zones';

// Open country: the plants that close each zone in, and what is built on
// it, which for now is a plain block of its size.

/** The drawings of each kind of plant, by the name each is loaded under. */
const PLANTS: Record<string, string[]> = {
  cortadera: ['cortadera_a', 'cortadera_b', 'cortadera_c'],
  cardo: ['cardo_a', 'cardo_b', 'cardo_c'],
  tuna: ['tuna_a', 'tuna_b', 'tuna_c'],
  maiz: ['maiz_a', 'maiz_b', 'maiz_c'],
  tala: ['tala_a', 'tala_b'],
  junco: ['junco_a', 'junco_b', 'junco_c'],
};
// Trees are shown larger than they are drawn, as in the forest: they stand
// well over a man, about twice his height.
const GROWN: Record<string, number> = { tala: 1.6 };
// The ground a plant in the way takes up, for one shown at its drawn size.
const FOOT = { hw: 9, hh: 4 };
const SHADOW_ALPHA = 0.32;
const FIGURE = 80;     // how tall someone standing behind a plant is, in sprite pixels
const THINNED = 0.4;   // how much is left of one that hides someone
const THINNING = 8;    // how fast it thins and fills in again, per second

/** Fetches the plants' drawings; to be called while a scene is loading. */
export function loadCountry(scene: Phaser.Scene): void {
  for (const name of Object.values(PLANTS).flat()) scene.load.image(name, `campo/${name}.png`);
}

/**
 * A map's plants, stood on it: each in front of whatever is further up the
 * screen, with its shadow on the ground, and the wind in it.
 */
export class Country {
  readonly plants: Phaser.GameObjects.Image[] = [];
  readonly shadows: Phaser.GameObjects.Image[] = [];
  /** The ground taken up by each plant that stands where people walk. */
  readonly feet: Footprint[] = [];

  constructor(scene: Phaser.Scene, map: WorldMap) {
    for (const planted of plantCountry(map)) {
      const drawings = PLANTS[planted.kind];
      if (!drawings) continue;
      const plant = { ...planted, size: planted.size * (GROWN[planted.kind] ?? 1) };
      const drawing = drawings[Math.floor(plant.which * drawings.length)];
      const name = plant.flipped ? mirrored(scene, drawing) : drawing;
      const shadow = castShadow(scene, name);
      this.shadows.push(scene.add.image(plant.x, plant.y, shadow.key)
        .setOrigin(shadow.footX, shadow.footY).setScale(plant.size).setAlpha(SHADOW_ALPHA).setDepth(-1e6 + 2));
      this.plants.push(scene.add.image(plant.x, plant.y, name).setOrigin(0.5, 1).setScale(plant.size).setDepth(plant.y));
      if (plant.inTheWay) {
        const hh = FOOT.hh * plant.size;
        this.feet.push({ x: plant.x, y: plant.y - hh, hw: FOOT.hw * plant.size, hh });
      }
    }
    blow(scene, this.plants, extent(map).width);
  }

  /** Thins whatever hides whoever stands at a spot, and fills the rest in again. */
  reveal(at: { x: number; y: number }, dt: number): void {
    const step = THINNING * dt;
    for (const plant of this.plants) {
      const top = plant.y - plant.displayHeight;
      const hides = plant.y > at.y && Math.abs(at.x - plant.x) < plant.displayWidth * 0.35
        && at.y > top && at.y - FIGURE < plant.y - plant.displayHeight * 0.25;
      const wanted = hides ? THINNED : 1;
      if (plant.alpha === wanted) continue;
      plant.setAlpha(wanted > plant.alpha ? Math.min(wanted, plant.alpha + step) : Math.max(wanted, plant.alpha - step));
    }
  }
}

/** Raises a map's buildings as blocks. Returns the ground each takes up, which nobody walks through. */
export function raiseBuildings(scene: Phaser.Scene, map: WorldMap): Footprint[] {
  const taken: Footprint[] = [];
  for (const b of map.buildings ?? []) {
    const { x, y } = middle(b.plot);
    const colour = (share: number) => {
      const part = (shift: number) => Math.round(((b.colour >> shift) & 0xff) * share) << shift;
      return part(16) | part(8) | part(0);
    };
    const g = scene.add.graphics().setDepth(y);
    // The ground it stands on is `deep` from front to back; seen from above and in front, half that.
    const back = b.deep / 2;
    g.fillStyle(colour(0.6), 1).fillRect(x - b.wide / 2, y - back - b.tall, b.wide, back);   // roof
    g.fillStyle(colour(1), 1).fillRect(x - b.wide / 2, y - b.tall, b.wide, b.tall);          // front wall
    g.fillStyle(0x000000, 0.25).fillEllipse(x, y + 2, b.wide + 14, 12);
    scene.add.text(x, y - b.tall - back - 4, b.name, {
      fontFamily: "'Silkscreen', ui-monospace, monospace", fontSize: '8px', color: '#f0e3c4',
      stroke: '#14110f', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(1e6).setResolution(2 * window.devicePixelRatio);
    taken.push({ x, y: y - back / 2, hw: b.wide / 2, hh: back / 2 });
  }
  return taken;
}

// A stake fence and an adobe wall, in the colours of the drawings they were designed from.
const WOOD = ['#6e4f33', '#7c5a3a', '#5f432b'];
const WOOD_DARK = '#3f2c1c', WOOD_LIGHT = '#94714b', RAWHIDE = '#a88b5e';
const WALL = { tall: 17, thick: 7, face: '#d9d3c2', shade: '#b9b2a0', top: '#ece7da', tile: '#b55b3c', tileDark: '#8f4329' };
const STAKE_W = 3, TALLEST = 23;

// A stake of each height and colour, drawn once: a post with a pale edge, a dark one and a cut top.
function stakeKey(scene: Phaser.Scene, tall: number, colour: number): string {
  const key = `stake:${tall}:${colour}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, STAKE_W, TALLEST)!;
    const g = tex.getContext(), top = TALLEST - tall;
    g.fillStyle = WOOD[colour];
    g.fillRect(0, top + 1, STAKE_W, tall - 1);
    g.fillRect(1, top, 1, 1);
    g.fillStyle = WOOD_LIGHT;
    g.fillRect(0, top + 1, 1, tall - 2);
    g.fillStyle = WOOD_DARK;
    g.fillRect(STAKE_W - 1, top + 2, 1, tall - 2);
    tex.refresh();
  }
  return key;
}

/**
 * Puts up a map's fences: stakes driven in one by one along the edge of a
 * fenced zone, lashed with two runs of rawhide, and low whitewashed walls
 * with a tiled coping. Each stands in front of whatever is further up the screen.
 */
export function raiseFences(scene: Phaser.Scene, map: WorldMap): void {
  const runs = fenceRuns(map);
  for (const stake of stakes(runs)) {
    scene.add.image(stake.x, stake.y, stakeKey(scene, stake.tall, Math.floor(stake.which * WOOD.length)))
      .setOrigin(0.5, 1).setDepth(stake.y);
  }
  for (const run of runs) {
    const level = run.y0 === run.y1;
    if (run.kind === 'stakes') {
      // The lashings: two lines along the fence, a little in front of the stakes they bind.
      const g = scene.add.graphics().setDepth(run.y1 + 0.5);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(RAWHIDE).color, 1);
      if (level) {
        g.fillRect(run.x0, run.y0 - 6, run.x1 - run.x0, 1);
        g.fillRect(run.x0, run.y0 - 12, run.x1 - run.x0, 1);
      }
      continue;
    }
    const g = scene.add.graphics().setDepth(run.y1);
    const fill = (hex: string) => g.fillStyle(Phaser.Display.Color.HexStringToColor(hex).color, 1);
    if (level) {
      // Seen from the front: its face, a darker foot, and the coping over it.
      const w = run.x1 - run.x0, top = run.y0 - WALL.tall;
      fill(WALL.face).fillRect(run.x0, top, w, WALL.tall);
      fill(WALL.shade).fillRect(run.x0, run.y0 - 3, w, 3);
      fill(WALL.tile).fillRect(run.x0 - 1, top - 3, w + 2, 4);
      fill(WALL.tileDark).fillRect(run.x0 - 1, top, w + 2, 1);
    } else {
      // Running away up the screen: its top is seen along its length, and its end at the near end.
      const x = run.x0 - Math.floor(WALL.thick / 2), top = run.y0 - WALL.tall;
      fill(WALL.tile).fillRect(x - 1, top - 3, WALL.thick + 2, run.y1 - run.y0 + 3);
      fill(WALL.tileDark).fillRect(x + WALL.thick, top - 3, 1, run.y1 - run.y0 + 3);
      fill(WALL.face).fillRect(x, run.y1 - WALL.tall, WALL.thick, WALL.tall);
      fill(WALL.shade).fillRect(x, run.y1 - 3, WALL.thick, 3);
      fill(WALL.tile).fillRect(x - 1, run.y1 - WALL.tall - 3, WALL.thick + 2, 4);
    }
  }
}
