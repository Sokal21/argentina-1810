// Everything measured and tuned for the machi's sprites: which sheet holds
// which animation, how each frame is anchored, and how one view turns into
// another. No engine code here, so it can be read by tools and tests alike.

/** The five drawn views. Sideways and diagonal ones are mirrored for the right. */
export type View = 'south' | 'down' | 'front' | 'back' | 'north';

export interface Sheet {
  /** Path under assets/. One row of FRAME x FRAME frames. */
  src: string;
  frames: number;
  /** Horizontal direction the art looks at; the other is drawn mirrored. 0 = never mirrored. */
  faces: -1 | 0 | 1;
  /** Leading frames left out of the loop because they repeat the standing pose. */
  skip: number;
  /**
   * X of the body's centre inside a frame, one value or one per frame. Frames
   * are centred on the whole figure including the drum, so the body sits at a
   * different x in each sheet and would slide on every change without this.
   */
  ax: number | number[];
  /**
   * Vertical shift in sprite pixels, positive is down. Her standing height is
   * the same everywhere, but each trot was generated with its own bounce, so
   * without this her head changes height with the view.
   */
  ay?: number;
  /** Hold this single frame (views with no idle sheet of their own). */
  still?: number;
  /**
   * Frames in the order they are shown, spread evenly over the action, for a
   * sheet that is not simply played from first to last.
   */
  order?: number[];
  /** Attack sheets: first frame after the light has left the branch. */
  cast?: number;
  /**
   * Attack sheets: where the light sits on the branch tip in the last lit
   * frame, as [x from the body's centre in the unmirrored art, height above
   * her feet]. The bolt starts there.
   */
  muzzle?: [number, number];
}

export interface Turn {
  sheet: string;
  frames: number[];
  fps?: number;
  /**
   * The turn reverses the direction of travel: she coasts to a stop and
   * picks up speed again while it plays instead of flipping her velocity.
   */
  pivot?: boolean;
}

export const FRAME = 94; // every sheet uses square frames of this size
export const FPS = 8;
export const TURN_FPS = 12;

export const SPEED = 70;        // sprite pixels per second, horizontally
export const ISO_Y = 0.5;       // vertical foreshortening of the ground plane
export const ATTACK_SLOW = 0.33; // share of her speed she keeps while attacking
export const ATTACK_TIME = 8 / FPS; // one full cast, in seconds
export const ATTACK_UNWIND = 1.5;   // speed of the backwards return when the key is released
export const IDLE_REST = 2.5;   // seconds standing still between two plays of the idle gesture
export const PIVOT_DRIFT = 0.5; // share of her speed she keeps when a pivot starts
export const PIVOT_STOP = 0.25; // fraction of a pivot spent slowing down before she moves the new way
export const COAST_GRACE = 0.15; // a stop shorter than this still counts as "was moving"
// With a free direction (the pointer) she is drawn in the nearest of her
// eight views. She keeps the current one this many radians past its sector's
// edge, so a direction resting on the boundary does not flicker.
export const SNAP_STICK = 0.14;
// Casting while walking more against the aim than with it, she backs away
// instead of striding forwards. This is how far against: the cosine of the
// angle between where she walks and where she aims.
export const RETREAT_BELOW = -0.3;

export const DASH_DISTANCE = 84;  // sprite pixels a dash covers along the ground
export const DASH_TIME = 0.32;    // seconds it lasts
export const DEATH_FPS = 8;        // frames per second of her death
export const DASH_COOLDOWN = 0.45; // seconds after one ends before the next can start

export const BOLT_SPEED = 230;  // sprite pixels per second along the ground
export const BOLT_RANGE = 260;  // ground distance it covers before fizzling out

export const SHEETS: Record<string, Sheet> = {
  idle_front:  { src: 'machi/idle/idle_sheet.png',   frames: 8, faces: -1, skip: 0, ax: 55.6 },
  trot_front:  { src: 'machi/trote/trote_sheet.png', frames: 8, faces: -1, skip: 1, ax: 55.6, ay: -2 },

  // Down diagonal. Its base pose is frame 3 of the south-to-front turn.
  idle_down:   { src: 'machi/diag_abajo/idle_sheet.png',  frames: 8, faces: -1, skip: 0, ax: 50.7 },
  trot_down:   { src: 'machi/diag_abajo/trote_sheet.png', frames: 8, faces: -1, skip: 0, ax: 51.8 },

  idle_back:   { src: 'machi/idle_espalda/idle_espalda_sheet.png',   frames: 8, faces: -1, skip: 0, ax: 50.6 },
  trot_back:   { src: 'machi/trote_espalda/trote_espalda_sheet.png', frames: 8, faces: -1, skip: 1, ax: 50.6, ay: 1 },

  // The straight views have no idle of their own: they hold the trot's standing frame.
  idle_south:  { src: 'machi/trote_abajo/trote_abajo_sheet.png',   frames: 8, faces: 0, skip: 0, ax: 48, still: 0 },
  trot_south:  { src: 'machi/trote_abajo/trote_abajo_sheet.png',   frames: 8, faces: 0, skip: 1, ax: 48, ay: 1 },
  idle_north:  { src: 'machi/trote_arriba/trote_arriba_sheet.png', frames: 8, faces: 0, skip: 0, ax: 45.1, still: 0 },
  trot_north:  { src: 'machi/trote_arriba/trote_arriba_sheet.png', frames: 8, faces: 0, skip: 1, ax: 45.1, ay: 1 },

  // Slow walk while casting with the branch.
  attack_front: { src: 'machi/ataque_caminata/ataque_caminata_sheet.png', frames: 8, faces: -1, skip: 0, ax: 55.6, ay: -1, cast: 6, muzzle: [-34, 52] },
  attack_down:  { src: 'machi/diag_abajo/ataque_sheet.png',               frames: 8, faces: -1, skip: 0, ax: 51.3, cast: 5, muzzle: [-36, 29] },
  attack_back:  { src: 'machi/ataque_caminata_espalda/sheet.png',         frames: 8, faces: -1, skip: 0, ax: 50.3, cast: 6, muzzle: [-40, 72] },
  attack_south: { src: 'machi/ataque_caminata_abajo/sheet.png',           frames: 8, faces: 0, skip: 0, ax: 47.8, ay: -1, cast: 6, muzzle: [3, 26] },
  attack_north: { src: 'machi/ataque_caminata_arriba/sheet.png',          frames: 8, faces: 0, skip: 0, ax: 45.1, ay: -1, cast: 6, muzzle: [-16, 86] },

  // The same casts with her feet planted, for attacking while standing still.
  // Built by tools/build_attack_standing.py from the walking sheets above.
  attack_still_front: { src: 'machi/ataque_caminata/ataque_de_pie_sheet.png', frames: 8, faces: -1, skip: 0, ax: 55.6, ay: -1, cast: 6, muzzle: [-34, 52] },
  attack_still_down:  { src: 'machi/diag_abajo/ataque_de_pie_sheet.png',               frames: 8, faces: -1, skip: 0, ax: 51.3, cast: 5, muzzle: [-36, 29] },
  attack_still_back:  { src: 'machi/ataque_caminata_espalda/de_pie_sheet.png',         frames: 8, faces: -1, skip: 0, ax: 50.3, cast: 6, muzzle: [-40, 72] },
  attack_still_south: { src: 'machi/ataque_caminata_abajo/de_pie_sheet.png',           frames: 8, faces: 0, skip: 0, ax: 47.8, ay: -1, cast: 6, muzzle: [3, 26] },
  attack_still_north: { src: 'machi/ataque_caminata_arriba/de_pie_sheet.png',          frames: 8, faces: 0, skip: 0, ax: 45.1, ay: -1, cast: 6, muzzle: [-16, 86] },

  turn_front_back:  { src: 'machi/giro_frente_espalda/giro_sheet.png', frames: 6, faces: -1, skip: 0,
                      ax: [55.8, 55.2, 54.7, 52.6, 50.7, 48.0] },
  turn_south_front: { src: 'machi/giro_abajo_frente/giro_sheet.png',   frames: 6, faces: -1, skip: 0,
                      ax: [48.0, 48.1, 48.1, 48.1, 48.9, 48.6] },
  // Built by tools/build_turn_north_south.py and build_turn_north_back.py, already centred on the body.
  turn_north_south: { src: 'machi/giro_arriba_abajo/giro_sheet_ajustado.png',   frames: 5, faces: 0, skip: 0, ax: 47, ay: -1 },
  turn_north_back:  { src: 'machi/giro_arriba_espalda/giro_sheet_ajustado.png', frames: 2, faces: -1, skip: 0, ax: 47, ay: 2 },
  // Built by tools/build_turn_side_flip.py: facing left -> facing right,
  // never mirrored, already centred on the body.
  flip_front: { src: 'machi/giro_lado_frente.png',   frames: 5, faces: 0, skip: 0, ax: 47 },
  flip_down:  { src: 'machi/giro_lado_diagonal.png', frames: 5, faces: 0, skip: 0, ax: 47 },
  flip_back:  { src: 'machi/giro_lado_espalda.png',  frames: 5, faces: 0, skip: 0, ax: 47 },
};

// Turning on the spot: the same turns generated with her feet planted, for
// when she follows the aim without walking.
Object.assign(SHEETS, {
  pivot_south_front: { src: 'machi/giros_de_pie/abajo_frente.png',   frames: 6, faces: -1, skip: 0,
                       ax: [48.0, 47.9, 47.9, 47.9, 48.2, 48.3] },
  pivot_front_back:  { src: 'machi/giros_de_pie/frente_espalda.png', frames: 6, faces: -1, skip: 0,
                       ax: [55.8, 55.3, 54.4, 51.6, 49.2, 47.3] },
  pivot_north_back:  { src: 'machi/giros_de_pie/arriba_espalda.png', frames: 6, faces: -1, skip: 0,
                       ax: [45.0, 45.7, 45.8, 46.2, 46.5, 46.6] },
  // Built by tools/build_turn_side_flip.py, already centred on the body.
  pivot_flip_front:  { src: 'machi/giros_de_pie/lado_frente.png',   frames: 5, faces: 0, skip: 0, ax: 47 },
  pivot_flip_down:   { src: 'machi/giros_de_pie/lado_diagonal.png', frames: 5, faces: 0, skip: 0, ax: 47 },
  pivot_flip_back:   { src: 'machi/giros_de_pie/lado_espalda.png',  frames: 5, faces: 0, skip: 0, ax: 47 },
} satisfies Record<string, Sheet>);

// Backing away while casting: aiming one way and walking the other. Each
// starts from its walking cast's numbers and overrides what was measured to
// differ: the light leaves the branch on another frame and from another spot.
const RETREATS: Record<View, Partial<Sheet> & { src: string }> = {
  front: { src: 'machi/ataque_retroceso/frente_pies_atras.png',   ax: 56,   cast: 6, muzzle: [-47, 52] },
  down:  { src: 'machi/ataque_retroceso/diagonal_pies_atras.png', ax: 52,   cast: 6, muzzle: [-40, 26] },
  back:  { src: 'machi/ataque_retroceso/espalda_pies_atras.png',  ax: 50.5, cast: 5, muzzle: [-37, 69] },
  south: { src: 'machi/ataque_retroceso/abajo_pies_atras.png',    ax: 47.8, cast: 6, muzzle: [1, 20] },
  north: { src: 'machi/ataque_retroceso/arriba_pies_atras.png',   ax: 45,   cast: 6, muzzle: [-14, 88] },
};
for (const [view, measured] of Object.entries(RETREATS)) {
  SHEETS[`retreat_${view}`] = { ...SHEETS[`attack_${view}`], ...measured };
}

// The dash: a sideways skid. The sheets go from standing down into the
// longest, lowest point of the slide and stop there, so they are played out
// fast, held, and partly back: she is at full stretch while she is quickest
// and has started to rise by the time she stops. The anchor stays on her
// standing spot, so the lunge reaches forward from it.
const DASH_ORDER = [1, 3, 4, 5, 5, 5, 4, 3, 2];
Object.assign(SHEETS, {
  dash_front: { src: 'machi/dash/frente.png',   frames: 6, faces: -1, skip: 0, ax: 55.6, order: DASH_ORDER },
  dash_down:  { src: 'machi/dash/diagonal.png', frames: 6, faces: -1, skip: 0, ax: 51.1, order: DASH_ORDER },
  dash_back:  { src: 'machi/dash/espalda.png',  frames: 6, faces: -1, skip: 0, ax: 50.4, order: DASH_ORDER },
  dash_south: { src: 'machi/dash/abajo.png',    frames: 6, faces: 0, skip: 0, ax: 48, order: DASH_ORDER },
  dash_north: { src: 'machi/dash/arriba.png',   frames: 6, faces: 0, skip: 0, ax: 45.8, order: DASH_ORDER },
  // The healing ritual, drawn facing the viewer only.
  heal: { src: 'machi/curacion/sheet.png', frames: 8, faces: 0, skip: 0, ax: 48 },
  // Her death: she drops what she holds, falls to her knees and then on her face.
  death_front: { src: 'machi/muerte/frente.png', frames: 12, faces: -1, skip: 0, ax: 55.6 },
} satisfies Record<string, Sheet>);

/**
 * Views in turning order, from facing the camera to facing away. A change
 * between two views that are not neighbours chains the turns in between.
 */
export const VIEW_ORDER: View[] = ['south', 'down', 'front', 'back', 'north'];

/**
 * In-between frames played when the view changes. Keys are `from>to`, or
 * `view:side>view:side` for a change of side within one view (-1 left, 1
 * right). The first and last frames of a turn sheet are left out because they
 * duplicate the views it connects; the opposite turn plays the same frames
 * backwards.
 */
export const TURNS: Record<string, Turn> = {
  // The down diagonal is frame 3 of this same turn sheet, so the turn splits
  // into the half before it and the half after it.
  'south>down': { sheet: 'turn_south_front', frames: [1, 2], fps: 14 },
  'down>south': { sheet: 'turn_south_front', frames: [2, 1], fps: 14 },
  'down>front': { sheet: 'turn_south_front', frames: [4, 5], fps: 14 },
  'front>down': { sheet: 'turn_south_front', frames: [5, 4], fps: 14 },
  'front>back': { sheet: 'turn_front_back', frames: [2, 3, 4] },
  'back>front': { sheet: 'turn_front_back', frames: [4, 3, 2] },
  'north>back': { sheet: 'turn_north_back', frames: [0, 1] },
  'back>north': { sheet: 'turn_north_back', frames: [1, 0] },
  'north>south': { sheet: 'turn_north_south', frames: [0, 1, 2, 3, 4], fps: 14, pivot: true },
  'south>north': { sheet: 'turn_north_south', frames: [4, 3, 2, 1, 0], fps: 14, pivot: true },
  'front:-1>front:1': { sheet: 'flip_front', frames: [0, 1, 2, 3, 4], fps: 14, pivot: true },
  'front:1>front:-1': { sheet: 'flip_front', frames: [4, 3, 2, 1, 0], fps: 14, pivot: true },
  'down:-1>down:1':   { sheet: 'flip_down',  frames: [0, 1, 2, 3, 4], fps: 14, pivot: true },
  'down:1>down:-1':   { sheet: 'flip_down',  frames: [4, 3, 2, 1, 0], fps: 14, pivot: true },
  'back:-1>back:1':   { sheet: 'flip_back',  frames: [0, 1, 2, 3, 4], fps: 14, pivot: true },
  'back:1>back:-1':   { sheet: 'flip_back',  frames: [4, 3, 2, 1, 0], fps: 14, pivot: true },
};

/**
 * The turns used while she stands. There is no dedicated about-turn: facing
 * the opposite way chains the turns through every view in between.
 */
export const STANDING_TURNS: Record<string, Turn> = {
  'south>down': { sheet: 'pivot_south_front', frames: [1, 2], fps: 14 },
  'down>south': { sheet: 'pivot_south_front', frames: [2, 1], fps: 14 },
  'down>front': { sheet: 'pivot_south_front', frames: [3, 4], fps: 14 },
  'front>down': { sheet: 'pivot_south_front', frames: [4, 3], fps: 14 },
  'front>back': { sheet: 'pivot_front_back', frames: [1, 2, 3, 4], fps: 14 },
  'back>front': { sheet: 'pivot_front_back', frames: [4, 3, 2, 1], fps: 14 },
  'north>back': { sheet: 'pivot_north_back', frames: [2, 4], fps: 14 },
  'back>north': { sheet: 'pivot_north_back', frames: [4, 2], fps: 14 },
  'front:-1>front:1': { sheet: 'pivot_flip_front', frames: [0, 1, 2, 3, 4], fps: 14 },
  'front:1>front:-1': { sheet: 'pivot_flip_front', frames: [4, 3, 2, 1, 0], fps: 14 },
  'down:-1>down:1':   { sheet: 'pivot_flip_down',  frames: [0, 1, 2, 3, 4], fps: 14 },
  'down:1>down:-1':   { sheet: 'pivot_flip_down',  frames: [4, 3, 2, 1, 0], fps: 14 },
  'back:-1>back:1':   { sheet: 'pivot_flip_back',  frames: [0, 1, 2, 3, 4], fps: 14 },
  'back:1>back:-1':   { sheet: 'pivot_flip_back',  frames: [4, 3, 2, 1, 0], fps: 14 },
};
