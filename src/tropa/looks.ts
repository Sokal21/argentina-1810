import type { KindName } from './brain';

// How each of the king's other men looks: a sheet for each thing a kind does, drawn from one
// side only and turned over to face the other way.

export interface Sheet { src: string; size: number; frames: number; /** Where his feet are across a frame. */ ax: number; /** Frames a second, for one that loops. */ fps?: number }
export interface Look {
  /** Marching, striking, shooting, shouting and falling; whatever a kind does not do it has no sheet for. */
  walk?: Sheet;
  blow?: Sheet;
  aim?: Sheet;
  rally?: Sheet;
  death: Sheet;
  /** How many times its drawn size it is shown, and how tall it then stands, for the bar over it and the part of it a spell can touch. */
  scale: number;
  tall: number;
}

const sheet = (kind: string, name: string, size: number, frames: number, ax: number, fps?: number): Sheet => ({ src: `tropa/${kind}_${name}.png`, size, frames, ax, fps });

/** How each kind looks. The numbers are read off the sheets by `tools/build_tropa.py`. */
export const LOOKS: Record<KindName, Look> = {
  sableador: { walk: sheet('sableador', 'corre', 88, 8, 40, 12), blow: sheet('sableador', 'tajo', 88, 8, 40), death: sheet('sableador', 'muerte', 88, 10, 40), scale: 1.2, tall: 90 },
  // His basket of earth is part of his drawing: his feet are well to the left of its middle.
  tirador: { aim: sheet('tirador', 'tiro', 86, 8, 28), death: sheet('tirador', 'muerte', 86, 10, 28), scale: 1, tall: 70 },
  sargento: { walk: sheet('sargento', 'marcha', 90, 8, 40, 7), blow: sheet('sargento', 'golpe', 90, 8, 40), rally: sheet('sargento', 'grito', 90, 6, 40), death: sheet('sargento', 'muerte', 90, 10, 40), scale: 1.33, tall: 104 },
  capitan: { walk: sheet('capitan', 'marcha', 90, 8, 38, 8), blow: sheet('capitan', 'estocada', 90, 8, 38), aim: sheet('capitan', 'tiro', 90, 6, 38), death: sheet('capitan', 'muerte', 90, 10, 38), scale: 1.36, tall: 106 },
};
