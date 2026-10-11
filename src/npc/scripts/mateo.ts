import type { Script } from '../script';

// Mateo, the Galician deserter hiding in the sacristy. He starts cornered at trust 1: the first
// moments ask for no trust and only let him breathe (stay at the door, put the musket down, the
// buttonless coat). Asking what brought him here is what opens him, and it is he who tells of the
// boy: the hero may have found him without anyone saying who he is. Then what he needs, a promise,
// the column (5), the friar, the captain (7). Any threat, or "godo"/"traidor", shuts him.
export const MATEO: Script = {
  who: 'mateo',
  beats: [
    {
      // Only for whoever has already frightened him to the bottom: mend it or finish it.
      id: 'arrinconado',
      below: 1,
      after: ['saludo'],
      options: [
        {
          says: 'No te voy a tocar. Contestame y me voy.',
          answer: 'Eso dicen todos antes. Pregunte desde ahí, y ya veré si contesto.',
          animo: 0,
        },
        {
          says: 'Se me acabó la paciencia: hablás o te saco de acá a la rastra.',
          answer: 'Pues sáqueme. Muerto no le voy a contar nada.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Empecé mal. Dejo el sable en el suelo y hablamos.',
          answer: 'Déjelo, pues, lejos de la mano. Así... así ya puedo respirar.',
          animo: 1,
        },
      ],
    },
    {
      id: 'saludo',
      options: [
        {
          says: 'Soy Cabral, granadero de la Patria. Vengo por la columna.',
          answer: 'De la columna ya no soy. Y lo que sé es lo único que tengo, señor: no lo doy por nada.',
          animo: 0,
        },
        {
          says: 'Nadie me manda. Me quedo acá, en la puerta.',
          answer: 'Ahí. Ni un paso más, se lo pido. Tres días llevo oyendo botas y pensando que vienen por mí.',
          animo: 1,
        },
        {
          says: 'Quieto, godo. Las manos donde las vea.',
          answer: 'Las manos, mírelas: vacías. Y ese nombre se lo guarda, que yo no le he quemado nada a nadie.',
          animo: -1,
        },
      ],
    },
    {
      id: 'armas',
      after: ['saludo'],
      options: [
        {
          says: 'Hablá, o te entrego a los paisanos. A una casaca del rey, por acá, no le preguntan nada.',
          answer: 'Entonces ya está todo dicho. Lléveme a la soga, que de mi boca no sale nada.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Apoyo el mosquete contra la pared. Mirá: lejos de mí.',
          answer: 'Gracias. Con eso en la mano no le oía la voz, le oía el fierro.',
          animo: 1,
        },
        {
          says: 'El arma es para el camino, no para vos.',
          answer: 'Será. Pero el camino acaba en esta puerta, y yo estoy dentro.',
          animo: 0,
        },
      ],
    },
    {
      id: 'casaca',
      after: ['armas'],
      options: [
        {
          says: 'Casaca del rey y escondido entre santos. Traidor a los tuyos, entonces.',
          answer: 'Traidor me dirá el capitán y godo me dicen ahí fuera. Usted elija, pero a mí no me hable así.',
          animo: -1,
        },
        {
          says: '¿De qué compañía es esa casaca?',
          answer: 'De una que ya no me cuenta en la lista. No me pregunte más de eso, todavía no.',
          animo: 0,
        },
        {
          says: 'Le arrancaste los botones a la casaca. Ya no es de nadie.',
          answer: 'Los tiré al arroyo, uno por uno. Ni del rey ni de ustedes: de nadie. Es usted el primero que lo entiende.',
          animo: 1,
        },
      ],
    },
    {
      id: 'chico',
      trust: 2,
      after: ['casaca'],
      options: [
        {
          says: '¿Desertaste, o te dejaron atrás?',
          answer: 'Me quedé yo. Traje a cuestas a un rapaz del pueblo, herido, y ya no volví. Pregúntele al fraile, que le entablilló la pierna delante de mí.',
          animo: 0,
        },
        {
          says: 'Te escapaste de la pelea por miedo, y ahora te tapa un fraile. ¿O me equivoco?',
          answer: 'Se equivoca. Miedo tengo ahora; aquel día cargué media legua a un rapaz herido, y por eso no pude volver. No me conoce usted.',
          animo: -1,
        },
        {
          says: 'Nadie se esconde en una sacristía por gusto. Contame qué te trajo hasta acá.',
          answer: 'Un rapaz del pueblo, con la pierna rota. Gritaba como mi hermano pequeño, allá en Mondoñedo. Lo levanté sin pensar, y media legua después ya no había manera de volver.',
          animo: 2,
        },
      ],
    },
    {
      // A second chance for whoever got this far without winning him, and the last place to lose him.
      id: 'recelo',
      below: 3,
      after: ['chico'],
      options: [
        {
          says: 'No vine a juzgarte. Decime vos de qué querés hablar.',
          answer: 'De nada quiero hablar. Pero ya que pregunta en vez de mandar... siéntese, si quiere, ahí en el arcón.',
          animo: 1,
        },
        {
          says: 'Me cansé. Por un godo escondido, cualquier paisano de por acá me da lo que pida.',
          answer: 'Pues véndame. Pero lo que sé se va conmigo al hoyo.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'No tengo tiempo. No puedo esperarte.',
          answer: 'Ni yo le he pedido que espere. Cada cual con su prisa.',
          animo: 0,
        },
      ],
    },
    {
      id: 'miedo',
      trust: 3,
      after: ['chico'],
      options: [
        {
          says: 'La Patria precisa hombres. Cambiá de bando y se acabó el miedo.',
          answer: 'Ya tiré una casaca; no me voy a poner otra. No quiero ser de nadie, señor.',
          animo: -1,
        },
        {
          says: '¿Qué te hace falta para salir vivo de acá?',
          answer: 'Un camino sin soldados y dos días de ventaja. Hacia el sur, donde nadie pregunte de qué rey es uno.',
          animo: 1,
        },
        {
          says: 'Decime tu precio y terminemos.',
          answer: 'No soy tendero. Pero la vida, eso pido, ya que lo pregunta así.',
          animo: 0,
        },
      ],
    },
    {
      id: 'palabra',
      trust: 4,
      after: ['miedo'],
      options: [
        {
          says: 'Te consigo un indulto firmado por mis jefes en Buenos Aires.',
          answer: '¿Firmado por quién, aquí, en medio del páramo? No me prometa lo que no tiene en la mano.',
          animo: -1,
        },
        {
          says: 'No te prometo nada. Hago lo que pueda.',
          answer: 'Al menos no me adorna el cuento. Con eso me alcanza para seguir escuchando.',
          animo: 0,
        },
        {
          says: 'Te doy mi palabra: yo no te entrego a nadie. Ni a los tuyos ni a los de acá.',
          answer: 'Eso sí lo puede cumplir un hombre solo. Se la tomo, y no me olvido de quién me la dio.',
          animo: 1,
        },
      ],
    },
    {
      // First favour: how many they are and how they come.
      id: 'columna',
      trust: 5,
      after: ['palabra'],
      options: [
        {
          says: '¿Cuántos son y cómo vienen?',
          answer: 'Ochenta, uno más o uno menos. Casi sin pólvora, y con hambre de días.',
          animo: 0,
          quiere: 'contar_columna',
        },
        {
          says: 'No te pido que pelees contra ellos. Solo decime con qué me voy a topar.',
          answer: 'Con ochenta hombres, no más. Vienen casi sin pólvora y con hambre de días: se nota en cómo arrastran los pies.',
          animo: 1,
          quiere: 'contar_columna',
        },
        {
          says: 'Bastante te escuché. Ahora pagame: la columna.',
          answer: 'Escuchar no se cobra, señor. Si era para eso, no me escuche más.',
          animo: -1,
        },
      ],
    },
    {
      id: 'fraile',
      trust: 6,
      after: ['columna'],
      options: [
        {
          says: 'El fraile no te esconde de balde. Con vos algo se va a querer cobrar.',
          answer: 'No hable así de él. Es el único que me ha mirado sin medirme el cuello.',
          animo: -1,
        },
        {
          says: 'El fraile te ampara, y no parece hombre de andar cobrando. No lo entiendo del todo, pero lo respeto.',
          answer: 'Yo tampoco lo entiendo. Le pregunté qué quería a cambio y me dio un caldo. Tres días, y todavía no sé qué le debo.',
          animo: 1,
        },
        {
          says: '¿El fraile sabe lo que me contaste?',
          answer: 'No me ha preguntado nada. Ni cuántos éramos, ni de dónde soy.',
          animo: 0,
        },
      ],
    },
    {
      // Second favour: what the captain fears and where they camp.
      id: 'capitan',
      trust: 7,
      after: ['columna'],
      options: [
        {
          says: 'Nadie acá conoce a ese capitán como vos. ¿Qué clase de hombre es?',
          answer: 'Uno que les tiene terror a las milicias en campo abierto: ya lo corrieron una vez y no quiere que lo agarren cruzando un río. Acampan en la orilla norte del arroyo, pasando el vado.',
          animo: 1,
          quiere: 'contar_capitan',
        },
        {
          says: 'Decime dónde duerme el capitán, que le corto el pescuezo esta noche.',
          answer: 'Para degollar no me pida señas. A su lado duermen rapaces como yo.',
          animo: -1,
        },
        {
          says: '¿Quién los manda y dónde acampan?',
          answer: 'Un capitán que teme a las milicias en campo abierto más que a nada: ya lo corrieron una vez. Acampan en la orilla norte del arroyo, pasando el vado.',
          animo: 0,
          quiere: 'contar_capitan',
        },
      ],
    },
    {
      // One more step for whoever is a hair short of the captain; small talk for whoever is not.
      id: 'tierra',
      trust: 6,
      after: ['fraile'],
      options: [
        {
          says: '¿Adónde pensás ir cuando esto pase?',
          answer: 'Lejos. Donde haya tierra que cavar y nadie pase lista.',
          animo: 0,
        },
        {
          says: '¿Qué dejaste allá, en tu tierra?',
          answer: 'En Galicia, una madre, dos vacas y la niebla. Me llevaron en una leva; nadie me preguntó si quería rey.',
          animo: 1,
        },
        {
          says: 'Volvete a España y contales cómo se pelea en esta tierra.',
          answer: 'A España vuelvo con una soga esperándome en el muelle. No sabe usted lo que dice.',
          animo: -1,
        },
      ],
    },
    {
      id: 'despedida',
      trust: 7,
      after: ['capitan'],
      options: [
        {
          says: 'Bien. Ahora venís conmigo y se lo repetís al pueblo.',
          answer: 'Al pueblo no. Lo que dije se lo dije a usted; delante de ellos no abro la boca.',
          animo: -1,
        },
        {
          says: 'Lo que me contaste puede ahorrar muchas muertes. Quedate escondido hasta que pase.',
          answer: 'Aquí me quedo, pegado a la pared. Y si ve al rapaz de la pierna, dígale que no la apoye todavía.',
          animo: 1,
        },
        {
          says: 'Con esto me alcanza. Me voy.',
          answer: 'Vaya con Dios. Y cierre despacio, que la puerta chilla.',
          animo: 0,
        },
      ],
    },
  ],
};
