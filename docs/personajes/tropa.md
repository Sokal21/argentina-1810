# La tropa realista

**Los otros cuatro soldados del rey. Enemigos.**

El [soldado realista](realista.md) es el fusilero de línea, el que más hay.
Estos cuatro se le suman para que una guarnición no sea siempre lo mismo:
cada uno pide que Cabral haga algo distinto.

## Concepto

Los cuatro se leen como **gente del rey** a primera vista (blanco crema y
rojo, o el azul oscuro con rojo de los oficiales), y cada uno se distingue
de lejos **por la silueta**, no por el color:

| | Silueta | Qué te obliga a hacer |
|---|---|---|
| **Sableador** | Sin mosquete, sable en alto, gorro rojo caído | Frenarlo: te corre y no lo podés dejar atrás caminando |
| **Tirador** | Rodilla en tierra detrás de un cestón, casaca verde | Ir a buscarlo: tira de más lejos que nadie y no se mueve |
| **Sargento** | Más alto, alabarda, bicornio de costado | Matarlo primero: su grito apura a todos los que tiene cerca |
| **El capitán** | Capa azul, bicornio con pluma, pistola y espada | Aguantarlo: es el que manda la columna |

## Cómo se comportan

Los números viven en `src/tropa/brain.ts` (`KINDS`). Es **un solo cerebro**
con parámetros: cada clase dice si camina, si tira, si pega y si arenga.

| | Vida | Paso | Te ve desde | Tira | Pega | Vale |
|---|---|---|---|---|---|---|
| Sableador | 3 | 96 | 340 | no | tajo rápido, alcance 46 | 7 exp, 4 reales |
| Tirador | 2 | no camina | 460 | hasta 440, cada 1,6 a 2,2 s | no | 8 exp, 5 reales |
| Sargento | 8 | 30 | 320 | no | barrido lento, alcance 62 | 20 exp, 12 reales |
| El capitán | 14 | 44 | 420 | pistola hasta 230 | estocada, alcance 60 | 80 exp, 60 reales |

- **El sableador** corre casi al triple que un fusilero. Cae con tres golpes.
- **El tirador** no se mueve de su cestón y no tiene con qué defenderse de
  cerca: llegar hasta él es ganarle.
- **El sargento** grita cada 9 segundos. Todo realista a menos de 260 anda
  y recarga una vez y media más rápido durante 5 segundos (`QUICKENED`),
  fusileros incluidos.
- **El capitán** tira de pistola mientras se acerca y estoquea de cerca.
  Con la mitad de la vida perdida camina una vez y media más rápido
  (`fury`). Es el jefe de la última tanda del vado y de la emboscada.

## Dónde están

Cada zona del mapa dice qué mezcla tiene (`mix` en
`src/world/maps/vado.ts`): sableadores en el cardal y la senda, tiradores
en el bañado y arriba de las tres lomas, un sargento en el monte de talas
y otro en la senda. Se rigen por las mismas reglas de guarnición que los
fusileros: una cantidad fija, y vuelven a su puesto recién cuando dejaste
la zona atrás.

## Los dibujos

Un concepto por clase, elegidos todos a la primera
(`assets/realista/concept/`). **Sólo existe la vista de frente**, que se
espeja según para dónde miren: no tienen espalda ni vistas diagonales. Se
decidió así para cuidar créditos; si de espaldas se ven raros, son 4 a 13
animaciones más.

Las hojas están en `assets/tropa/`, armadas por `tools/build_tropa.py`
desde los originales de SpriteCook (`*_original.png`). Lo que mide cada
una (cuadro, centro del cuerpo, escala, altura) está en
`src/tropa/looks.ts`.

| | Concepto | Animaciones |
|---|---|---|
| Sableador | `0f23ad40-3ba2-40e8-afcb-199c3cfe029d` | corre, tajo, muerte |
| Tirador | `e44cf539-249f-4144-adbc-26ef8bd1b692` | tiro, muerte |
| Sargento | `0474efee-84c1-4234-abc6-a3519786150c` | marcha, golpe, grito, muerte |
| El capitán | `f1a4b920-c4b7-4803-a964-cea47ae3aa16` | marcha, estocada, tiro, muerte |

Los ids de cada animación están en `spritecook-assets.json`.

## Lo que falta

- Vistas de espalda.
- Cantidades, vida y daño sin ajustar: eso es de la etapa de prueba.
- El tirador quieto usa el primer cuadro de su tiro; el sableador, el
  sargento y el capitán quietos usan el primero de su marcha.
