import type { Script } from '../script';

// Fray Anselmo, the guardian of the chapel. Frankness, asking before deciding and care
// for the wounded open him: bandages and word of Tobías at 5, the plan of the rebato at 8.
// Cruelty, lies and steel in a holy place close him, and then he does not throw out: he prays.
export const ANSELMO: Script = {
  who: 'anselmo',
  beats: [
    {
      id: 'saludo',
      options: [
        {
          says: 'Sin pecado concebida, padre. ¿Dejo el sable en la puerta o entro con él?',
          answer: 'Entrá con él, pero que duerma en la vaina. Pocos preguntan, hijo; sentate, que venís rengueando.',
          animo: 1,
        },
        {
          says: 'Gracias. Busco un rato de sombra y alguna noticia.',
          answer: 'Sombra hay, y agua en la tinaja. Las noticias, despacio: primero decime quién sos.',
          animo: 0,
        },
        {
          says: 'No vengo a rezar, fraile. ¿Tiene godos escondidos acá?',
          answer: 'Tengo cristianos lastimados, y no los cuento por el color de la casaca. Bajá la voz, que duermen.',
          animo: -1,
        },
      ],
    },
    {
      id: 'hundido',
      below: 2,
      after: ['saludo'],
      options: [
        {
          says: 'Perdone, padre. Hablé como un bruto y no era con usted.',
          answer: 'Eso ya es empezar de nuevo. Sentate y respirá, que acá adentro nadie te corre.',
          animo: 1,
        },
        {
          says: 'Me quedo callado, entonces. Usted dirá.',
          answer: 'Callar tampoco es poco. Quedate, que el silencio de una capilla a veces acomoda lo que uno trae torcido.',
          animo: 0,
        },
        {
          says: 'Rece lo que quiera. Yo reviso la capilla, con usted o sin usted.',
          answer: 'Padre nuestro, que estás en los cielos... y por este hijo también.',
          animo: -2,
          quiere: 'echar',
        },
      ],
    },
    {
      id: 'recompone',
      below: 3,
      after: ['saludo'],
      options: [
        {
          says: 'Vengo herido y de mal talante, padre. No me lo tome a mal.',
          answer: 'No te lo tomo. El dolor habla feo por boca de cualquiera; eso lo sé de viejo.',
          animo: 1,
        },
        {
          says: 'No tengo nada contra usted. Tengo una orden, nada más.',
          answer: 'Las órdenes las conozco. Lo que quiero saber es qué clase de hombre las trae.',
          animo: 0,
        },
        {
          says: 'Menos sermón, fraile, que el tiempo corre.',
          answer: 'No te di ningún sermón, hijo. Y el tiempo corre igual para los que están tendidos ahí al lado.',
          animo: -1,
        },
      ],
    },
    {
      id: 'encargo',
      after: ['saludo'],
      options: [
        {
          says: 'Vengo a defender a la gente de este paraje.',
          answer: 'Así dicen todos los que llegan armados, de un lado y del otro. A la gente la defiende el que primero pregunta qué le hace falta.',
          animo: 0,
        },
        {
          says: 'Mi orden es una sola: que la columna no cruce el vado. Cómo, todavía no lo sé.',
          answer: 'Eso es hablar derecho. Yo tampoco quiero que crucen, pero menos quiero cavar más fosas; ya veremos si las dos cosas caben juntas.',
          animo: 1,
        },
        {
          says: 'Voy de paso, padre. No traigo encargo ninguno.',
          answer: 'Un granadero solo y a pie no va de paso. No me mientas bajo este techo, que no hace falta.',
          animo: -1,
        },
      ],
    },
    {
      id: 'heridos',
      trust: 2,
      after: ['encargo'],
      options: [
        {
          says: 'Los godos que tenga son prisioneros míos. Dígame cuántas cabezas son.',
          answer: 'Cabezas se cuentan en un rodeo, hijo. De ellos no te voy a decir una palabra más.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: '¿Hay soldados del rey entre sus heridos?',
          answer: 'Los hay, y paisanos también. Acá adentro son todos lo mismo: gente que se queja de noche.',
          animo: 0,
        },
        {
          says: '¿Cuántos heridos tiene, padre? ¿Qué les anda faltando?',
          answer: 'Son unos cuantos, de los dos bandos; seis son soldados del rey. Fray Benito no da abasto. Faltan trapos limpios, falta caldo y falta sueño; gracias por preguntarlo.',
          animo: 1,
        },
      ],
    },
    {
      id: 'vendas',
      trust: 5,
      after: ['heridos'],
      options: [
        {
          says: 'Necesito que me cure, padre. Así no llego al vado.',
          answer: 'Así no llegás ni a la tranquera. Quedate quieto, que te lavo eso y te pongo una venda firme.',
          animo: 0,
          quiere: 'dar_vendas',
        },
        {
          says: 'Sáquele las vendas a un godo y démelas, que a mí me hacen más falta.',
          answer: 'A nadie le desato una herida para atar otra. Así no, hijo.',
          animo: -1,
        },
        {
          says: 'Si le sobra una venda, padre, se la acepto. Si es para otro, aguanto.',
          answer: 'Sobrar no sobra, pero vos también sos de los que llegaron lastimados. Vení, sacate la casaca: el ungüento arde primero y alivia después.',
          animo: 1,
          quiere: 'dar_vendas',
        },
      ],
    },
    {
      id: 'tobias',
      trust: 5,
      after: ['heridos'],
      options: [
        {
          says: 'En la posada hay un padre que no duerme, buscando a su hijo. ¿Sabe usted algo del chico?',
          answer: 'Tobías, el de Braulio. Está vivo, hijo: lo tengo acá, con la pierna rota por una bala, y va a sanar. Llevale esa noticia a su padre, que treinta años lo conozco y sé lo que estará penando.',
          animo: 1,
          quiere: 'contar_tobias',
        },
        {
          says: 'Si tiene al hijo del posadero, me lo llevo hoy, como esté.',
          answer: 'Tobías vive y va a sanar, y por eso mismo no sale de acá: tiene la pierna rota por una bala. A un chico así no se lo carga como a una bolsa.',
          animo: -1,
          quiere: 'contar_tobias',
        },
        {
          says: 'Busco a Tobías, el hijo del posadero. ¿Está acá?',
          answer: 'Acá está. Catorce años y la pierna rota por una bala, pero vive y va a sanar.',
          animo: 0,
          quiere: 'contar_tobias',
        },
      ],
    },
    {
      id: 'batalla',
      trust: 3,
      after: ['encargo'],
      options: [
        {
          says: 'Usted le mira el filo al sable como quien ya lo vio trabajar.',
          answer: 'Fui capellán de tropa antes de vestir este sayal. Di más santos óleos en una tarde que en veinte años de capilla, y por eso no quiero otra.',
          animo: 1,
        },
        {
          says: 'Usted rece, padre, que de batallas entiendo yo.',
          answer: 'De batallas entendí yo antes de que vos nacieras, y ojalá no. Dejémoslo ahí.',
          animo: -1,
        },
        {
          says: 'Hace tres días maté sin contar, padre. No vine a que me absuelva.',
          answer: 'No te lo ofrecí. Pero el que lo dice así, sin adorno, ya empezó a cargarlo; yo confesé a muchos que no podían ni nombrarlo.',
          animo: 1,
        },
      ],
    },
    {
      id: 'duda',
      trust: 3,
      after: ['batalla'],
      options: [
        {
          says: 'El pueblo arma una emboscada, y a mí me sirve.',
          answer: 'Te sirve a vos. A las viudas que deje, de un lado y del otro, no les sirve a ninguna.',
          animo: -1,
        },
        {
          says: 'No sé si pelear es lo mejor, padre. ¿Usted qué ve desde acá?',
          answer: 'Veo hombres cansados de los dos lados, y un capitán que tampoco querrá perder más gente. A veces a una tropa se la hace volver sin tocarla; pero eso es para hablarlo más adelante.',
          animo: 1,
        },
        {
          says: 'Solo no puedo con ellos. Esa es la verdad, y no me gusta.',
          answer: 'No te gusta, pero la decís, y eso vale. Solo no podés; acompañado, tal vez no haga falta ni desenvainar.',
          animo: 1,
        },
      ],
    },
    {
      id: 'rebato',
      trust: 8,
      after: ['duda'],
      options: [
        {
          says: 'Padre, si hay modo de que esa columna se vuelva sin un muerto, quiero oírlo.',
          answer: 'Lo hay, y se llama rebato. La noche antes de que crucen el vado, la campana tocando a rebato desde el campanario y fogatas en las tres lomas: van a creer que los espera la milicia de toda la campaña, y se vuelven sin pelear.',
          animo: 1,
          quiere: 'contar_rebato',
        },
        {
          says: '¿Qué tiene pensado usted para frenarlos?',
          answer: 'Asustarlos, que sale más barato que matarlos. Campana a rebato desde el campanario y fogatas en las tres lomas la noche antes del cruce, para que crean que la milicia de toda la campaña los espera en el vado.',
          animo: 0,
          quiere: 'contar_rebato',
        },
        {
          says: 'Con rezos no se frena a una tropa. Deme hombres o no me sirve de nada.',
          answer: 'Hombres no tengo, y los que tengo no caminan. Lo otro que tenía para darte, me lo guardo.',
          animo: -1,
        },
      ],
    },
    {
      id: 'sacristia',
      trust: 4,
      after: ['heridos'],
      options: [
        {
          says: '¿Quién anda en la sacristía?',
          answer: 'Alguien que tiene más miedo que vos y que yo juntos. Por ahora basta con eso.',
          animo: 0,
        },
        {
          says: 'Abra esa puerta, fraile, o la abro yo a sablazos.',
          answer: 'En sagrado no se desenvaina. No tengo más que decirte.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Oí pasos tras esa puerta, padre. Si me dice que no pregunte, no pregunto.',
          answer: 'No preguntes todavía. Hay alguien a mi cargo ahí, como lo estás vos desde que cruzaste el umbral; cuando sea tiempo, yo mismo te abro.',
          animo: 1,
        },
      ],
    },
    {
      id: 'pueblo',
      trust: 6,
      after: ['tobias'],
      options: [
        {
          says: 'Don Braulio quiere que alguien pague. ¿Usted qué le diría, que lo conoce?',
          answer: 'Que treinta años le conozco el genio y el corazón, y que el corazón es mejor. Le quemaron el pago y le faltó el hijo: no es mala gente, es gente dolida.',
          animo: 1,
        },
        {
          says: '¿Qué hay entre usted y el posadero?',
          answer: 'Treinta años de vecinos y de respeto. Hoy tiramos para lados contrarios, y nos duele a los dos.',
          animo: 0,
        },
        {
          says: 'El posadero tiene razón: al que quema un rancho se lo cuelga.',
          answer: 'Colgá a uno y mañana queman dos. Eso lo vi hacer, y nunca le devolvió el rancho a nadie.',
          animo: -1,
        },
      ],
    },
    {
      id: 'promesa',
      trust: 6,
      after: ['sacristia'],
      options: [
        {
          says: 'Godo que sana, godo que vuelve a tirar. Mejor que no sanen.',
          answer: 'Eso no lo dice un cristiano. Voy a rezar para no haberlo oído.',
          animo: -2,
        },
        {
          says: 'Mientras yo esté en este paraje, a sus heridos no los toca nadie. De ningún bando.',
          answer: 'Eso no me lo había dicho nadie de uniforme. Te tomo la palabra, hijo, y mirá que yo las palabras las guardo.',
          animo: 2,
        },
        {
          says: 'No le prometo nada, padre. Tengo una orden y la voy a cumplir.',
          answer: 'Prefiero eso a una promesa hueca. Cumplila, pero mirá bien por dónde: hay más de un camino al mismo vado.',
          animo: 0,
        },
      ],
    },
  ],
};
