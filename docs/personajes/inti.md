# Inti

**Machi mapuche. Maga de rango.**

"Machi" es lo que es: la persona que cura y media con los espíritus en la
cultura mapuche. **Inti** es su nombre en el juego, por el dios del sol. Fue
el primer personaje que se hizo.

## Concepto

Una mujer joven que pelea de lejos con lo que le dan las plantas y los
espíritus. No es una hechicera de túnica y báculo: lleva lo que lleva una
machi, y de ahí salen sus poderes.

- En la mano de un lado, el **kultrún**: tambor ceremonial redondo y chato,
  con una cruz pintada en el parche.
- En la otra, una **rama de canelo** (foye), el árbol sagrado. De la rama
  salen sus hechizos, que brillan en celeste.

Es frágil y tiene que mantener distancia. Su defensa es moverse y curarse.

## Cómo se ve

- **Pelo:** negro, en dos trenzas largas.
- **Cabeza:** vincha de plata (trarilonko).
- **Ropa:** vestido negro largo (küpam) con faja roja ancha en la cintura;
  manto azul pizarra (ikülla) sobre los hombros, que **no es negro**: es
  oscuro pero se distingue del vestido. Un pectoral de plata en el pecho.
- **Sin cara** en el juego.
- **Altura:** unos 81 píxeles de alto dentro de un cuadro de 94.

Colores de referencia: manto `(52,65,81)` con sombra `(40,49,62)`; luz de
los hechizos `(70,230,250)`; verdes de la rama `(46,70,38)`, `(62,90,50)`,
`(78,112,63)`.

### Decisiones de diseño que costaron varias vueltas

- Empezó demasiado realista, pasó por demasiado infantil, y terminó en el
  punto actual: formas simples pero serias.
- Se le sacaron las sombras de la ropa y casi todos los bordes, porque eran
  lo que la hacía ver realista.
- El kultrún originalmente tenía rayos dibujados; se le sacaron.

## Cómo pelea

Los números son los vigentes al escribir esto. Viven en `src/machi/data.ts`,
`src/machi/abilities.ts` y `src/scenes/GameScene.ts`.

| | |
|---|---|
| Vida | 5 golpes |
| Velocidad | 70 píxeles por segundo |
| Recurso | **Maná**: 100, arranca lleno, vuelve solo a 6 por segundo |

### Ataque básico: hechizo

Mantiene el ataque y lanza orbes celestes desde la punta de la rama hacia
donde apunta el cursor. Puede caminar mientras castea, más lento (un tercio
de su velocidad), incluso retrocediendo mientras apunta hacia adelante.
Gratis. Cada orbe hace 1 de daño.

### Dash: derrape

No rueda: se desliza de costado, bajo, con el manto y las trenzas volando.
Deja una estela de ecos celestes. Es inmune mientras dura. Recorre 84
píxeles en 0,32 segundos.

### Q — Rayo del Pillán

Los pillán son los espíritus del trueno. Manteniendo Q se ve el alcance y el
área; al soltar queda marcada la zona, y 0,8 segundos después cae un rayo.

| Costo | Recarga | Alcance | Radio | Daño |
|---|---|---|---|---|
| 35 de maná | 4 s | 160 | 45 | 2 a todo lo que esté adentro |

### E — Lawen

*Lawen* es la medicina de hierbas. Se queda quieta un segundo haciendo el
ritual, con la rama encendida en verde. Si termina, recupera 2 de vida. Si
la golpean en el medio se corta y el maná se pierde igual. No se puede usar
con la vida llena.

| Costo | Recarga | Canalización | Cura |
|---|---|---|---|
| 45 de maná | 8 s | 1 s | 2 de vida |

### Definitiva: cómo se carga

Todo lo que mata deja un **orbe** celeste donde cayó. Dura unos 3,5 segundos,
flotando, y parpadea cada vez más rápido antes de apagarse. Si Inti llega
hasta él, lo junta. Hacen falta 14 para cargarla.

La gracia es la tensión: ella pelea de lejos, pero para cargar tiene que ir
hasta donde cayó el enemigo.

La carga no se pierde con el tiempo ni al morir. Mientras el nahuel está
afuera, los orbes que junte no cargan el siguiente.

### R — Nahuel

Su definitiva: llama al **nahuel**, el jaguar de los mapuches, como
espíritu. Lo llama **tocando el kultrún**: lo levanta frente al pecho y lo
golpea con la rama de canelo como palillo. Sobre el golpe, el nahuel sale de
un destello celeste a su lado, y se queda 12 segundos.

- **Caza solo.** Corre hacia el enemigo más cercano y lo ataca a zarpazos (2
  de daño cada uno); cuando cae, va por el siguiente. Sin nada que cazar,
  vuelve junto a ella.
- **Se lleva el agro.** Los enemigos que estén más cerca de él que de Inti
  lo atacan a él. Los que queden cerca de ella la siguen buscando: le saca
  de encima a una parte, no a todos.
- **No se lo puede matar:** es un espíritu, y lo que le tiren no le hace
  nada.

Es lo opuesto a la de Cabral: él se vuelve imparable de cerca; ella pone a
alguien entre los enemigos y ella, y sigue peleando de lejos.

**Cómo se ve:** pelaje azul pizarra en tonos planos, más claro en el lomo y
más oscuro abajo, con anillos celestes (el color de los hechizos de Inti),
ojos y punta de la cola celestes, hocico crema y una cinta roja en la pata.
**Sin contornos**: la profundidad sale solo de las sombras planas. La
generación insiste en devolverle líneas oscuras; `tools/build_nahuel_sheet.py`
las repinta en cada hoja.

Lo que lo hace espíritu se le agrega por shader, sin tocar el dibujo
(`src/fx/SpiritFX.ts`): un halo de su propio celeste alrededor del cuerpo, un
fuego fatuo leve que le sube del lomo, los ojos y los anillos que laten
hacia el blanco, y una luz que proyecta sobre el suelo.

Dos vistas, de frente y de espalda, espejadas, con carrera y ataque. Los
números viven en `src/nahuel/brain.ts` y `src/tuning.ts`. Poses base: frente
`1aa586cf-d718-4bcd-ab88-3085e4a4c4bd`, espalda
`464d1717-d854-420c-832d-2891eac9477a`; concepto detallado
`15578683-1789-487b-8074-f72201f8269c`.

### Muerte

Suelta el kultrún y la rama, que quedan en el suelo; cae de rodillas; cae
hacia adelante y queda tendida boca abajo. Se usa la misma animación mire
hacia donde mire.

## Su HUD

Todo naturaleza: dos orbes de vidrio sostenidos por raíces retorcidas, con
ramas, hojas, hongos y musgo. Entre los dos, un tronco caído con cuatro
casilleros enmarcados en ramitas, y un colgante tejido mapuche al centro.
Vida en rojo a la izquierda, maná en celeste a la derecha.

## Su carta de selección

La ilustración grande con que se la elige antes de jugar. Ahí sí tiene cara:
serena y compuesta, **esbelta y alta**, de cuerpo entero. Levanta la rama de
canelo encendida en celeste y sostiene el kultrún al costado, envuelto en la
luz verde de la curación. Detrás, la Patagonia de noche: araucarias, un
volcán nevado, un lago, la Cruz del Sur, un guanaco, y el **Sol de Mayo**
asomando entre las nubes; pastos y ceibos en flor al frente.

Se probó con un rayo cayendo a su espalda y se sacó de la imagen quieta: el
rayo aparece solo en la animación, cuando la carta está elegida.

Archivo: `assets/seleccion/inti.png` (12 cuadros de 183×320). Carta fija
`c201955f-57ed-4ce5-9cc6-07ac1b23323e`; la que se animó,
`7162bd0d-ff15-43cd-9eb9-59c3aa7f0c7e`; animación
`c83fcc28-10a1-43dc-9282-2f936f51c75c`.

## Animaciones que tiene

Cinco vistas dibujadas (abajo, diagonal abajo, costado, diagonal arriba,
arriba), espejadas para cubrir ocho direcciones.

- Reposo (agita la cabeza, las trenzas y los brazos; con pausa entre
  repeticiones)
- Trote
- Giros entre todas las vistas, caminando y parada, incluida la media vuelta
  y el cambio de lado
- Ataque caminando, ataque parada y ataque retrocediendo
- Dash
- Curación (solo de frente)
- Llamado del nahuel, tocando el kultrún (solo de frente)
- Muerte (solo de frente)

## Poses base en SpriteCook

| Vista | Asset |
|---|---|
| Frente tres cuartos | `e13e65f7-f90f-4af3-8f60-f1ee4bd11d37` |
| Espalda tres cuartos | `973a5c40-df50-4940-a46b-69d0ef387632` |
| Frente recto | `2e51c2ae-57b4-411e-8fc3-18a5e787c05a` |
| Espalda recta | `52d9116f-23d2-488d-84fc-2ea59cbb9bdd` |
| Diagonal abajo | `d244941b-fc51-4389-9a91-137fdd799967` |

El resto está en `spritecook-assets.json`.
