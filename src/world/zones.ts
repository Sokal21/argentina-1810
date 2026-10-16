// A map is one stretch of country, walked from end to end without a break.
// It is laid out as a coarse grid of plots, and each plot belongs to a zone:
// the safe place at its heart, and the wilder zones that spread out from it.
// The ground is drawn foreshortened, so a plot is twice as wide as it is tall.

export const PLOT_W = 128, PLOT_H = 64; // one plot, in world pixels

/** Marks a plot nobody walks through: country too thick to cross. */
export const WILD = '.';

export interface Zone {
  name: string;
  /** Nothing hunts here. */
  safe?: boolean;
  /** In open country: what grows thick along its edge and closes it, by name; several are mixed. */
  edge?: string[];
  /** And what stands here and there on its own ground: the chance of each in a plot. */
  scatter?: Record<string, number>;
  /** What people have put up along its edge, where it meets ground nobody can cross. */
  fence?: 'stakes' | 'wall';
  /** How many soldiers hold it, */
  foes?: number;
  /** and of what kinds, gone through in order man by man; all fusiliers, if unsaid. */
  mix?: string[];
  /**
   * Water: `ford` is shallow water one wades through, `marsh` wet ground
   * with standing pools, and `shore` dry ground beside water, which makes
   * the ground nobody can cross next to it deep water.
   */
  water?: 'ford' | 'marsh' | 'shore';
}

/** Something to find, and the plot it is in: column, then row. */
export interface Objective {
  name: string;
  plot: [number, number];
  /** What stands there and makes the place, by the name of the plant: the one thing on a map put where it is. */
  stands?: string;
}

/** Somewhere on a map where something can be done, once: a bell to bring down, a fire to build. */
export interface Spot {
  id: string;
  /** What the place is called once the thing is done. */
  name: string;
  plot: [number, number];
  /** What is done there, as the sign over it says: "armar la fogata". */
  does: string;
  /** It can be done only once this has happened in the story; */
  given?: string;
  /** and no longer once this has; */
  until?: string;
  /** and only while nobody who holds the zone it is in is left standing. */
  guarded?: boolean;
  /** What doing it is, to the story. */
  happening: string;
  /**
   * Doing it is making a stand there: enemies come in waves from a plot, so many at a time,
   * and holding out against the last of them is a happening of its own. Whoever falls can
   * make the stand again.
   */
  stand?: {
    from: [number, number];
    waves: number[];
    won: string;
    /** Fewer come, if this has happened: what was done beforehand counts. */
    eased?: { given: string; waves: number[] };
    /** Whoever commands them comes last, alone, and takes this much to bring down. */
    leader?: { name: string; kind: string };
  };
  /** Shown to the player when it is done. */
  note?: string;
  /** Its drawing once it is done. */
  sprite?: string;
}

/** Something to be brought somewhere: it waits where it is, is led off, and has to arrive whole. */
export interface Charge {
  id: string;
  name: string;
  sprite: string;
  /** Where it waits, and where it has to be brought. */
  from: [number, number];
  to: [number, number];
  /** What leading it off is, as the sign over it says: "llevar la carreta". */
  does: string;
  /** It is there to be led off only once this has happened in the story. */
  given?: string;
  /** What its arriving is, to the story. Its being led off is `lleva:ID`. */
  happening: string;
  /** Blows it takes before it is lost, and the pixels a second it moves at: slower than the hero walks. */
  life: number;
  pace: number;
  /** Whoever of those standing on the map it is: once there is reason to take them they stop standing about, and wait to go. */
  who?: string;
  /** Shown to the player when it arrives. */
  note?: string;
  /** It goes to where it has to be brought by itself, along the road, once set off: the hero guards it, not leads it. */
  drives?: boolean;
  /** Which way its drawing heads across the screen: right unless said. */
  faces?: 'left' | 'right';
  /** It is never turned round: always shown heading the way it was drawn (a cart whose road runs one way). */
  fixed?: boolean;
  /** How many times its drawing's size it is shown. */
  scale?: number;
  /**
   * Someone who walks rather than slides: their walk, drawn heading right, as a row of square
   * frames: the side of one, how many, how many a second, and where the feet are in one.
   */
  walk?: { sheet: string; size: number; frames: number; rate: number; ax: number; up: number };
  /** What it does standing still, in the same kind of sheet as its walk: waiting to set off, told to wait, or arrived. */
  idle?: { sheet: string; size: number; frames: number; rate: number; ax: number; up: number };
  /** The same seen from the side, for while it goes more across the screen than down it: drawn heading as the main one. */
  side?: { sprite: string; walk?: { sheet: string; size: number; frames: number; rate: number; ax: number; up: number }; idle?: { sheet: string; size: number; frames: number; rate: number; ax: number; up: number } };
}

/** Something built, and the plot it stands in: for now a plain block of its size, until it is drawn. */
export interface Building {
  name: string;
  /** The plot the middle of its front foot is in: column, then row. */
  plot: [number, number];
  /** Across, back and up, in world pixels. */
  wide: number;
  deep: number;
  tall: number;
  colour: number;
  /** Whose it is, for one that can be gone into: they may shut its door on the hero. */
  side?: 'pueblo' | 'frailes';
  /** Its drawing, which stands on the plot by the middle of its foot; without one it is a block. */
  sprite?: string;
  /** In the drawing's own pixels: the corners of the ground it stands on, and where its door is. */
  base?: [number, number][];
  door?: [number, number];
  /** Where in the drawing embers still glow, for something burnt: the box of each patch. */
  embers?: [number, number, number, number][];
  /**
   * Its inside, for one that can be gone into: the drawing of the room, how many times its size
   * it is shown, and in its own pixels the corners of its floor, the door, and where one arrives.
   */
  inside?: {
    sprite: string; scale?: number; floor: [number, number][]; door: [number, number]; arrive: [number, number];
    /** What stands in the room and hides whoever is behind it, nor can be walked through: the outline of each in the drawing. */
    furniture?: [number, number][][];
    /**
     * What hides whoever is behind it but is walked round as part of something larger: a row of
     * benches is gone round as one, not threaded through. And the ground taken up by each such
     * larger thing, which is only kept off.
     */
    screens?: [number, number][][];
    blocks?: [number, number][][];
    /** Fires burning in it: the box of each one's flames in the drawing; and how far their light carries, in world pixels. */
    fires?: [number, number, number, number][];
    light?: number;
  };
}

export interface WorldMap {
  name: string;
  /** The colours its ground is patched from, the same all over it. */
  ground: string[];
  /** Each zone, by the letter that marks its plots. */
  zones: Record<string, Zone>;
  /** Rows of plots, north to south. */
  plots: string[];
  /** The plot the hero arrives in: column, then row. */
  start: [number, number];
  objectives: Objective[];
  /** Open country: no forest is planted on it, and what cannot be crossed is only shaded. */
  bare?: boolean;
  buildings?: Building[];
  /** Who can be talked to, by the name the game knows them under, and the plot each stands in. */
  people?: {
    who: string; plot: [number, number]; /** Which way they look across the screen; right if unsaid. */ faces?: 'left' | 'right';
    /** Someone who is indoors: the building, and where they stand in its room's drawing. */
    inside?: { building: string; at: [number, number] };
  }[];
  /** What lies about to be picked up, by the name the story knows it under, and the plot each lies in. */
  things?: { what: string; plot: [number, number]; /** It lies there only once this has happened in the story. */ given?: string }[];
  /** Places where something can be done, once. */
  spots?: Spot[];
  /** What has to be brought from one place to another, with the hero leading it. */
  charges?: Charge[];
  /** Trails left along the ground: each from a plot to the nearest plot of a zone. */
  trails?: { from: [number, number]; to: string }[];
  /** Rows of plots a stream runs along, first and last: whatever of them nobody can cross is deep water. */
  stream?: [number, number];
}

/** How far the map reaches, in world pixels. */
export function extent(map: WorldMap): { width: number; height: number } {
  return { width: (map.plots[0]?.length ?? 0) * PLOT_W, height: map.plots.length * PLOT_H };
}

/** The middle of a plot, in world pixels. */
export function middle([col, row]: [number, number]): { x: number; y: number } {
  return { x: (col + 0.5) * PLOT_W, y: (row + 0.5) * PLOT_H };
}

/** The letter of the zone a plot belongs to, if anyone can stand there. */
export function letterAt(map: WorldMap, col: number, row: number): string | undefined {
  const letter = map.plots[row]?.[col];
  return letter === undefined || letter === WILD ? undefined : letter;
}

/** The zone a spot on the ground is in, if anyone can stand there. */
export function zoneAt(map: WorldMap, x: number, y: number): Zone | undefined {
  const letter = letterAt(map, Math.floor(x / PLOT_W), Math.floor(y / PLOT_H));
  return letter === undefined ? undefined : map.zones[letter];
}

/**
 * Where someone walking from one spot to another ends up. Country too thick
 * to cross stops them, and they slide along its edge rather than stick to it.
 */
export function walk(map: WorldMap, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const open = (x: number, y: number) => zoneAt(map, x, y) !== undefined;
  // Someone already off the ground is let back onto it, wherever they go.
  if (open(to.x, to.y) || !open(from.x, from.y)) return { x: to.x, y: to.y };
  if (open(to.x, from.y)) return { x: to.x, y: from.y };
  if (open(from.x, to.y)) return { x: from.x, y: to.y };
  return { x: from.x, y: from.y };
}

/** The letters of the zones that can be walked to from where the hero arrives. */
export function reachable(map: WorldMap): Set<string> {
  const seen = new Set<string>(), letters = new Set<string>();
  const ahead: [number, number][] = [map.start];
  for (let plot = ahead.pop(); plot; plot = ahead.pop()) {
    const [col, row] = plot, letter = letterAt(map, col, row);
    if (letter === undefined || seen.has(`${col},${row}`)) continue;
    seen.add(`${col},${row}`);
    letters.add(letter);
    ahead.push([col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]);
  }
  return letters;
}

/** What is wrong with a map as it is drawn; nothing, if it holds together. */
export function faults(map: WorldMap): string[] {
  const found: string[] = [];
  const width = map.plots[0]?.length ?? 0;
  map.plots.forEach((line, row) => {
    if (line.length !== width) found.push(`row ${row} is ${line.length} plots wide, not ${width}`);
    for (const letter of line) {
      if (letter !== WILD && !map.zones[letter]) found.push(`row ${row} has a plot of no zone: ${letter}`);
    }
  });
  const home = letterAt(map, ...map.start);
  if (home === undefined || !map.zones[home]?.safe) found.push('the hero does not arrive somewhere safe');
  const walked = reachable(map);
  for (const [letter, zone] of Object.entries(map.zones)) {
    if (!walked.has(letter)) found.push(`${zone.name} cannot be walked to`);
  }
  for (const { name, plot } of map.objectives) {
    if (letterAt(map, ...plot) === undefined) found.push(`${name} is where nobody can stand`);
  }
  for (const { who, plot } of map.people ?? []) {
    if (letterAt(map, ...plot) === undefined) found.push(`${who} is where nobody can stand`);
  }
  for (const { what, plot } of map.things ?? []) {
    if (letterAt(map, ...plot) === undefined) found.push(`${what} lies where nobody can reach it`);
  }
  for (const { id, plot } of map.spots ?? []) {
    if (letterAt(map, ...plot) === undefined) found.push(`${id} is where nobody can stand`);
  }
  for (const { id, from, to } of map.charges ?? []) {
    if (letterAt(map, ...from) === undefined || letterAt(map, ...to) === undefined) found.push(`${id} begins or ends where nobody can stand`);
  }
  return found;
}
