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

### Muerte

Suelta el kultrún y la rama, que quedan en el suelo; cae de rodillas; cae
hacia adelante y queda tendida boca abajo. Se usa la misma animación mire
hacia donde mire.

## Su HUD

Todo naturaleza: dos orbes de vidrio sostenidos por raíces retorcidas, con
ramas, hojas, hongos y musgo. Entre los dos, un tronco caído con cuatro
casilleros enmarcados en ramitas, y un colgante tejido mapuche al centro.
Vida en rojo a la izquierda, maná en celeste a la derecha.

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
