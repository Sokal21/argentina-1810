import type { Script } from './script';
import { ANSELMO } from './scripts/anselmo';
import { BRAULIO } from './scripts/braulio';
import { MATEO } from './scripts/mateo';
import { TOBIAS } from './scripts/tobias';

/** What each of them can be told by choosing, by the name the game knows them under. */
export const SCRIPTS: Record<string, Script> = { anselmo: ANSELMO, braulio: BRAULIO, mateo: MATEO, tobias: TOBIAS };
