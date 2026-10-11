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
//   dijo:QUE         the hero has told someone something they needed to hear
//   armada:LOMA      a signal fire has been built on one of the rises
//   lleva:QUE        something to be brought somewhere has been led off; its arriving has a name of its own
//   planta:LUGAR     the hero has made a stand somewhere; aguanto:LUGAR, he has held it
//   final:CUAL       the story has ended, and how
//   hecha:MISION     a mission is done
//
// Coming to a place (en:, zona:) is not kept: it counts for the step waiting on it and no more.

export const VADO: Quest[] = [
  {
    id: 'posada',
    name: 'La posada',
    xp: 40,
    gold: 10,
    opens: ['empieza'],
    steps: [
      { says: 'Llegá a la posada.', when: ['en:La posada', 'hablo:braulio'] },
      { says: 'Hablá con don Braulio.', when: ['hablo:braulio'] },
    ],
  },
  {
    id: 'hijo',
    name: 'El hijo perdido',
    xp: 120,
    gold: 40,
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
  {
    id: 'capilla',
    name: 'La capilla',
    xp: 140,
    gold: 30,
    // Nobody gives it: it is following the trail.
    opens: ['hecha:hijo'],
    steps: [
      { says: 'Seguí hacia el este, por el bañado o por el camino real, hasta el monte de talas.', when: ['zona:T', 'zona:S', 'zona:K'] },
      { says: 'Subí por la senda hasta la capilla.', when: ['zona:K', 'hablo:anselmo', 'hablo:tobias'] },
      { says: 'Hablá con fray Anselmo.', when: ['hablo:anselmo', 'hablo:tobias'] },
      { says: 'Buscá a Tobías entre los heridos y hablá con él.', when: ['hablo:tobias'] },
    ],
    // He has seen the boy with his own eyes, whatever the friar chose to say.
    leaves: ['sabe:tobias'],
  },
  {
    id: 'noticia',
    name: 'La noticia',
    xp: 100,
    gold: 30,
    opens: ['hecha:capilla'],
    steps: [
      { says: 'Volvé al pueblo.', when: ['zona:P', 'dijo:noticia'] },
      { says: 'Decile a don Braulio que su hijo vive. Pensá bien qué más le decís.', when: ['dijo:noticia'] },
    ],
  },
  {
    id: 'amparar',
    name: 'Amparar a Mateo',
    xp: 160,
    gold: 20,
    // Fray Anselmo asks it, once the father has his news: speak to the man before deciding anything.
    opens: ['acepto:amparar'],
    steps: [
      { says: 'Hablá con Mateo, en la sacristía, hasta que te cuente lo que sabe de la columna.', all: ['sabe:columna', 'sabe:capitan'] },
      { says: 'Volvé al pueblo y decile a don Braulio que no se lo vas a entregar.', when: ['dijo:no'] },
    ],
  },
  {
    id: 'rehenes',
    name: 'Los rehenes',
    xp: 160,
    gold: 60,
    // The village asks it, through don Braulio: the friars mean to take the wounded out by night.
    opens: ['acepto:rehenes'],
    steps: [
      { says: 'Averiguá en la capilla por dónde van a sacar las carretas.', when: ['sabe:carretas'] },
      { says: 'Volvé al pueblo y decíselo a don Braulio.', when: ['dijo:carretas'] },
    ],
  },
  {
    id: 'entregar',
    name: 'Entregar al godo',
    xp: 160,
    gold: 80,
    // The village asks it, through don Braulio: the deserter, alive.
    opens: ['acepto:entregar'],
    steps: [
      { says: 'Andá a la capilla y sacá a Mateo de la sacristía.', when: ['lleva:mateo'] },
      { says: 'Llevalo vivo, por el campo, hasta el pozo del pueblo.', when: ['entregado:mateo'] },
    ],
  },
  {
    id: 'campana',
    name: 'La campana a la fragua',
    xp: 220,
    gold: 80,
    // Without lead there is no ambush, and there is only one bronze in the country.
    opens: ['acepto:campana'],
    steps: [
      { says: 'Andá a la capilla y bajá la campana del campanario.', when: ['bajada:campana'] },
      { says: 'Llevá la carreta, cruzando el campo, hasta la fragua del pueblo.', when: ['llego:campana'] },
    ],
    leaves: ['tiene:balas'],
  },
  {
    id: 'escolta',
    name: 'La escolta',
    xp: 220,
    gold: 30,
    // Fray Anselmo asks it: the wounded, to the rise over the ford, before it is light.
    opens: ['acepto:escolta'],
    steps: [
      { says: 'Sacá las carretas de atrás de la capilla.', when: ['lleva:carretas'] },
      { says: 'Llevalas, bajando la senda y cruzando el campo, hasta la Loma del Medio.', when: ['llego:carretas'] },
    ],
  },
  {
    id: 'vado',
    name: 'Solo en el vado',
    xp: 400,
    // The last way out, that depends on nobody: he plants himself in the ford and holds it.
    opens: ['planta:vado'],
    steps: [
      { says: 'Aguantá en el vado. Que la columna no pase.', when: ['aguanto:vado'] },
    ],
    leaves: ['final:solo'],
  },
  {
    id: 'fogatas',
    name: 'Las tres fogatas',
    xp: 220,
    gold: 40,
    // Fray Anselmo asks: the bell will say the country has risen, and someone has to see it.
    opens: ['acepto:fogatas'],
    steps: [
      { says: 'Juntá leña y yesca junto a la capilla.', when: ['tiene:lena'] },
      { says: 'En cada una de las tres lomas, vencé a la guardia y armá la fogata.', all: ['armada:este', 'armada:medio', 'armada:oeste'] },
    ],
  },
];

/** What the hero is told he knows, by the happening that says so. */
export const FACTS: Record<string, string> = {
  'sabe:rastro': 'El rastro de sangre va hacia la capilla.',
  'sabe:tobias': 'Tobías vive. Está en la capilla, con una pierna rota.',
  'sabe:carretas': 'Las carretas de los heridos salen de noche por detrás de la capilla, hacia la senda.',
  'sabe:mateo': 'A Tobías lo cargó hasta la capilla Mateo, un soldado del rey que desertó.',
};
