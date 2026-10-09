# El mapa: la campaña del vado

Un solo mapa, que se camina de punta a punta sin cortes, hecho con el mismo
sistema que el bosque de Inti (`src/world/zones.ts`): una grilla de
**parcelas**, cada una de una zona.

## La idea: el camino es el juego

El pueblo y la capilla son los dos lugares donde se habla. **Todo lo que hay
entre los dos es donde se pelea.** Ir de uno al otro no es un trámite: es un
camino largo, en tramos, cada uno con su terreno y su manera de matarte,
como salir del pueblo en el Diablo.

Por eso el mapa no es un campo abierto que se cruza en línea recta. Es un
**corredor que serpentea**, con lo intransitable (pajonal, bañado, arroyo) a
los costados, tramos anchos donde te rodean y tramos angostos donde no hay
por dónde esquivar.

## Medidas

| | |
|---|---|
| Una parcela | 128 × 64 píxeles de mundo (el suelo se ve achatado: el doble de ancho que de alto) |
| El mapa entero | **132 × 53 parcelas** = 16.896 × 3.392 píxeles |
| Lo que entra en pantalla | Unas 5 parcelas de ancho por 5 de alto, según la ventana |
| Paso de Cabral | 84 píxeles por segundo: una parcela cada segundo y medio |

El bosque de Inti mide 96 × 57. Este es más largo y más angosto: un camino.

### Cuánto se tarda

| De | A | Parcelas de camino | Caminando, sin pelear | Peleando, la primera vez |
|---|---|---|---|---|
| La posada | La capilla | **unas 125** | **3 minutos** | **8 a 10 minutos** |
| La posada | El campo de batalla | 55 | 1 min 20 s | 4 minutos |
| El campo de batalla | La capilla | 70 | 1 min 45 s | 5 minutos |
| El campo de batalla | El vado | 28 | 40 s | 2 a 3 minutos |
| Una loma | La loma de al lado | 12 | 20 s | 1 minuto |

## La forma

Norte arriba. Cada letra es una parcela; el punto es donde no se pasa.

```
....................................................................................................................................
........................................................NNNNNNNNNNNNN...............................................................
...................................................NNNNNNNNNNNNNNNNNNNNNNN..........................................................
.................................................NNNNNNNNNNNNNNNNNNNNNNNNNNN........................................................
................................................NNNNNNNNNNNNNNNNNNNNNNNNNNNNN.......................................................
.................................................NNNNNNNNNNNNNNNNNNNNNNNNNNN........................................................
...................................................NNNNNNNNNNNNNNNNNNNNNNN..........................................................
........................................................NNNNNNNNNNNNN...............................................................
...........................................................NNNNNNN..................................................................
............................................................VVVVV...................................................................
............................................................VVVVV...................................................................
............................................................VVVVV...................................................................
............................................................CCCCC...................................................................
............................................................CCCCC...................................................................
............................................................CCCCC.....................................................K.............
............................................................CCCCC.................................................KKKKKKKKK.........
............................................................CCCCC................................................KKKKKKKKKKK........
................................................11111.......CCCCC.......33333...................................KKKKKKKKKKKKK.......
...............................................1111111CCCCCC22222CCCCCC3333333..................................KKKKKKKKKKKKK.......
..............................................111111111CCCC2222222CCCC333333333................................KKKKKKKKKKKKKKK......
...............................................1111111CCCC222222222CCCC3333333.................................SKKKKKKKKKKKKK.......
................................................11111......2222222......33333.................................SSKKKKKKKKKKKKK.......
...........................................................C22222............................................SSSSKKKKKKKKKKK........
...........................................................CCCCC...........................................SSSSS..KKKKKKKKK.........
...........................................................CCCCC..........................................SSSSS.......K.............
...........................................................CCCCC.............CCCCCCCCCCCC................SSSSS......................
...........................................................CCCCC..........CCCCCCCCCCCCCCCCC.............SSSS........................
...........................................................CCCC.........CCCCCCCCCCCCCCCCCCCC...TTTTT...SSSS.........................
...........................................................CCCC........CCCCCCCCCCCCCCCCCCCCCCTTTTTTTTTSSSS..........................
..........................................................CCCCC.......CCCCCCCC........CCCCCCTTTTTTTTTTTSS...........................
..........................................................CCBCC......CCCCCCCC..........CCCCCTTTTTTTTTTTS............................
.......................................................BBBBBBBBBBB..CCCCCCCC............CCCTTTTTTTTTTTTT............................
......................................................BBBBBBBBBBBBBCCCCCCCC...............CCTTTTTTTTTTT.............................
....................................................BBBBBBBBBBBBBBBBBCCCCC................MMTTTTTTTTTTT.............................
...................................................BBBBBBBBBBBBBBBBBBBCC.................MMMMTTTTTTTTT..............................
.................................................DDBBBBBBBBBBBBBBBBBBB..................MMMMMMMTTTTT................................
................................................DDDBBBBBBBBBBBBBBBBBBB................MMMMMMMM......................................
................................................DDBBBBBBBBBBBBBBBBBBBBBMM............MMMMMMMM.......................................
...............................................DDDDBBBBBBBBBBBBBBBBBBBMMMMMM.......MMMMMMMM.........................................
.....................................DDD......DDDDDBBBBBBBBBBBBBBBBBBBMMMMMMMMMMMMMMMMMMMM..........................................
....................................DDDDDDDD.DDDDDDBBBBBBBBBBBBBBBBBBBMMMMMMMMMMMMMMMMMMM...........................................
........PPPPP..........HHHHHHH.....DDDDDDDDDDDDDDDD.BBBBBBBBBBBBBBBBB....MMMMMMMMMMMMM..............................................
......PPPPPPPPP......HHHHHHHHHHH..DDDDDDDDDDDDDDDDD...BBBBBBBBBBBBB.........MMMMMM..................................................
.....PPPPPPPPPPP.HHHHHHHHHHHHHHHHHHHDDDDD...DDDDDDD....BBBBBBBBBBB..................................................................
....PPPPPPPPPPPPPHHHHHHHHHHHHHHHHHHHD.DDD....DDDDDD.........B.......................................................................
....PPPPPPPPPPPPPHHHHHHHHHHHHHHHHHHH...DDD...DDDDDD.................................................................................
...PPPPPPPPPPPPPPPHHHHHHHHHHHHHHHHHH...DDD....DDDD..................................................................................
....PPPPPPPPPPPPPHHHHHHHHHHHHHHHHHHH...DDDD...DDDD..................................................................................
....PPPPPPPPPPPPPHHH.HHHHHHHHHHH.......DDDDDDDDDDD..................................................................................
.....PPPPPPPPPPP.......HHHHHHH..........DDDDDDDDDD..................................................................................
......PPPPPPPPP.........................DDDD........................................................................................
........PPPPP.......................................................................................................................
....................................................................................................................................
```

| Letra | Zona | Segura | Tramo |
|---|---|---|---|
| `P` | **El pueblo** | Sí | — |
| `H` | **Las chacras** | No | 1 |
| `D` | **El cardal** | No | 2 |
| `B` | **El campo de batalla** | No | 3 |
| `M` | **El bañado** | No | 4, por abajo |
| `C` | **El camino real** y el camino al vado | No | 4, por arriba |
| `T` | **El monte de talas** | No | 5 |
| `S` | **La senda** | No | 6 |
| `K` | **El páramo de la capilla** | Sí | — |
| `1` `2` `3` | **Las tres lomas** | No | Desvío al norte |
| `V` | **El vado** | No | Desvío al norte |
| `N` | **La orilla norte** | No | Solo en el final |
| `.` | — | — | Pajonal, bañado hondo, arroyo: no se cruza |

## El camino, tramo por tramo

Del pueblo a la capilla, de oeste a este. Cada tramo sube la dificultad y
cambia cómo se pelea.

### 1. Las chacras

Lo que rodea al pueblo: quintas arrasadas, cercos de tuna, un rancho
quemado, zapallos podridos. **Ancho y fácil.** Rezagados de a uno o de a
dos, saqueando. Es donde se aprende a pelear.

### 2. El cardal

Cardos más altos que un hombre a caballo, con picadas angostas que se
cruzan y se bifurcan. **No se ve más allá de unos pasos.** Los realistas
salen de entre los cardos a quemarropa: acá mandan los sables, no los
mosquetes. Hay tres picadas y una sola no está tomada; cuál, cambia.

### 3. El campo de batalla

De golpe, campo abierto. El cañón volcado, caballos muertos, cuervos. **Es
el tramo más ancho y el más poblado:** cuatro o cinco soldados revisando a
los caídos, y te ven de lejos. Acá mandan los mosquetes. Es el cruce del
mapa: de acá sale el camino al norte, a las lomas y al vado.

### 4. Dos caminos al monte

Después del campo de batalla hay que elegir.

- **Por abajo, el bañado.** Más corto. Barro y agua hasta la rodilla, que
  **frena el paso**, con tiradores en los albardones secos. Lento y bajo
  fuego.
- **Por arriba, el camino real.** Más largo, firme y descubierto. Pasan
  **partidas enteras**, de cuatro o cinco, marchando hacia el vado.

### 5. El monte de talas

El único lugar con árboles: talas bajos y espinosos, sombra y troncos donde
cubrirse. Acá está el **campamento de los rezagados**, con un sargento que
manda: el tramo más duro antes de llegar.

### 6. La senda

La subida al páramo, angosta, entre cardales. **No se puede rodear a
nadie.** Una guardia cierra el paso, y pasarla es llegar.

### El desvío al norte: las lomas y el vado

Del campo de batalla sale un camino al norte, hasta la Loma del Medio. De
ahí se abre a las otras dos lomas y baja al vado. Cada loma tiene su
guardia. Es el escenario de las fogatas y del final.

## Las postas

La historia pide cruzar el mapa unas seis veces. Para que el camino sea un
desafío **la primera vez** y no un castigo las siguientes, hay **postas**:
lugares del camino que, una vez alcanzados y limpiados, quedan abiertos.

| Posta | Dónde | Parcela |
|---|---|---|
| El ombú | Entre las chacras y el cardal | 33, 45 |
| El cañón | En el campo de batalla | 58, 37 |
| La tapera | Donde se juntan el bañado y el camino real, antes del monte | 92, 32 |

Desde el pueblo, la capilla o una posta abierta se puede ir directo a
cualquier otra posta abierta, mientras no haya nadie persiguiéndote. **El
tramo entre la posta y el destino se camina y se pelea igual.**

Así el primer viaje a la capilla son diez minutos de camino; los
siguientes, dos o tres, por el tramo que toque.

*Las postas son una propuesta: se puede hacer sin ellas, a costa de repetir
mucho camino.*

## Lugares de referencia

Columna y fila de la parcela, contando desde arriba a la izquierda.

| Lugar | Parcela | Zona | Qué hay |
|---|---|---|---|
| **La posada de don Braulio** | 10, 45 | Pueblo | Rancho largo de adobe con alero y palenque. Se habla en la puerta. **Cabral aparece acá** |
| El pozo | 12, 47 | Pueblo | Centro del caserío. Ño Ciriaco y los paisanos |
| La fragua | 14, 44 | Pueblo | Donde se fundiría la campana |
| El rancho quemado | 7, 43 | Pueblo | Doña Remedios, sentada delante |
| **El ombú** | 33, 45 | Chacras | Posta. Un ombú enorme, solo |
| Las tres picadas | 38, 40 | Cardal | Donde el camino se abre en tres |
| **El cañón volcado** | 58, 37 | Campo de batalla | Posta. El poncho de Tobías está al lado |
| El malherido | 64, 39 | Campo de batalla | Un realista contra una rueda |
| La bifurcación | 69, 36 | Campo de batalla | Al sureste el bañado, al noreste el camino real |
| **La tapera** | 92, 32 | Monte | Posta. Un rancho sin techo |
| El campamento del sargento | 97, 31 | Monte | Fogón, pabellón de fusiles |
| El pie de la senda | 102, 29 | Senda | Donde empieza la subida |
| **La capilla** | 118, 19 | Páramo | Nave chica de adobe blanqueado y **campanario aparte**, de madera. Los catres, bajo el alero |
| La sacristía | 121, 18 | Páramo | Mateo |
| El camposanto | 115, 22 | Páramo | Cruces de palo. Tumbas frescas, de los dos bandos |
| Las carretas | 114, 20 | Páramo | Dos, con bueyes |
| **La Loma del Oeste** | 50, 19 | Loma 1 | Un ombú chico. Primera fogata |
| **La Loma del Medio** | 62, 20 | Loma 2 | Piedras y cardos, mira de frente al vado. **Donde se para Cabral en el rebato** |
| **La Loma del Este** | 74, 19 | Loma 3 | Un corral de palo a pique abandonado. Tercera fogata |
| **El vado** | 62, 10 | Vado | Cinco parcelas de ancho, piedra y agua baja, entre juncos |
| Donde forma la columna | 62, 4 | Orilla norte | Solo en el final |

## Los enemigos que hacen falta

Hoy hay un solo realista: el fusilero que dispara de lejos y saca el sable
de cerca. Para que cada tramo se pelee distinto hacen falta más:

| Enemigo | Cómo pelea | Dónde |
|---|---|---|
| **Fusilero** (ya existe) | Dispara de lejos, sable de cerca | En todos lados |
| **Sableador** | No tiene mosquete: corre hacia vos y pega | Cardal, senda |
| **Tirador apostado** | No se mueve, dispara de más lejos y más seguido | Bañado, lomas |
| **Sargento** | Más vida, grita y los que tiene cerca se envalentonan | Monte, senda. Uno por zona |
| **El capitán** | Jefe del final de la emboscada | Vado |

## Cómo se ve

Campaña bonaerense a fines de mayo: otoño, pasto alto y amarillento, cardos
secos, tierra llana con lomas apenas marcadas, cielo enorme. Casi sin
árboles: el ombú, los talas del monte, sauces en la orilla del arroyo. El
arroyo es angosto y barroso, con juncos.

Es lo opuesto al bosque de Inti: allá los árboles cierran; acá, salvo en el
cardal, no hay dónde esconderse.

La capilla está apenas más alta que el campo. No hace falta dibujar altura:
alcanza con que la senda sea angosta y que desde el páramo se vea lejos.
