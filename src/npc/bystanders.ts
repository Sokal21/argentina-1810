// Those of El vado de las Vizcachas who are not talked to: each stands in
// their place and says the one thing they have to say to whoever comes
// near. Who they are is set down in docs/historia/personajes.md.

export interface Bystander {
  /** The name they are known by in the game's own workings. */
  id: string;
  name: string;
  /** What they say, as things stand when the story begins. */
  says: string;
  /**
   * What they say instead once the story has turned, by what has happened.
   * Nothing reads these yet: the story's facts come with a later stage.
   */
  later?: Record<string, string>;
  /** Their drawing on the ground, once they have one. */
  sprite?: string;
}

export const BYSTANDERS: Record<string, Bystander> = {
  remedios: {
    id: 'remedios',
    name: 'Doña Remedios',
    says: 'Me quemaron la casa con el telar adentro.',
    later: { emboscada: 'Ahora sí puedo dormir.', rebato: '…' },
    sprite: 'gente/remedios.png',
  },
  ciriaco: {
    id: 'ciriaco',
    name: 'Ño Ciriaco',
    says: '¿Y el godo ese? ¿Cuándo lo traés?',
    sprite: 'gente/ciriaco.png',
  },
  paisano: {
    id: 'paisano',
    name: 'Un paisano',
    says: 'Dicen que vuelven. Que esta vez no dejan ni los perros.',
    later: { fama_buena: 'Vaya con Dios, soldado.', fama_mala: 'Mejor siga de largo.' },
    sprite: 'gente/paisano.png',
  },
  chacarero: {
    id: 'chacarero',
    name: 'Un chacarero',
    says: 'Tres días llevo sin arrimarme al maíz. Están ahí nomás.',
    later: { fama_buena: 'Lo que haga falta, pida.', fama_mala: 'Acá no se le debe nada.' },
    sprite: 'gente/chacarero.png',
  },
  benito: {
    id: 'benito',
    name: 'Fray Benito',
    says: 'Despacio, que duermen.',
    later: { campana_fundida: '¿Con qué vamos a llamar a misa?' },
    sprite: 'gente/benito.png',
  },
  alferez: {
    id: 'alferez',
    name: 'El alférez herido',
    says: 'Tío… dígale a mi madre.',
    sprite: 'gente/alferez.png',
  },
  malherido: {
    id: 'malherido',
    name: 'Un realista malherido',
    says: 'Agua, por caridad.',
    sprite: 'gente/malherido.png',
  },
};
