import type { WorldMap } from '../zones';

// Inti's first map. The camp sits in the middle of the forest; the dark
// forest lies off to the north-west and the spirits' forest to the north-east,
// each reached through a narrow neck of trees.
export const bosquePatagonico: WorldMap = {
  name: 'Bosque patagónico',
  zones: {
    C: { name: 'Campamento mapuche', safe: true, ground: ['#4a4130', '#463d2d', '#4e4533', '#43392a', '#514836'] },
    B: { name: 'Bosque', ground: ['#303b27', '#2e3926', '#333e29', '#2c3624', '#35402a'] },
    O: { name: 'Bosque oscuro', ground: ['#1c241f', '#1a221d', '#1f2722', '#18201b', '#212a24'] },
    E: { name: 'Bosque de los espíritus', ground: ['#243a3c', '#22373a', '#273e40', '#203436', '#2a4244'] },
  },
  plots: [
    '................................',
    '....OOOOOO......................',
    '...OOOOOOOOO..........EEEEE.....',
    '..OOOOOOOOOOO........EEEEEEEE...',
    '..OOOOOO.OOOO.......EEEEEEEEEE..',
    '...OOOO..OOOOO......EEEE..EEEE..',
    '....OOOOOOOOO........EEEEEEEEE..',
    '.....OOOOOO.....BBB...EEEEEEE...',
    '......OOO.....BBBBBBB...EEEE....',
    '......BB....BBBBBBBBBBB..EE.....',
    '.....BBBB..BBBBBCCCBBBBBBBB.....',
    '....BBBBBBBBBBBCCCCCBBBBBB......',
    '....BBBBBBBBBBBCCCCCBBBBB.......',
    '.....BBBBBBBBBBBCCCBBBBBBB......',
    '......BBBB..BBBBBBBBBBBBBBB.....',
    '.......BB....BBBBBBBB..BBBBB....',
    '..............BBBBBB....BBBB....',
    '...............BBB.......BB.....',
    '................................',
  ],
  start: [17, 11],
  objectives: [
    { name: 'Rewe profanado', plot: [6, 3] },
    { name: 'Claro de los ancestros', plot: [27, 4] },
  ],
};
