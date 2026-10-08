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
  /** Attack sheets: first frame after the light has left the branch. */
  cast?: number;
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
  attack_front: { src: 'machi/ataque_caminata/ataque_caminata_sheet.png', frames: 8, faces: -1, skip: 0, ax: 55.6, ay: -1, cast: 6 },
  attack_down:  { src: 'machi/diag_abajo/ataque_sheet.png',               frames: 8, faces: -1, skip: 0, ax: 51.3, cast: 5 },
  attack_back:  { src: 'machi/ataque_caminata_espalda/sheet.png',         frames: 8, faces: -1, skip: 0, ax: 50.3, cast: 6 },
  attack_south: { src: 'machi/ataque_caminata_abajo/sheet.png',           frames: 8, faces: 0, skip: 0, ax: 47.8, ay: -1, cast: 6 },
  attack_north: { src: 'machi/ataque_caminata_arriba/sheet.png',          frames: 8, faces: 0, skip: 0, ax: 45.1, ay: -1, cast: 6 },

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
