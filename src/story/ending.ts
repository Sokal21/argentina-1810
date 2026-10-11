// How a story ends: the game stops, darkens, and what came of it is told in
// a few lines. Enter goes back to the game, which is left as it was.

const STYLE = `
  #ending {
    position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
    padding: 0 8vw; text-align: center; background: rgba(8, 7, 10, .9); color: #f0e3c4; user-select: none;
    font: 21px/1.3 'Jacquard 12', Georgia, serif; opacity: 0; transition: opacity 1.2s;
  }
  #ending.shown { opacity: 1; }
  #ending h1 { margin: 0; font: 63px/1 'Jacquard 12', Georgia, serif; font-weight: normal; color: #e2c478; text-shadow: 0 3px 0 #0a0807; }
  #ending p { margin: 0; max-width: 34em; }
  #ending small { font-size: 21px; color: #8f8168; }
`;

/** What each ending is called and says, by the happening that is it. */
export const ENDINGS: Record<string, { title: string; says: string[] }> = {
  'final:emboscada': {
    title: 'La emboscada',
    says: [
      'La columna entró al vado con el agua a la rodilla y los juncos se llenaron de gritos. Cuando cayó el capitán, lo que quedaba de ella tiró las armas o se ahogó queriendo volver.',
      'En el pueblo hubo vino hasta la noche. Doña Remedios durmió por primera vez en tres días, y don Braulio le sirvió a Cabral sin cobrarle.',
      'La capilla del páramo amaneció con la puerta cerrada. Nadie tocó a misa.',
    ],
  },
  'final:rebato': {
    title: 'El rebato',
    says: [
      'Al aclarar, la campana tocó a rebato y en las tres lomas ardían los fuegos. En la del medio había un granadero de pie, de uniforme, donde todos pudieran verlo.',
      'El capitán miró las lomas, miró las carretas con sus heridos vivos, y dio la orden de volver. La columna desanduvo la orilla norte sin disparar un tiro.',
      'No murió nadie. En el pueblo no se lo perdonaron: la posada no volvió a abrirle la puerta.',
    ],
  },
  'final:solo': {
    title: 'Solo en el vado',
    says: [
      'La columna no pasó. Lo que quedó de ella volvió a la orilla norte antes de que el sol terminara de salir, sin saber que del otro lado había un hombre solo.',
      'Nadie tocó a rebato y nadie lo esperó en los juncos. Cabral cruzó de vuelta el campo con el sable sucio, sin un pueblo que lo recibiera ni una puerta que se le abriera.',
      'La orden está cumplida. Lo demás, lo que pudo haber sido con otros, queda del otro lado del arroyo.',
    ],
  },
};

/** Tells an ending. Calls back when it has been read. */
export function showEnding(happening: string, then: () => void): void {
  const ending = ENDINGS[happening];
  if (!ending) { then(); return; }
  const style = document.head.appendChild(Object.assign(document.createElement('style'), { textContent: STYLE }));
  const root = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'ending' }));
  root.append(Object.assign(document.createElement('h1'), { textContent: ending.title }),
    ...ending.says.map(line => Object.assign(document.createElement('p'), { textContent: line })),
    Object.assign(document.createElement('small'), { textContent: 'Enter para seguir' }));
  requestAnimationFrame(() => root.classList.add('shown'));
  const close = (e: KeyboardEvent) => {
    if (e.code !== 'Enter') return;
    e.stopImmediatePropagation();
    removeEventListener('keydown', close, true);
    root.remove();
    style.remove();
    then();
  };
  // Not at once: whoever was fighting has their hands on the keys.
  setTimeout(() => addEventListener('keydown', close, true), 1500);
}
