import type { WorldMap } from '../zones';

// Cabral's first map, for the story of El vado de las Vizcachas: see
// docs/historia/mapa.md. The village lies in the south-west and the chapel on
// its moor in the north-east, and the way between them is the game: a road
// that winds through one stretch of country after another, with marsh, tall
// grass and the stream to either side so that it cannot be cut short. From
// the battlefield a second road goes north to the three hills and the ford.
export const vadoDeLasVizcachas: WorldMap = {
  name: 'El vado de las Vizcachas',
  ground: ['#8f7a38', '#877233', '#96813d', '#7f6b2f', '#9d8842'],
  bare: true,
  // Each stretch is known by what closes it in, never by the colour of its ground.
  zones: {
    P: { name: 'El pueblo', safe: true, edge: ['cortadera'], fence: 'stakes' },
    H: { name: 'Las chacras', foes: 3, edge: ['tuna', 'maiz'], scatter: { maiz: 0.05 } },
    D: { name: 'El cardal', foes: 5, edge: ['cardo'] },
    B: { name: 'El campo de batalla', foes: 6, edge: ['cortadera'] },
    M: { name: 'El bañado', foes: 4, edge: ['junco'], scatter: { junco: 0.08 }, water: 'marsh' },
    C: { name: 'El camino real', foes: 5, edge: ['cortadera'], scatter: { cortadera: 0.03 } },
    T: { name: 'El monte de talas', foes: 6, edge: ['tala'], scatter: { tala: 0.16 } },
    S: { name: 'La senda', foes: 5, edge: ['cardo'] },
    K: { name: 'El páramo de la capilla', safe: true, edge: ['cortadera'], scatter: { tala: 0.03 }, fence: 'wall' },
    1: { name: 'La Loma del Oeste', foes: 3, edge: ['cortadera'] },
    2: { name: 'La Loma del Medio', foes: 4, edge: ['cortadera', 'cardo'] },
    3: { name: 'La Loma del Este', foes: 3, edge: ['cortadera'] },
    V: { name: 'El vado', foes: 4, edge: ['junco'], water: 'ford' },
    N: { name: 'La orilla norte', edge: ['cortadera', 'junco'] },
  },
  plots: [
    '....................................................................................................................................',
    '........................................................NNNNNNNNNNNNN...............................................................',
    '...................................................NNNNNNNNNNNNNNNNNNNNNNN..........................................................',
    '.................................................NNNNNNNNNNNNNNNNNNNNNNNNNNN........................................................',
    '................................................NNNNNNNNNNNNNNNNNNNNNNNNNNNNN.......................................................',
    '.................................................NNNNNNNNNNNNNNNNNNNNNNNNNNN........................................................',
    '...................................................NNNNNNNNNNNNNNNNNNNNNNN..........................................................',
    '........................................................NNNNNNNNNNNNN...............................................................',
    '...........................................................NNNNNNN..................................................................',
    '............................................................VVVVV...................................................................',
    '............................................................VVVVV...................................................................',
    '............................................................VVVVV...................................................................',
    '............................................................CCCCC...................................................................',
    '............................................................CCCCC...................................................................',
    '............................................................CCCCC.....................................................K.............',
    '............................................................CCCCC.................................................KKKKKKKKK.........',
    '............................................................CCCCC................................................KKKKKKKKKKK........',
    '................................................11111.......CCCCC.......33333...................................KKKKKKKKKKKKK.......',
    '...............................................1111111CCCCCC22222CCCCCC3333333..................................KKKKKKKKKKKKK.......',
    '..............................................111111111CCCC2222222CCCC333333333................................KKKKKKKKKKKKKKK......',
    '...............................................1111111CCCC222222222CCCC3333333.................................SKKKKKKKKKKKKK.......',
    '................................................11111......2222222......33333.................................SSKKKKKKKKKKKKK.......',
    '...........................................................C22222............................................SSSSKKKKKKKKKKK........',
    '...........................................................CCCCC...........................................SSSSS..KKKKKKKKK.........',
    '...........................................................CCCCC..........................................SSSSS.......K.............',
    '...........................................................CCCCC.............CCCCCCCCCCCC................SSSSS......................',
    '...........................................................CCCCC..........CCCCCCCCCCCCCCCCC.............SSSS........................',
    '...........................................................CCCC.........CCCCCCCCCCCCCCCCCCCC...TTTTT...SSSS.........................',
    '...........................................................CCCC........CCCCCCCCCCCCCCCCCCCCCCTTTTTTTTTSSSS..........................',
    '..........................................................CCCCC.......CCCCCCCC........CCCCCCTTTTTTTTTTTSS...........................',
    '..........................................................CCBCC......CCCCCCCC..........CCCCCTTTTTTTTTTTS............................',
    '.......................................................BBBBBBBBBBB..CCCCCCCC............CCCTTTTTTTTTTTTT............................',
    '......................................................BBBBBBBBBBBBBCCCCCCCC...............CCTTTTTTTTTTT.............................',
    '....................................................BBBBBBBBBBBBBBBBBCCCCC................MMTTTTTTTTTTT.............................',
    '...................................................BBBBBBBBBBBBBBBBBBBCC.................MMMMTTTTTTTTT..............................',
    '.................................................DDBBBBBBBBBBBBBBBBBBB..................MMMMMMMTTTTT................................',
    '................................................DDDBBBBBBBBBBBBBBBBBBB................MMMMMMMM......................................',
    '................................................DDBBBBBBBBBBBBBBBBBBBBBMM............MMMMMMMM.......................................',
    '...............................................DDDDBBBBBBBBBBBBBBBBBBBMMMMMM.......MMMMMMMM.........................................',
    '.....................................DDD......DDDDDBBBBBBBBBBBBBBBBBBBMMMMMMMMMMMMMMMMMMMM..........................................',
    '....................................DDDDDDDD.DDDDDDBBBBBBBBBBBBBBBBBBBMMMMMMMMMMMMMMMMMMM...........................................',
    '........PPPPP..........HHHHHHH.....DDDDDDDDDDDDDDDD.BBBBBBBBBBBBBBBBB....MMMMMMMMMMMMM..............................................',
    '......PPPPPPPPP......HHHHHHHHHHH..DDDDDDDDDDDDDDDDD...BBBBBBBBBBBBB.........MMMMMM..................................................',
    '.....PPPPPPPPPPP.HHHHHHHHHHHHHHHHHHHDDDDD...DDDDDDD....BBBBBBBBBBB..................................................................',
    '....PPPPPPPPPPPPPHHHHHHHHHHHHHHHHHHHD.DDD....DDDDDD.........B.......................................................................',
    '....PPPPPPPPPPPPPHHHHHHHHHHHHHHHHHHH...DDD...DDDDDD.................................................................................',
    '...PPPPPPPPPPPPPPPHHHHHHHHHHHHHHHHHH...DDD....DDDD..................................................................................',
    '....PPPPPPPPPPPPPHHHHHHHHHHHHHHHHHHH...DDDD...DDDD..................................................................................',
    '....PPPPPPPPPPPPPHHH.HHHHHHHHHHH.......DDDDDDDDDDD..................................................................................',
    '.....PPPPPPPPPPP.......HHHHHHH..........DDDDDDDDDD..................................................................................',
    '......PPPPPPPPP.........................DDDD........................................................................................',
    '........PPPPP.......................................................................................................................',
    '....................................................................................................................................',
  ],
  // The stream of the Vizcachas crosses the whole map, and the ford is the one way over it.
  stream: [8, 11],
  // He arrives at the inn's door.
  // He comes in wounded from the fighting, at the village's eastern edge: the inn is a short walk on.
  start: [16, 46],
  objectives: [
    { name: 'La posada', plot: [10, 45] },
    { name: 'El pozo', plot: [12, 47] },
    { name: 'La fragua', plot: [14, 44] },
    { name: 'El rancho quemado', plot: [7, 43] },
    { name: 'El ombú', plot: [33, 45], stands: 'ombu' },
    { name: 'Las tres picadas', plot: [38, 40] },
    { name: 'El cañón volcado', plot: [58, 37] },
    { name: 'La bifurcación', plot: [69, 36] },
    { name: 'La tapera', plot: [92, 32] },
    { name: 'El campamento del sargento', plot: [97, 31] },
    { name: 'El pie de la senda', plot: [102, 29] },
    { name: 'La capilla', plot: [118, 19] },
    { name: 'El camposanto', plot: [115, 22] },
    { name: 'La Loma del Oeste', plot: [50, 19], stands: 'ombu_chico' },
    { name: 'La Loma del Medio', plot: [62, 20] },
    { name: 'La Loma del Este', plot: [74, 19] },
    { name: 'El vado', plot: [62, 10] },
    { name: 'Donde forma la columna', plot: [62, 4] },
  ],
  // Stood in for by plain blocks until they are drawn.
  // Who can be talked to, and where: the innkeeper at his door, the friar before
  // his chapel with the boy beside him, and the deserter round by the sacristy.
  people: [
    { who: 'braulio', plot: [9, 46] },
    // He looks down the path, the way anyone comes.
    { who: 'anselmo', plot: [117, 21], faces: 'left' },
    { who: 'tobias', plot: [119, 21] },
    { who: 'mateo', plot: [121, 18] },
    // And those who only say the one thing they have to say: the village's by the inn and
    // the burnt house, the lay brother and the wounded ensign by the chapel, and the dying
    // soldier out on the battlefield.
    { who: 'remedios', plot: [7, 44] },
    { who: 'ciriaco', plot: [12, 45], faces: 'left' },
    { who: 'paisano', plot: [14, 46], faces: 'left' },
    { who: 'chacarero', plot: [8, 47] },
    { who: 'benito', plot: [120, 22], faces: 'left' },
    { who: 'alferez', plot: [118, 22] },
    { who: 'malherido', plot: [64, 39] },
  ],
  // The boy's poncho, where he fell by the overturned gun, and the blood that leads from it
  // to the path up to the chapel.
  things: [
    { what: 'poncho', plot: [59, 37] },
    // Wood and tinder for the friar's fires, set out by the chapel once he has asked for them.
    { what: 'lena', plot: [116, 20], given: 'acepto:fogatas' },
  ],
  // The three rises that look down on the ford: on each a signal fire can be built, once
  // there is wood for it and the soldiers who hold the rise are down.
  // What has to be brought across the country, with Cabral leading it and the king's soldiers in between.
  charges: [
    { id: 'mateo', name: 'Mateo', who: 'mateo', sprite: 'mateo/sprite.png', from: [121, 18], to: [12, 47], does: 'llevarse a Mateo', given: 'acepto:entregar', happening: 'entregado:mateo', life: 4, pace: 56, note: 'Mateo llegó al pozo. Los paisanos ya lo rodean.' },
    { id: 'campana', name: 'La carreta de la campana', sprite: 'cosas/carreta.png', from: [121, 21], to: [14, 44], does: 'llevar la carreta', given: 'bajada:campana', happening: 'llego:campana', life: 6, pace: 46, note: 'La campana está en la fragua. Para mañana va a ser balas.' },
    { id: 'carretas', name: 'Las carretas de los heridos', sprite: 'cosas/carreta.png', from: [122, 20], to: [62, 20], does: 'sacar las carretas', given: 'acepto:escolta', happening: 'llego:carretas', life: 6, pace: 46, note: 'Las carretas llegaron a la loma. Los heridos están donde los van a ver.' },
  ],
  spots: [
    // The belfry: the bell comes down onto a cart, for whoever the village has sent for it.
    { id: 'campana', name: 'El campanario', plot: [121, 21], does: 'bajar la campana', given: 'acepto:campana', happening: 'bajada:campana', note: 'La campana está en la carreta. Pesa como un muerto.' },
    // The ford itself, where the column has to cross: whoever plants himself there, alone, has it come at him.
    { id: 'vado', name: 'El vado', plot: [62, 10], does: 'plantarse y esperar a la columna', happening: 'planta:vado', note: 'Ya vienen.', stand: { from: [62, 8], waves: [3, 4, 5], won: 'aguanto:vado' } },
    // Behind the chapel, where the friars keep their two carts: whoever has been asked can see which way they are to go.
    { id: 'carretas', name: 'Las carretas', plot: [122, 20], does: 'mirar las carretas', given: 'acepto:rehenes', happening: 'sabe:carretas', note: 'Dos carretas con paja y mantas, de cara a la senda. Salen por acá, de noche.' },
    { id: 'fogata_este', name: 'La fogata del Este', plot: [75, 20], does: 'armar la fogata', given: 'tiene:lena', guarded: true, happening: 'armada:este', note: 'La fogata de la Loma del Este está armada.', sprite: 'cosas/fogata.png' },
    { id: 'fogata_medio', name: 'La fogata del Medio', plot: [63, 21], does: 'armar la fogata', given: 'tiene:lena', guarded: true, happening: 'armada:medio', note: 'La fogata de la Loma del Medio está armada.', sprite: 'cosas/fogata.png' },
    { id: 'fogata_oeste', name: 'La fogata del Oeste', plot: [52, 20], does: 'armar la fogata', given: 'tiene:lena', guarded: true, happening: 'armada:oeste', note: 'La fogata de la Loma del Oeste está armada.', sprite: 'cosas/fogata.png' },
  ],
  trails: [{ from: [59, 37], to: 'S' }],
  buildings: [
    { name: 'La posada', plot: [10, 45], wide: 150, deep: 46, tall: 44, colour: 0x8a7a5c },
    { name: 'La fragua', plot: [14, 44], wide: 60, deep: 30, tall: 34, colour: 0x5e5248 },
    { name: 'El rancho quemado', plot: [7, 43], wide: 80, deep: 34, tall: 22, colour: 0x2e2a26 },
    { name: 'La tapera', plot: [92, 32], wide: 70, deep: 32, tall: 20, colour: 0x6f6654 },
    { name: 'La capilla', plot: [118, 19], wide: 110, deep: 50, tall: 62, colour: 0xd9d2bf },
    { name: 'El campanario', plot: [120, 20], wide: 30, deep: 22, tall: 96, colour: 0x7a5b3c },
  ],
};
