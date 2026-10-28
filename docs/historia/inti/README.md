# La peste del Wekufe

**El segundo arco de historia. Protagonista: Inti, la machi.**

Este documento junta todo lo que se decidió sobre el arco de Inti. Está a medio pensar: lo que dice
**decidido** lo dijo el usuario; lo que dice **propuesta** es para discutir. Se va llenando a medida
que se cierra. Las tareas están en beads, bajo la épica `arg-sur`.

A diferencia del arco de Cabral (*El vado de las Vizcachas*, una historia de misiones en un mapa),
este arco es **un desafío**: se juega como un *roguelike* al estilo de Hades. Cabral fue una prueba
técnica divertida; Inti es un arco más complejo y más mecánico, hecho con todo lo que aprendimos antes.

## La situación (decidido)

La campaña del ejército de Roca (1879) llega al sur. Con la columna viene **la peste**: las
enfermedades que traen los soldados diezman a la gente. Historia argentina en sentido amplio: el
juego no se ata a 1810.

**El pacto.** **Julio Argentino Roca**, el general que manda la campaña, hizo un pacto con **el
Wekufe**, la criatura maléfica de la
peste. El demonio le presta sus muertos y sus espíritus, y a cambio se alimenta de la peste y de la
destrucción que trae la campaña. Por eso los **apestados** (soldados muertos de peste y levantados)
y los **chonchones** pelean del lado del ejército. Todos son aliados y se pueden mezclar en un mismo
combate.

## Los dos pedidos (decidido)

Todos están en el mismo pueblo. Dos personas le piden a Inti cosas distintas, y las dos tienen razón:

- **El jefe de la tribu:** hay que **matar a Roca**. Sin él se acaba la guerra y se rompe el pacto.
- **Una señora:** el monstruo está demasiado fuerte por todas las muertes. Para quitar la peste hay
  que **atacar al demonio**, y con eso el pueblo va a poder lograr lo demás.

Son **dos arcos separados**: Inti elige un camino, y matar a Roca o matar al demonio termina el
arco por ese lado.

**Propuesta:** darle a cada pedido una cara chica y humana, como pide el método
([como-se-arma-un-arco.md](../como-se-arma-un-arco.md)): la señora con un nieto enfermo de peste; el
jefe con hijos en la guerra o gente perdida en un ataque.

## Cómo se juega: un recorrido (decidido)

No es por misiones: es desafío. Lo difícil es **atravesar el camino** hasta Roca o el demonio:
hay que aprender a pelear y llegar con recursos.

Para empezar (el usuario, 27/10/2026), **un jefe intermedio de cada lado** y el final:

```
Pueblo: el jefe (Roca) o la señora (el Wekufe) → elegís camino
  │
  ├─ Tramo 1: 1 o 2 habitaciones → JEFE 1
  │                                  └─ mejora al matarlo
  ├─ Tramo 2: 2 a 4 habitaciones (dificultad en aumento)
  │            └─ mejora en el medio
  │                                  └─ mejora antes de entrar al jefe
  └─ JEFE FINAL: ROCA / EL WEKUFE
Si morís → Küyen te devuelve al pueblo, todo de cero
```

- **Tres mejoras por recorrido:** al matar al primer jefe, a mitad del segundo tramo y antes de
  entrar al jefe final.
- **Las mejoras te las da siempre Ayelén** («alegría»), una mujer mapuche que te ayuda, por ahora la
  misma en los dos caminos. Elegido por el usuario: un nombre mapuche muy usado hoy.
- **Las habitaciones son escenarios fijos que se repiten con enemigos al azar**, y la cantidad de
  cada tramo también sale al azar dentro de lo dicho. Algunos lugares se hacen más estrechos (un
  apestado tapando el paso, un charco que cubre todo el ancho).
- **Los enemigos se mezclan**: fusileros, apestados, chonchones y los que vengan, porque todos son
  aliados del pacto. (Se eliminó la regla de que los chonchones no convivían con los fusileros.)
- **Si Inti muere, el recorrido arranca de cero.** Lo que se gana **dura solo ese recorrido**.

**Propuesta para armar los encuentros:** cada habitación tiene un presupuesto de dificultad que
crece (la primera vale «3 fusileros», la última «2 apestados, 4 fusileros y chonchones»), y el
juego lo gasta al azar entre los enemigos que tocan.

## Las recompensas (a pensar mejor)

Al estilo de Hades: te ofrecen elegir entre algunas cosas, que van alternando. Por ahora son tres por
recorrido (ver arriba) y te las da Ayelén. Lo dicho hasta ahora:
una curación, maná, un arma. **Propuesta**, para ordenar ideas:

- **Lo inmediato:** curación, maná lleno, más vida máxima por lo que queda del recorrido.
- **Mejoras de sus poderes:** el rayo más grande o más seguido, orbes que atraviesan, la curación
  que además da maná, inmunidad al veneno.
- **Armas o formas de ataque nuevas:** orbes que se dividen, un golpe cuerpo a cuerpo con la rama.

Falta decidir cuántas se ofrecen por vez, cómo se eligen (con el mouse y con el joystick) y cómo
conviven con el crecimiento (experiencia, niveles) y los ítems que ya existen.

## Cuando Inti muere: Küyen (decidido)

Al morir no hay solo una pantalla de derrota: se cuenta lo que pasó («el demonio arrasó el pueblo»,
«la columna pasó»), **pero Küyen, la luna, le da a Inti una oportunidad más**, y el recorrido vuelve
a empezar. Es la explicación del reinicio dentro de la historia: el ciclo de la luna es volver a
empezar, y cada noche es otra oportunidad. Elegida por el usuario el 27/10/2026 entre Ñuke Mapu,
Pillán y Küyen.

**Propuesta, para pensar cómo se ve:** la pantalla oscurece sobre lo que pasó; sale la luna, su luz
cae sobre Inti y la devuelve al pueblo, de noche. Podría ser su luz plateada la que marque todo lo
de Küyen en el juego.

## Los enemigos

Hechos y en el juego:

- **Soldado de frontera** (1879): fusil de retrocarga, tira de lejos y seguido, bayoneta de cerca.
  Una vez que la ve, la caza a casi su paso.
- **El apestado** ([ficha](../../personajes/apestado.md)): el tanque. Sale de la tierra cerca de ella,
  golpe de 3, carga, y un vómito que deja un charco que frena y envenena. Si queda atrás, se hunde y
  vuelve a salir delante de ella.
- **El chonchón**: del arco anterior de Inti; vuelve como aliado del pacto.

Ideas (propuesta), que pueden ser enemigos comunes o jefes según el tramo:

- **El baqueano de las boleadoras**: rápido, a facón; sus boleadoras atan las piernas de Inti.
- **El lancero de caballería**: pasadas a caballo en línea recta; si le matás el caballo, sigue a pie.
- **Los artilleros del Krupp**: el cañón marca zonas donde caen los obuses; hay que callarlo.

## Los jefes

Por ahora, **un jefe intermedio por camino** y el final (decidido).

### El final del camino de Roca: su batería Krupp (decidido)

**Es muy importante que el jefe final sea Roca** (el usuario). Su pelea es la de su batería: la
pelea en la que, además de pelear, hay algo más.

**Dos fases, sin chonchones**: es una pelea del ejército. **La batería no se ve** (ni loma ni cañón):
es una mecánica sobre el mapa. A partes del lugar les cae una batería de cañonazos: el piso se marca
y a los dos segundos caen los obuses (explosión, fuego, humo). Quedarse quieta mata.

Lo único que se ve de ellos es, al entrar, **el mismísimo Julio Argentino Roca**, que te grita:

> «¡Conocerán la pólvora, mapuches traga plomo! ¡Traguen plomo!»

Las dos fases (el usuario):

1. **La batería.** Roca te ataca con los cañonazos, desde lejos. Es el desafío de la pelea: los
   cañonazos vienen en salvas de dos clases, **una zona grande concentrada** o **muchos desperdigados**
   por el lugar.
2. **Roca salta a la batalla** y te pelea él mismo. Los cañonazos siguen, pero **distintos: en zonas
   más chicas y muchos menos**, porque ahora el peligro es él.

- **En la primera fase hay enemigos que te atacan** mientras caen los cañonazos: es clave (el usuario).
- **Los obuses también lastiman a los enemigos**: a los suyos (soldados, apestados), no solo a Inti.
- **Para pasar de fase hay que matar al observador** (elegido por el usuario): un soldado con catalejo
  y banderas que le marca a la batería dónde tirar, **y que corre rápido**: hay que meterse bajo el
  fuego para alcanzarlo. Cuando cae, la batería queda ciega, **vuelve a verse Roca** y dice algo (la
  frase está por definir), y salta a la batalla.

**Si lo vencés, no lo matás: Roca escapa.**

Falta definir: cuándo termina la primera fase (sobrevivir un tiempo, vencer a la escolta), cómo pelea
Roca en la segunda (y si los cañonazos siguen cayendo), y qué queda roto cuando escapa (la guerra,
el pacto).

### El jefe intermedio del camino de Roca

Por definir. Propuestas que quedaron: el baqueano de las boleadoras (con perros y una segunda fase
escondido en el monte) o el comandante de caballería.

### El final del camino del demonio: el Wekufe

Una pelea pura, alimentado por la peste y la destrucción.

### El jefe intermedio del camino del demonio

Por definir. Propuestas: el kalku, cuya cabeza vuela como un chonchón gigante; o el coronel apestado.

## Lo que falta decidir

1. Lo que dice Roca cuando cae el observador, antes de saltar a la batalla.
2. **Pendientes, para después de Roca:** los otros tres jefes: el intermedio del camino de Roca, el
   intermedio del camino del demonio y el Wekufe.
3. El próximo enemigo (baqueano, lancero o artilleros).
4. Las recompensas: cuáles, cuántas por vez y cómo se eligen.
5. Las habitaciones: cuántas, cómo son y cómo se pasa de una a la siguiente.
6. Las caras humanas del jefe y de la señora.
