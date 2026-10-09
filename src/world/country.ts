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

// The pieces a fence and a wall are chained from, by the name each is loaded under.
const POSTS = ['cerca_palo_0', 'cerca_palo_1', 'cerca_palo_2', 'cerca_palo_3', 'cerca_palo_4', 'cerca_palo_5'];
const PIECES = ['cerca_frente', 'tapia_frente', 'tapia_arriba', 'tapia_punta', ...POSTS];

/** Fetches the fences' and walls' drawings; to be called while a scene is loading. */
export function loadFences(scene: Phaser.Scene): void {
  for (const name of PIECES) scene.load.image(name, `campo/${name}.png`);
}

/**
 * Puts up a map's fences and walls from their drawn pieces. A stretch seen
 * from the front is one drawing repeated along it. One that runs away up the
 * screen is, for a fence, its posts stood one behind another, and for a
 * wall, its coping seen from above with the end of the wall at the near end.
 * Each stands in front of whatever is further up the screen.
 */
export function raiseFences(scene: Phaser.Scene, map: WorldMap): void {
  const runs = fenceRuns(map);
  const size = (name: string) => scene.textures.get(name).getSourceImage() as HTMLImageElement;
  for (const post of stakes(runs)) {
    scene.add.image(post.x, post.y, POSTS[Math.floor(post.which * POSTS.length)]).setOrigin(0.5, 1).setDepth(post.y);
  }
  for (const run of runs) {
    const level = run.y0 === run.y1;
    if (level) {
      const name = run.kind === 'stakes' ? 'cerca_frente' : 'tapia_frente';
      scene.add.tileSprite(run.x0, run.y0, run.x1 - run.x0, size(name).height, name)
        // Begun wherever the stretch begins along the ground, so stretches side by side join.
        .setTilePosition(run.x0, 0).setOrigin(0, 1).setDepth(run.y0);
    } else if (run.kind === 'wall') {
      const top = size('tapia_arriba'), end = size('tapia_punta');
      const up = end.height - 6;   // how high above the ground the coping lies
      scene.add.tileSprite(run.x0, run.y0 - up, top.width, run.y1 - run.y0, 'tapia_arriba')
        .setTilePosition(0, run.y0).setOrigin(0.5, 0).setDepth(run.y1 - 1);
      scene.add.image(run.x0, run.y1, 'tapia_punta').setOrigin(0.5, 1).setDepth(run.y1);
    }
  }
}
