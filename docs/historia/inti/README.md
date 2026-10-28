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

**El pacto.** El general del ejército hizo un pacto con **el Wekufe**, la criatura maléfica de la
peste. El demonio le presta sus muertos y sus espíritus, y a cambio se alimenta de la peste y de la
destrucción que trae la campaña. Por eso los **apestados** (soldados muertos de peste y levantados)
y los **chonchones** pelean del lado del ejército. Todos son aliados y se pueden mezclar en un mismo
combate.

## Los dos pedidos (decidido)

Todos están en el mismo pueblo. Dos personas le piden a Inti cosas distintas, y las dos tienen razón:

- **El jefe de la tribu:** hay que **matar al capitán**. Sin él se acaba la guerra y se rompe el pacto.
- **Una señora:** el monstruo está demasiado fuerte por todas las muertes. Para quitar la peste hay
  que **atacar al demonio**, y con eso el pueblo va a poder lograr lo demás.

Son **dos arcos separados**: Inti elige un camino, y matar al capitán o matar al demonio termina el
arco por ese lado.

**Propuesta:** darle a cada pedido una cara chica y humana, como pide el método
([como-se-arma-un-arco.md](../como-se-arma-un-arco.md)): la señora con un nieto enfermo de peste; el
jefe con hijos en la guerra o gente perdida en un ataque.

## Cómo se juega: un recorrido (decidido)

No es por misiones: es desafío. Lo difícil es **atravesar el camino** hasta el capitán o el demonio:
hay que aprender a pelear y llegar con recursos.

```
Pueblo: el jefe o la señora → elegís camino
  │
  ├─ Tramo 1: 3-4 habitaciones (dificultad en aumento), una recompensa tras cada una → JEFE 1
  ├─ Tramo 2: 3-4 habitaciones, recompensas ............................................ → JEFE 2
  └─ Tramo final ...................................................... → EL CAPITÁN / EL WEKUFE
```

- **Cada tramo termina en un jefe distinto.**
- **Entre jefes, 3 o 4 habitaciones**, con dificultad que crece.
- **Las habitaciones son escenarios fijos que se repiten con enemigos al azar.** Algunos lugares se
  hacen más estrechos (un apestado tapando el paso, un charco que cubre todo el ancho).
- **Los enemigos se mezclan**: fusileros, apestados, chonchones y los que vengan, porque todos son
  aliados del pacto. (Se eliminó la regla de que los chonchones no convivían con los fusileros.)
- **Si Inti muere, el recorrido arranca de cero.**
- **Después de cada batalla relevante, una recompensa a elegir.** Lo que se gana **dura solo ese
  recorrido**.

**Propuesta para armar los encuentros:** cada habitación tiene un presupuesto de dificultad que
crece (la primera vale «3 fusileros», la cuarta «2 apestados, 4 fusileros y chonchones»), y el
juego lo gasta al azar entre los enemigos que tocan.

## Las recompensas (a pensar mejor)

Al estilo de Hades: te ofrecen elegir entre algunas cosas, que van alternando. Lo dicho hasta ahora:
una curación, maná, un arma. **Propuesta**, para ordenar ideas:

- **Lo inmediato:** curación, maná lleno, más vida máxima por lo que queda del recorrido.
- **Mejoras de sus poderes:** el rayo más grande o más seguido, orbes que atraviesan, la curación
  que además da maná, inmunidad al veneno.
- **Armas o formas de ataque nuevas:** orbes que se dividen, un golpe cuerpo a cuerpo con la rama.
- **Quién las da:** en el camino del demonio, espíritus; en el del capitán, la gente del pueblo.

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

## Los jefes (propuesta)

Cada tramo termina en uno distinto. Para discutir:

- **Camino del capitán:** un comandante de caballería (el lancero como jefe), la batería Krupp, y al
  final **el capitán**, cuya pelea no es solo matarlo: además hay que hacer algo (por ejemplo, romper
  el pacto o callar la artillería). Esto último lo pidió el usuario; la mecánica está por pensar.
- **Camino del demonio:** un apestado gigante, un kalku (el brujo que manda a los chonchones), y al
  final **el Wekufe**, una pelea pura, alimentado por la peste y la destrucción.

## Lo que falta decidir

1. Cuántos tramos tiene cada camino, y qué jefe cierra cada uno.
2. El próximo enemigo (baqueano, lancero o artilleros).
3. Las recompensas: cuáles, cuántas por vez y cómo se eligen.
4. Las habitaciones: cuántas, cómo son y cómo se pasa de una a la siguiente.
5. Las caras humanas del jefe y de la señora.
