# Cómo se arma un arco

Este documento cuenta **cómo hicimos** *El vado de las Vizcachas*, para
poder hacer el siguiente arco mejor y más rápido. Tiene dos mitades: cómo se
piensa la historia, y cómo se la construye en el juego.

Es un documento vivo. Cada etapa que se cierra le agrega lo que enseñó, en
[la bitácora](#bitácora-de-etapas) del final.

---

# Primera parte: cómo se piensa la historia

## El orden que funcionó

La historia se cerró **entera antes de programar nada**. El orden fue este,
y cada paso salió de corregir el anterior:

1. **La idea de juego**, no de argumento. Acá fue: personajes a los que se
   les escribe en vez de elegirles el diálogo.
2. **Una prueba mínima de esa idea**, con un solo personaje (el pulpero) y
   sin historia. Sirvió para saber qué puede y qué no puede hacer el modelo
   antes de apoyar una historia en él.
3. **Los sistemas que la historia va a necesitar**, nombrados y nada más:
   ítems, misiones, bandos, fama. No se diseñan todavía.
4. **La situación**: un lugar, un momento, un problema con plazo.
5. **Los bandos y qué quiere cada uno.**
6. **El conflicto**: por qué no se puede quedar bien con todos.
7. **Los finales.**
8. **Las misiones**, como pasos concretos.
9. **La gente**, con actitud e intención.
10. **El mapa**, con medidas.
11. Recién entonces, **las etapas de construcción**.

## Lo que aprendimos, corrección por corrección

Cada una de estas reglas viene de un borrador que hubo que tirar.

### La historia tiene que estar hecha de misiones

El primer borrador era una trama: una mentira que separaba a dos bandos, un
secreto que la resolvía. Sonaba bien y no se podía jugar.

> **Regla:** cada paso de la historia tiene que poder decirse como una orden
> corta que el juego puede comprobar: *andá a tal lugar, traé tal cosa,
> hablá con tal persona, llevá a tal otro, vencé a estos*.

La prueba: «Mi hijo se perdió después de la batalla y el campo está lleno
de realistas» es una misión. «Descubrir la verdad sobre los caballos» no lo
es hasta que se dice dónde hay que ir y qué hay que encontrar.

### El gancho es una persona con un problema concreto

No «la revolución está en peligro», sino un padre que no encuentra a su
hijo. Lo grande (la columna, el 25 de Mayo) queda de fondo y pone el plazo;
lo que mueve al jugador en el primer minuto es chico y humano.

### El conflicto sale de que dos bandos quieren la misma cosa para usos opuestos

Dos bandos con intereses distintos se pueden contentar los dos. Para que
elegir cueste, tiene que haber **objetos que no se pueden repartir**.

> **Regla:** buscar cosas concretas que los dos lados necesiten y que solo
> sirvan para uno. Una campana se funde o suena. Un prisionero se entrega o
> se ampara.

Con tres de esas alcanza para un arco. Cada una es una decisión, y cada
decisión es una misión con dos versiones.

### El conflicto bueno es moral, no de intereses

Paisanos contra troperos era una pelea por pasto: a nadie le importa.
Venganza contra paz sí importa, porque **los dos tienen razón**. El pueblo
fue agraviado de verdad; los frailes tienen razón en que otra matanza trae
la siguiente.

> **Regla:** si un bando es claramente el bueno, no hay decisión.

### Los dos caminos tienen que ser juego

La salida pacífica no puede ser «no pelear». El rebato es un plan con
piezas: tres fogatas que hay que ir a encender peleando, una escolta, un
lugar donde pararse. Es **más difícil de armar** que la emboscada, no más
fácil.

> **Regla:** cada final se arma con cosas que el jugador hace, y sale mejor
> o peor según cuántas consiguió.

### El enemigo no es un bando

Los realistas no negocian ni tienen personajes con los que se hable: son lo
que hay en el camino y lo que viene al final. Eso deja el peso de la
historia en los dos bandos neutrales.

### El objetivo del protagonista se cumple por los dos caminos

La orden de Cabral es que la columna no pase. La emboscada y el rebato la
cumplen las dos. Lo que cambia no es si gana, sino **qué clase de hombre
fue para ganar**. Por eso hay fama.

### La historia tiene que ser verdad del lugar

El borrador con una toldería mapuche se cayó porque en la campaña de Buenos
Aires no había mapuches. Los frailes franciscanos, la posada, el cardal, el
bañado y las milicias sí estaban.

> **Regla:** antes de escribir un bando, preguntar si esa gente estaba ahí.
> Las licencias se toman a sabiendas y se anotan (los granaderos son de
> 1812).

### No todos hablan

Hablar con el modelo es caro y lento. Se guarda para quien importa.

| Clase | Cuántos | Para qué |
|---|---|---|
| Hablables | Cuatro | Los que deciden algo o saben algo |
| De una frase | Seis | Dan color y muestran las consecuencias |
| Mudos | El resto | Pelean, yacen, miran |

Los de una frase son los que le muestran al jugador lo que hizo: la viuda
que después del rebato ya no lo mira.

### El camino es el juego

El primer mapa era un campo que se cruzaba en medio minuto. En un juego de
acción, **lo que hay entre los lugares donde se habla es el juego**.

> **Regla:** el mapa se diseña como un camino en tramos, cada uno con su
> terreno y su manera de pelear, y con lo intransitable a los costados para
> que no se pueda cortar camino.

Se mide en tiempo: cuánto se tarda caminando, y cuánto peleando.

## El modelo habla; el juego decide

Es la regla que hace posible todo lo anterior, y salió de la prueba con el
pulpero.

- **La ficha de cada personaje la escribimos nosotros.** El modelo no
  inventa quién es nadie.
- **Los secretos no están en lo que el modelo sabe** hasta que el juego
  decide que el personaje los cuenta. Así no hay forma de sacárselos con
  labia: en las pruebas, el modelo soltó el secreto a la primera frase cada
  vez que lo tenía a mano.
- **Lo que el modelo "quiere hacer" es un pedido.** Dar un objeto, ofrecer
  una misión o echar a alguien pasa solo si las cuentas del juego lo
  permiten.
- **Las frases que importan son nuestras.** Cuando alguien revela algo
  clave, lo dice con el texto que escribimos; el modelo elige el momento.
- **Dar algo es darlo de verdad.** En las pruebas, escribir «le dejo estas
  monedas» alcanzaba para ganarse al pulpero sin tener ninguna.

## Cómo se documenta una historia

Cuatro documentos, y en este orden:

| Documento | Qué contesta |
|---|---|
| El resumen | ¿Qué pasa, quién quiere qué, qué se decide, cómo termina? |
| Los personajes | ¿Con quién se habla y con quién no? ¿Cómo me recibe cada uno y qué busca de mí? |
| Las misiones | ¿Qué tengo que hacer, paso por paso, y cómo sabe el juego que lo hice? |
| El mapa | ¿Dónde queda todo, cuánto mide y cuánto se tarda? |

De cada personaje hablable se anota **actitud** (cómo te recibe),
**intención** (qué quiere conseguir de vos), **qué lo ablanda**, **qué lo
cierra**, **qué tiene**, **qué sabe** y **cómo cambia**. La actitud y la
intención son lo que después se le pasa al modelo.

De cada misión: **quién la da, de qué tipo es, los pasos, cuándo se da por
cumplida y qué deja**.

---

# Segunda parte: cómo se construye

## Por etapas cerradas

Un arco toca casi todo el juego: mapa, personajes, charla, misiones,
objetos, enemigos, guardado. Hecho todo junto no se termina nunca.

> **Regla:** se trabaja una etapa por vez. Cada una tiene una frase que dice
> cuándo está terminada. **La cierra quien dirige el juego, no quien
> programa.** No se empieza la siguiente antes.

Las etapas de este arco están en beads, encadenadas, bajo la épica
`arg-b5u`.

| # | Etapa | Terminada cuando… |
|---|---|---|
| 0 | Ordenar la base | El modo diálogo está commiteado y convive con el sistema de mapas |
| 1 | El mapa: la forma | Cabral aparece en la posada y puede caminar hasta la capilla por los seis tramos |
| 2 | El mapa: cómo se ve | Tiene su suelo, pasto, cardos, el ombú y los talas |
| 3 | Poblar el camino | Hay realistas de los actuales por tramo, y cruzarlo cuesta |
| 4 | Los cuatro hablables | Tienen sprite, retrato y ficha, y se puede charlar con cada uno |
| 5 | Los de una frase | Están en su lugar y dicen lo suyo |
| 6 | El gancho | Se juegan las misiones 1 y 2 |
| 7 | Misiones y recompensas | Una misión se ofrece, se acepta, se comprueba y paga |
| 8 | Inventario, hechos y cuaderno | Se pueden tener, dar y usar objetos, y hay dónde verlos |
| 9 | Bandos y fama | Lo que hacés cambia cómo te tratan |
| 10 | Las misiones, una por una | Cada una con su dinámica propia |
| 11 | Los finales | Emboscada, rebato y solo |
| 12 | Los edificios | Con su arte |
| 13 | Los enemigos | Los tipos nuevos y el capitán |
| 14 | Guardar la partida | Se puede cerrar y seguir |
| 15 | El modelo fuera de la máquina | Las charlas andan en el juego publicado |

## Por qué en ese orden

- **El mapa antes que la gente:** hay que saber dónde va a estar cada uno.
- **Los edificios, primero como bultos:** el mapa necesita su lugar desde el
  principio; su arte puede esperar.
- **Enemigos en el camino apenas hay mapa**, aunque sean los que ya existen:
  si el camino es el juego, no se sabe si el mapa mide bien hasta que cuesta
  cruzarlo. Perfeccionarlos va al final.
- **El gancho antes que los sistemas:** las misiones 1 y 2 se pueden hacer
  casi a mano, y muestran qué necesita de verdad el sistema de misiones
  antes de diseñarlo.
- **Los sistemas antes que las misiones difíciles:** escoltar, la campana y
  las fogatas necesitan inventario y bandos andando.
- **Guardar y publicar, al final:** hasta entonces todo vive en la máquina
  de quien desarrolla.

## Las piezas técnicas que ya existen

| Pieza | Dónde | Qué hace |
|---|---|---|
| Mapas en parcelas y zonas | `src/world/zones.ts`, `src/world/maps/` | Una grilla de parcelas de 128 × 64; cada letra, una zona; el punto, lo que no se cruza |
| La ficha de un personaje | `src/npc/pulpero.ts` | Quién es, cómo ve a cada héroe, cuánto confía, qué favores hace y con cuánta confianza |
| La conversación | `src/npc/talk.ts` | Lleva la confianza y decide qué pasa; el modelo solo habla. Tiene tests con una voz de mentira |
| La voz | `src/npc/ollama.ts` | Habla con un modelo local. Es lo único que hay que cambiar para usar otro |
| El modo diálogo | `src/npc/dialog.ts`, `index.html` | La pantalla: el mundo se frena, los dos retratos, la caja de texto |

## Lo que enseñó la prueba con el modelo

- **Modelo:** `gemma3:12b` en Ollama. El de 4 GB responde en 2 segundos pero
  habla genérico; el de 12 GB tarda 5 a 8 y tiene carácter.
- **No pasarle la charla como turnos suyos.** Un modelo chico toma sus
  frases anteriores como el patrón a seguir y las repite. Se le pasa un
  relato de lo que se dijeron, más lo último que le dijeron.
- **Hacerle decir qué entendió antes de contestar.** Un campo que no se
  muestra, donde pone en sus palabras lo que le piden. Deja de irse por las
  ramas.
- **No exigirle un modo de hablar marcado.** Pedirle «español de época» lo
  llevó a inventar frases sin sentido. Mejor claro, con uno o dos giros.
- **Ninguno de los dos guarda un secreto ni elige bien una acción.** Por eso
  la regla de arriba.
- **Mover la confianza de a poco.** Dos puntos por turno como máximo, para
  que nadie se gane a nadie con una frase.

---

# Bitácora de etapas

Qué se hizo en cada etapa, qué costó y qué cambió respecto del plan. Se
escribe al cerrarla.

## Antes de las etapas: la historia

- **Qué se hizo:** la prueba del pulpero con el modelo local, y los cuatro
  documentos de la historia.
- **Qué costó:** la historia se reescribió cuatro veces. Cayeron, en orden:
  la trama sin misiones, los mapuches, los troperos, la compuerta del molino
  y el mapa chico.
- **Qué enseñó:** todo lo de la primera parte de este documento.

## Etapa 0 · Ordenar la base

- **Qué se hizo:** se commiteó el modo diálogo, la conversación con sus
  reglas y sus tests, el pulpero de prueba y los documentos de la historia.
- **Qué había que cuidar:** mientras se hacía la prueba del pulpero, otro
  trabajo le puso al juego el sistema de mapas y sacó del repo los archivos
  de la charla, que se le habían colado. Antes de commitear se comprobó que
  las dos cosas conviven: pasan todos los tests, compila, y el juego abre
  con los dos héroes sin errores.
- **Cómo queda:** el pulpero está en el mundo solo mientras se desarrolla, y
  habla por un modelo local. Inti arranca en su bosque; Cabral todavía en el
  campo pelado de antes, hasta la etapa 1.
- **Qué enseñó:** si dos trabajos tocan el mismo repo a la vez, cada uno
  commitea solo lo suyo, y se comprueba el conjunto antes de subir.
