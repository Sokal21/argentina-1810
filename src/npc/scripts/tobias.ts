import type { Script } from '../script';

// Tobías, the innkeeper's son, on his cot in the chapel. He starts out trusting and only needs to be
// given talk: the sabre, his leg and his father lead to who carried him (trust 7) and to what he
// overheard about the crossing (trust 8). Slighting his father or threatening his rescuer sinks it,
// and the two low-trust moments are where it is mended or ended.
export const TOBIAS: Script = {
  who: 'tobias',
  beats: [
    {
      id: 'saludo',
      options: [
        {
          says: 'De verdad, y pesa. Me manda tu tata: no duerme desde que faltás.',
          answer: '¡Sabía que me iba a buscar! Dígale que estoy entero, que es la pierna nomás. ¿Y cuánto pesa? ¿Corta de los dos lados?',
          animo: 1,
        },
        {
          says: 'Es de verdad. Vengo de la posada.',
          answer: '¿De la posada? ¿Y mi tata qué dijo, estaba enojado? Yo le quería avisar, pero acá no me dejan ni pararme.',
          animo: 0,
        },
        {
          says: 'No es cosa de chicos. Las preguntas las hago yo.',
          answer: 'Bueno, bueno... yo preguntaba nomás. Es que nunca había visto uno de cerca.',
          animo: -1,
        },
      ],
    },
    {
      id: 'enojo',
      below: 5,
      options: [
        {
          says: 'No vine a pelear con un chico. Sigamos.',
          answer: 'Yo tampoco quiero pelear. Pero no me hable como a un perro, que no le hice nada.',
          animo: 0,
        },
        {
          says: 'Alguien te cargó hasta acá. A ese lo voy a encontrar, y no para darle las gracias.',
          answer: '¡A él no lo toque! No le digo nada más, ni una palabra.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Me fui de boca, Tobías. Vengo de días malos y la pagaste vos.',
          answer: 'No es nada, a mi tata le pasa igual cuando no duerme. ¿Días malos de pelea? Cuénteme, que acá nadie me cuenta nada.',
          animo: 2,
        },
      ],
    },
    {
      id: 'ultima',
      below: 3,
      after: ['enojo'],
      options: [
        {
          says: 'Sos tan terco como el posadero que te crió, y tan poca cosa como él.',
          answer: 'De mi tata no habla nadie así. Váyase.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Tenés razón en enojarte. A tu padre lo respeto, y a vos también.',
          answer: 'Bueno... si es así, está bien. Pero despacito, que todavía estoy enojado.',
          animo: 1,
        },
      ],
    },
    {
      id: 'sable',
      options: [
        {
          says: 'Sable, mosquete y a pie. El caballo lo perdí.',
          answer: '¿Lo perdió en la pelea del otro día? Yo vi caer como tres desde donde estaba, uno tordillo. ¡Ojalá no haya sido el suyo!',
          animo: 0,
        },
        {
          says: 'El uniforme no es para que lo miren los curiosos. Así te fue.',
          answer: 'Ya sé que hice mal en ir, no hace falta que me lo diga. Fray Anselmo me lo dice todos los días, pero más bajito.',
          animo: -1,
        },
        {
          says: 'Tocá la empuñadura, despacio. El filo no.',
          answer: '¡Está fría! Y tiene muescas... ¿cada una es de una pelea? Cuando me sane la pierna quiero ser granadero, aunque mi tata diga que no.',
          animo: 1,
        },
      ],
    },
    {
      id: 'pierna',
      after: ['sable'],
      options: [
        {
          says: '¿Cómo fue lo de la pierna? Contame vos.',
          answer: 'Me arrimé de más por ver los cañones, y de golpe estaba en el suelo y la pierna no era mía. No lloré, eh. Bueno, un poco, hasta que me levantaron.',
          animo: 1,
        },
        {
          says: 'Una bala por mirón. Barato te salió.',
          answer: 'Barato no, que duele como el diablo. Y no fui de mirón: fui porque acá nunca pasa nada.',
          animo: -1,
        },
        {
          says: '¿Te duele mucho?',
          answer: 'De noche sí; de día me aburro más de lo que me duele. El fraile dice que va a sanar bien si me quedo quieto, y eso es lo que más me cuesta.',
          animo: 0,
        },
      ],
    },
    {
      id: 'tata',
      after: ['pierna'],
      options: [
        {
          says: 'Lindo padre, que deja a un chico irse a mirar una batalla.',
          answer: '¡Mi tata no me dejó nada, me escapé yo! De él no hable así, que usted no lo conoce.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Tu tata te quiere de vuelta. Cuando puedas moverte, yo te llevo.',
          answer: '¿De veras me lleva? ¡Aunque sea en una carreta de los frailes! Mi tata me va a retar delante de todos y después no me va a soltar en una semana, va a ver.',
          animo: 1,
        },
        {
          says: 'Tu padre es duro de tratar.',
          answer: 'Rezonga con todos, pero es de boca nomás. Hay que saberlo llevar: yo ya le conozco las mañas.',
          animo: 0,
        },
      ],
    },
    {
      id: 'quien',
      trust: 6,
      below: 7,
      after: ['pierna'],
      options: [
        {
          says: 'Con esa pierna no llegaste solo. ¿Quién te trajo?',
          answer: 'Alguien me cargó, sí. Pero fray Anselmo me pidió que no dijera quién, y mire que me cuesta callarme algo.',
          animo: 0,
        },
        {
          says: 'No me digas quién te sacó del campo, si no podés. Decime nomás si era buena gente.',
          answer: '¡La mejor! Me habló todo el camino para que no me durmiera. Me muero por contarle, pero le di mi palabra al fraile.',
          animo: 1,
        },
        {
          says: 'No me vengas con secretos. Hablá de una vez.',
          answer: 'No son secretos míos, son del fraile. Y si me apura, menos le cuento.',
          animo: -1,
        },
      ],
    },
    {
      id: 'mateo',
      trust: 7,
      after: ['pierna'],
      options: [
        {
          says: '¿Quién te cargó hasta la capilla? Nombre y seña.',
          answer: 'Mateo se llama. Es gallego y soldado del rey, pero no es como los otros: me trajo a cuestas media legua y se quedó escondido en vez de volver con los suyos. No lo diga por ahí, que no quiero que le hagan nada.',
          animo: 0,
          quiere: 'contar_mateo',
        },
        {
          says: 'Si te trajo uno de ellos, lo quiero atado antes de la noche.',
          answer: '¡No, eso no! Entonces no le digo nada, ni aunque me lo pregunte el fraile en persona.',
          animo: -2,
        },
        {
          says: 'El que te cargó hizo algo de hombre. Quisiera saber a quién se lo debe tu padre.',
          answer: 'No aguanto más, se lo digo: fue un soldado del rey, un gallego que se llama Mateo. Me cargó media legua hasta acá, no volvió con los suyos y está escondido. ¡Pero no le hagan nada, se lo pido!',
          animo: 1,
          quiere: 'contar_mateo',
        },
      ],
    },
    {
      id: 'promesa',
      trust: 7,
      after: ['mateo'],
      options: [
        {
          says: 'Tenés mi palabra: por mi mano no le pasa nada al que te salvó.',
          answer: '¡Palabra de granadero! Entonces estoy tranquilo. A Mateo ni las gracias le pude dar; déselas usted si lo ve.',
          animo: 2,
        },
        {
          says: 'Un soldado del rey es un soldado del rey, haya cargado a quien haya cargado.',
          answer: '¡Pero a mí me cargó! Si no era por él, me quedaba tirado ahí. No sé por qué eso no cuenta.',
          animo: -1,
        },
        {
          says: 'Eso no lo decido yo solo. El pueblo anda con sangre en el ojo.',
          answer: 'Ya sé, ño Ciriaco debe estar gritando en la puerta de la posada. Pero si yo le cuento a mi tata lo que hizo Mateo, me tiene que escuchar, ¿no?',
          animo: 0,
        },
      ],
    },
    {
      id: 'soldados',
      trust: 6,
      below: 8,
      after: ['sable'],
      options: [
        {
          says: 'Un granadero no pregunta dos veces. ¿Qué decían los godos?',
          answer: '¡Si no me acuerdo, no me acuerdo! Gritaban mucho y yo tenía la cara contra el pasto.',
          animo: -1,
        },
        {
          says: 'Estuviste tirado cerca de ellos. ¿Oíste cuándo piensan moverse?',
          answer: 'Algo dijeron, sí, pero yo estaba medio ido del dolor y no me acuerdo bien. No quiero decirle una macana y que después sea por mi culpa.',
          animo: 0,
        },
        {
          says: 'Tranquilo, no te apuro. Si te vuelve a la cabeza algo de lo que hablaban, me sirve.',
          answer: 'Lo tengo acá, en la punta de la lengua... Déjeme pensar, que cuando me apuran se me borra todo, y usted no me apura.',
          animo: 1,
        },
      ],
    },
    {
      id: 'cruce',
      trust: 8,
      after: ['mateo'],
      options: [
        {
          says: 'Vos estuviste donde yo no pude. Lo que hayas oído de ellos puede salvar gente.',
          answer: '¡Ahora me acuerdo bien! Tirado en el campo los oí: la columna cruza el vado al amanecer del tercer día. Lo dijeron dos veces, por eso se me quedó.',
          animo: 1,
          quiere: 'contar_cruce',
        },
        {
          says: 'Dejá los cuentos y decime algo que sirva.',
          answer: 'No son cuentos... Así no me dan ganas de contarle nada, y eso que tenía algo bueno.',
          animo: -1,
        },
        {
          says: '¿Cuándo cruzan? Decime lo que oíste.',
          answer: 'Al amanecer del tercer día cruzan el vado, toda la columna. Lo oí clarito mientras estaba tirado en el campo: pasaron hablando al lado mío.',
          animo: 0,
          quiere: 'contar_cruce',
        },
      ],
    },
    {
      id: 'volver',
      trust: 8,
      after: ['cruce'],
      options: [
        {
          says: 'Ya me diste lo que precisaba. No tengo más que hacer acá.',
          answer: 'Ah... bueno. Yo pensé que se iba a quedar un rato más.',
          animo: -1,
        },
        {
          says: 'Cuando hables delante de tu padre, contá todo como me lo contaste a mí.',
          answer: '¡Se lo cuento todo, de corrido! A mí mi tata me escucha, aunque haga que no. Y usted vuelva, que todavía no me dijo cuántas batallas lleva.',
          animo: 1,
        },
        {
          says: 'Quedate quieto y sanate. Yo sigo camino.',
          answer: 'Quieto me voy a volver loco. Vaya con Dios, y si ve a mi tata dígale que como bien.',
          animo: 0,
        },
      ],
    },
  ],
};
