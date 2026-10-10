import type { Script } from '../script';

// Don Braulio, the innkeeper. He starts wary of the uniform (trust 2) and warms to being paid,
// to respect and above all to anyone willing to look for his son Tobías; the remedy comes at 5
// and the bronze bell at 7. Orders, hurry and a word against the boy get the inn closed.
export const BRAULIO: Script = {
  who: 'braulio',
  beats: [
    {
      id: 'saludo',
      options: [
        {
          says: 'Buenas, patrón. Un trago y un banco, si no es molestia.',
          answer: 'Molestia no es mientras se pague. Sentate ahí, donde te vea las manos.',
          animo: 1,
        },
        {
          says: 'Vengo de servicio. Atendeme rápido, que no tengo el día.',
          answer: 'Apurado y de uniforme: mala yunta. Acá se atiende al paso del que sirve, no del que manda.',
          animo: -1,
        },
        {
          says: 'Busco a alguien que conozca el paraje.',
          answer: 'Acá todos conocen el paraje, y ninguno conoce al que pregunta. Pedí algo o seguí camino.',
          animo: 0,
        },
      ],
    },
    {
      // He has turned his back: a first chance to mend it, or to be shown the door.
      id: 'torcido',
      below: 2,
      after: ['saludo'],
      options: [
        {
          says: 'Cuidá esa lengua, viejo, que traigo sable.',
          answer: 'Sables vi pasar muchos por esa puerta, y el mostrador sigue en su sitio. Andate antes de que llame a los muchachos.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Entré con mal pie, don. Si me deja, empiezo de nuevo.',
          answer: 'Mirá vos, un uniforme que sabe recular. Bueno: decí qué andás queriendo, pero despacio.',
          animo: 1,
        },
        {
          says: 'No vine a pelear con vos. Quiero saber dónde estoy parado.',
          answer: 'Estás parado en mi posada, y con el pie flojo. Por ahora es todo lo que te digo.',
          animo: 0,
        },
      ],
    },
    {
      // The second time it sours there is little left to try.
      id: 'ultima',
      below: 2,
      after: ['torcido'],
      options: [
        {
          says: 'Decime al menos por dónde se sale al vado.',
          answer: 'Por donde entraste, y derecho al norte. Más que eso no te debo.',
          animo: 0,
        },
        {
          says: 'Tenés razón en desconfiar. Pago lo que tomé y cierro la boca.',
          answer: 'Eso ya suena a cristiano. La plata arriba del mostrador, y después vemos si tenés algo que decir.',
          animo: 1,
        },
        {
          says: 'Me cansaste. Voy a revisar esta posada, te guste o no.',
          answer: 'Revisá el camino, que es lo único tuyo que hay acá. Para vos esta puerta se cerró.',
          animo: -2,
          quiere: 'echar',
        },
      ],
    },
    {
      id: 'uniforme',
      trust: 2,
      after: ['saludo'],
      options: [
        {
          says: 'A la tropa se le fía. Anotalo, que ya te lo van a pagar.',
          answer: 'Con ese "ya te lo van a pagar" podría empapelar la posada. Acá no se le fía ni al cura.',
          animo: -1,
        },
        {
          says: '¿Pasó tropa por acá estos días?',
          answer: 'Pasó, y dejó un rancho hecho ceniza. De qué color era la casaca, a la ceniza le da lo mismo.',
          animo: 0,
        },
        {
          says: 'Antes que nada: ¿cuánto es el trago? No me gusta quedar debiendo.',
          answer: '¡Un uniforme que paga! Habría que marcarlo en la pared. Medio real, y el segundo corre por la casa.',
          animo: 1,
        },
      ],
    },
    {
      id: 'tobias',
      trust: 2,
      after: ['uniforme'],
      options: [
        {
          says: 'Mirás la puerta cada vez que cruje. ¿A quién esperás?',
          answer: 'A mi hijo. Tobías, catorce años: salió a mirar la batalla hace tres días y no volvió. Y el campo está lleno de godos que le tiran a lo que se mueva.',
          animo: 1,
        },
        {
          says: 'Tengo una columna que parar. No me entretengas con penas de pueblo.',
          answer: 'Las penas de pueblo son las que te dan de comer, soldado. Pará tu columna solo, entonces.',
          animo: -1,
        },
        {
          says: 'Dicen que en la pelea se perdió gente del paraje. ¿Es cierto?',
          answer: 'Dicen bien. Se perdió un rancho, se perdió gente, y se perdió mi Tobías, que tiene catorce años y fue a mirar. No me lo hagas contar dos veces.',
          animo: 0,
        },
      ],
    },
    {
      // What he wants the soldier for. A word against the boy is the one thing he does not let pass.
      id: 'buscar',
      trust: 3,
      after: ['tobias'],
      options: [
        {
          says: '¿Para qué lado salió el chico?',
          answer: 'Para el norte, al campo de la pelea, detrás del ruido como todos los chicos. Más no sé, y me lo pregunto cada noche.',
          animo: 0,
        },
        {
          says: 'Un chico que va a mirar una batalla se la busca solo.',
          answer: 'Catorce años tiene. De mi hijo no habla así nadie, y menos uno que entró sin que lo llamen. Ahí tenés la puerta.',
          animo: -2,
          quiere: 'echar',
        },
        {
          says: 'Ese campo lo tengo que cruzar igual. Decime cómo es Tobías y te lo busco.',
          answer: 'Flaco, puro codo y rodilla, con un poncho que le queda grande. Vos podés ir adonde yo no: traeme aunque sea noticia, y esta posada es tu casa.',
          animo: 2,
          quiere: 'encargar_hijo',
        },
      ],
    },
    {
      id: 'propio',
      trust: 3,
      options: [
        {
          says: 'Mi partida se desbandó en el vado. Quedé solo, a pie y con un tajo: esa es toda mi historia.',
          answer: 'Entonces sabés lo que es esperar a los que no vuelven. Sentate bien, hombre, que así torcido me cansás la vista.',
          animo: 1,
        },
        {
          says: 'De mí no hay mucho que contar: soldado, y de paso.',
          answer: 'De paso andan todos, hasta que se les acaba el camino. Será como decís.',
          animo: 0,
        },
        {
          says: 'No vine a contar mi vida. Vine a que me cuenten.',
          answer: 'Lindo trato: yo pongo el vino y los cuentos, y vos la oreja. Así no se compra nada en esta casa.',
          animo: -1,
        },
      ],
    },
    {
      id: 'pueblo',
      trust: 4,
      options: [
        {
          says: 'Es la guerra, don. La tropa del rey cumple órdenes, como cualquiera.',
          answer: '¿Órdenes? Andá a decírselo a la viuda que quedó sin techo. En esta casa no se dice una palabra a favor de los godos.',
          animo: -2,
        },
        {
          says: 'Vi el rancho quemado al entrar. ¿De quién era?',
          answer: 'De doña Remedios, viuda. Se lo quemaron con el telar adentro, que era todo lo que tenía. Alguien va a pagar por eso, y no va a ser ella.',
          animo: 1,
        },
        {
          says: '¿Cuántos eran los que pasaron?',
          answer: 'No me puse a contarlos: estaba ocupado mirando arder un techo. Muchos, y de mal talante.',
          animo: 0,
        },
      ],
    },
    {
      // The remedy. Asked for or paid for he hands it over; demanded, he does not.
      id: 'remedio',
      trust: 5,
      options: [
        {
          says: 'Te compro algo para la herida, si tenés. Pago lo que pidas.',
          answer: 'Tengo un frasco de remedio de yuyos, uno solo. Guardá los reales y llevátelo: un soldado desangrado no me sirve para nada.',
          animo: 0,
          quiere: 'dar_remedio',
        },
        {
          says: 'Necesito remedios para la tropa. Entregá lo que tengas.',
          answer: '¿Qué tropa, si viniste solo? Lo que hay es vino, y se paga. Pedí como la gente y vemos.',
          animo: -1,
        },
        {
          says: 'Este tajo no quiere cerrar, don Braulio. ¿Conocés a alguien que sepa curar?',
          answer: 'Conozco: el que te está sirviendo. Tomá este frasco de yuyos que guardo bajo el mostrador; arde como el demonio, pero cierra la carne.',
          animo: 1,
          quiere: 'dar_remedio',
        },
      ],
    },
    {
      // The chapel comes up, and he still keeps to himself what the village says about it.
      id: 'fraile',
      trust: 5,
      options: [
        {
          says: '¿Quién más cuida gente por acá? Por si al chico lo levantó alguno.',
          answer: 'Fray Anselmo, en la capilla del páramo. Nos conocemos hace treinta años y no pensamos igual en nada, pero mala gente no es. Preguntale a él.',
          animo: 1,
        },
        {
          says: 'Esos frailes seguro esconden algo. Habría que entrarles a la fuerza.',
          answer: 'Con Anselmo tengo mis cuentas, pero son mías. Vos a esa capilla entrás con el sombrero en la mano.',
          animo: -1,
        },
        {
          says: '¿Qué hay en el páramo?',
          answer: 'Una capilla, unos frailes y mucho viento. Lo demás que se dice de ese lugar no es para andar repitiéndolo.',
          animo: 0,
        },
      ],
    },
    {
      // The bell. He tells it to someone who asks as one of theirs, not to someone collecting a debt.
      id: 'campana',
      trust: 7,
      options: [
        {
          says: 'Ya me gané tu confianza. Largá lo que sabés del páramo.',
          answer: 'La confianza no es apuesta a la taba, para cobrarla en el acto. Preguntá como amigo y te contesto como amigo.',
          animo: -1,
        },
        {
          says: 'Si la columna vuelve, ¿con qué piensa esperarla el pueblo?',
          answer: 'Con lo único que hay. La campana de la capilla del páramo es de bronce: los muchachos quieren bajarla y fundirla para hacer balas con que esperar a los realistas.',
          animo: 1,
          quiere: 'contar_campana',
        },
        {
          says: 'Oí que acá murmuran algo de la capilla. ¿Qué es?',
          answer: 'Murmuran porque no se animan a decirlo fuerte. La campana de la capilla es de bronce, y quieren bajarla y fundirla para hacer balas. Que el fraile no lo sepa por vos.',
          animo: 0,
          quiere: 'contar_campana',
        },
      ],
    },
    {
      id: 'despedida',
      trust: 7,
      after: ['campana'],
      options: [
        {
          says: 'Me voy. Guardame un lugar para la vuelta.',
          answer: 'El banco no se va a ir a ninguna parte. Yo tampoco.',
          animo: 0,
        },
        {
          says: 'No sé si te traigo al chico, don Braulio. Pero no vuelvo sin saber qué fue de él.',
          answer: 'Con eso me alcanza para dormir un rato. Andá, y cuidá el cuero: acá te queda el jarro esperando.',
          animo: 1,
        },
        {
          says: 'Cuando vuelva quiero al pueblo formado y listo para obedecer.',
          answer: 'Acá no se forma nadie, granadero: acá se arrima el que quiere. Bajá el copete o te volvés a quedar solo.',
          animo: -1,
        },
      ],
    },
  ],
};
