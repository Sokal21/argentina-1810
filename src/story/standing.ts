// How the hero stands with the two sides that can be won, the village and the friars, and the one
// reckoning of what kind of man he has been, his fame. None of it is kept: it is worked out from
// what has happened in the story, so it is always what the story says and comes back with a game
// taken up. What moves each is set down in docs/historia/ (misiones.md, personajes.md).

export type Side = 'pueblo' | 'frailes';
export interface Standing { pueblo: number; frailes: number; fama: number }

/** What each thing that happens does to how he stands: with the village, with the friars, and his fame. */
export const MOVES: Record<string, Partial<Standing>> = {
  // Bringing the boy back to his father.
  'hecha:hijo': { pueblo: 2, fama: 1 },
  'dijo:noticia': { pueblo: 1 },
  // The deserter: sheltered, or handed over to be hanged.
  'hecha:amparar': { frailes: 2, pueblo: -1, fama: 1 },
  'hecha:entregar': { pueblo: 3, frailes: -3, fama: -2 },
  // The bell: melted down for bullets, or kept to ring.
  'hecha:campana': { pueblo: 2, frailes: -2 },
  'hecha:fogatas': { frailes: 2, pueblo: -1 },
  // The wounded: taken as hostages and bait, or brought back alive.
  'hecha:rehenes': { pueblo: 2, frailes: -3, fama: -2 },
  'hecha:escolta': { frailes: 2, fama: 1 },
  // Those who have had enough of him do not keep it to themselves.
  'cerro:braulio': { pueblo: -2, fama: -1 },
  'cerro:anselmo': { frailes: -2, fama: -1 },
  'cerro:tobias': { pueblo: -1 },
  // The endings settle it.
  'final:emboscada': { pueblo: 2, frailes: -3 },
  'final:rebato': { frailes: 2, pueblo: -3, fama: 1 },
};

/** The most and least any of the three can be. */
export const LIMIT = 6;

/** How he stands, from everything that has happened. */
export function standing(happened: Iterable<string>): Standing {
  const s: Standing = { pueblo: 0, frailes: 0, fama: 0 };
  for (const h of happened) {
    const m = MOVES[h];
    if (!m) continue;
    s.pueblo += m.pueblo ?? 0;
    s.frailes += m.frailes ?? 0;
    s.fama += m.fama ?? 0;
  }
  const clamp = (n: number) => Math.max(-LIMIT, Math.min(LIMIT, n));
  return { pueblo: clamp(s.pueblo), frailes: clamp(s.frailes), fama: clamp(s.fama) };
}

/** How a side looks on him, in a few words. */
export function feeling(n: number): string {
  if (n >= 5) return 'te debe todo';
  if (n >= 3) return 'te tiene confianza';
  if (n >= 1) return 'te mira bien';
  if (n > -1) return 'no te conoce';
  if (n > -3) return 'desconfía';
  if (n > -5) return 'te tiene rabia';
  return 'no quiere verte';
}

/** What is said of him, in a few words. */
export function renown(n: number): string {
  if (n >= 3) return 'hombre de palabra';
  if (n >= 1) return 'se habla bien de vos';
  if (n > -1) return 'nadie dice nada';
  if (n > -3) return 'se habla mal de vos';
  return 'un hombre sin palabra';
}

/** How much more or less trust someone of a side starts with, from how the side stands with him. */
export function leaning(n: number): number {
  return Math.max(-2, Math.min(2, Math.round(n / 2)));
}

/** What things cost from someone of a side, as a share of their price: dearer to whoever they dislike. */
export function markup(n: number): number {
  return Math.max(0.75, Math.min(1.5, 1 - n * 0.06));
}

/** Whether a side has shut its door on him. */
export function shut(side: Side, s: Standing, ended: (h: string) => boolean): boolean {
  if (side === 'pueblo') return s.pueblo <= -5 || ended('final:rebato');
  return s.frailes <= -5 || ended('final:emboscada');
}

/** What a change of standing is told as, on the board; nothing for none. */
export function told(before: Standing, after: Standing): string[] {
  const out: string[] = [];
  const say = (d: number, up: string, down: string) => { if (d > 0) out.push(up); else if (d < 0) out.push(down); };
  say(after.pueblo - before.pueblo, 'El pueblo te mira mejor.', 'El pueblo te mira peor.');
  say(after.frailes - before.frailes, 'Los frailes te miran mejor.', 'Los frailes te miran peor.');
  say(after.fama - before.fama, 'Se habla mejor de vos.', 'Se habla peor de vos.');
  return out;
}
