// What lies about the map to be picked up, by the name the story knows it under.

export interface Thing {
  name: string;
  /** Its drawing on the ground. */
  sprite: string;
  /** Shown to the player on picking it up. */
  note: string;
}

export const THINGS: Record<string, Thing> = {
  poncho: {
    name: 'Poncho de Tobías',
    sprite: 'cosas/poncho.png',
    note: 'Un poncho de chico, con sangre. Es el de Tobías. Hay un rastro que sigue hacia el este.',
  },
};
