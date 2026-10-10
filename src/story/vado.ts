import type { Quest } from './story';

// The missions of El vado de las Vizcachas, as docs/historia/misiones.md
// sets them down. For now the first two: the hook.
//
// The happenings they are made of:
//   empieza          the game has begun
//   en:LUGAR         the hero has come to a named place of the map
//   zona:LETRA       the hero has set foot in a zone
//   hablo:QUIEN      a first talk with someone is over
//   acepto:QUE       the hero has taken on something asked of him
//   tiene:COSA       the hero has picked something up
//   sabe:DATO        the hero has been told something
//   cerro:QUIEN      someone has had enough of the hero
//   hecha:MISION     a mission is done

export const VADO: Quest[] = [
  {
    id: 'posada',
    name: 'La posada',
    opens: ['empieza'],
    steps: [
      { says: 'Llegá a la posada.', when: ['en:La posada', 'hablo:braulio'] },
      { says: 'Hablá con don Braulio.', when: ['hablo:braulio'] },
    ],
  },
  {
    id: 'hijo',
    name: 'El hijo perdido',
    // Don Braulio asks, and it is taken on by telling him so. But the map is open: whoever
    // he has shut his door on can still come upon the boy's poncho and follow it.
    opens: ['acepto:hijo', 'tiene:poncho'],
    steps: [
      { says: 'Cruzá las chacras y el cardal hasta el campo de batalla.', when: ['zona:B', 'tiene:poncho'] },
      { says: 'Buscá el poncho de Tobías, junto al cañón volcado.', when: ['tiene:poncho'] },
      { says: 'Seguí el rastro de sangre hacia el este, hasta la senda.', when: ['zona:S', 'en:El pie de la senda'] },
    ],
    leaves: ['sabe:rastro'],
  },
];

/** What the hero is told he knows, by the happening that says so. */
export const FACTS: Record<string, string> = {
  'sabe:rastro': 'El rastro de sangre va hacia la capilla.',
};
