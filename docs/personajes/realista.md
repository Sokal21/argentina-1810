# Soldado realista

**Infante de línea del rey de España. Enemigo.**

Es el enemigo propio de Cabral, como el chonchón lo es del mundo de Inti:
los soldados que defienden la corona contra la revolución.

## Concepto

Tiene que leerse como **lo opuesto a Cabral** a primera vista, para que en
una pelea nunca se confundan: casaca clara contra azul oscuro, bicornio
contra morrión.

Pelea distinto según la distancia: de lejos dispara, de cerca saca el sable.
Acercarse le anula el mosquete pero no lo deja indefenso.

## Cómo se ve

- **Casaca** blanca crema de infantería de línea, con cuello, puños y
  solapas **rojas**.
- Dos **correas blancas** cruzadas al pecho y cartuchera negra a la cadera.
- Calzón blanco, **polainas negras** hasta la rodilla y zapatos negros.
- **Bicornio** negro con la escarapela **roja** de España.
- **Mosquete** largo en las dos manos, cruzado al cuerpo.
- **Sable** corto con guarda dorada colgado a la cadera.
- **Sin cara** en el juego, como todos.

Se eligió el concepto A de tres (el más flaco, con la casaca más limpia) y
de ahí la versión simplificada 1, la única donde el sable se leía bien.

## Cómo se comporta

Los números viven en `src/realista/brain.ts`.

| | |
|---|---|
| Vida | 4 golpes |
| Paso | 36 píxeles por segundo; la mitad mientras recarga |
| Te ve desde | 300 |
| Reaparece | a los 7 segundos, donde empezó |

1. **Avanza** marchando hasta tenerte a tiro (190).
2. **Dispara**, si estás lejos. Se echa el mosquete al hombro y apunta: ese
   es el aviso, de 0,85 segundos. En el último cuarto de segundo deja de
   seguirte, así que la bala va a donde estabas. La bala es rápida (330)
   pero se puede esquivar caminando de costado o con el dash.
3. **Recarga** entre 2,2 y 3,2 segundos. Mientras tanto sigue acercándose,
   más despacio.
4. **Sablazo**, si estás cerca (menos de 48). No puede disparar a
   quemarropa: si te le metés adentro mientras apunta, suelta el tiro y saca
   el sable. El tajo tarda medio segundo en caer y alcanza 44; si te alejás
   a tiempo, corta el aire.

Un golpe mientras apunta **le hace perder la puntería**: tiene que volver a
echarse el mosquete al hombro.

## Animaciones que tiene

Dos vistas dibujadas para caminar y para el sable, tres cuartos de frente y
tres cuartos de espalda, espejadas, como el chonchón; para apuntar tiene
cinco direcciones. Todas dibujadas mirando a la derecha.

- Marcha, de frente y de espalda
- Disparo (sube, apunta, dispara, baja) en cinco direcciones: de costado,
  diagonal abajo, recto abajo, diagonal arriba y recto arriba. Se elige la
  que tenga el caño más cerca del ángulo real del tiro
- Sablazo (desenvaina, carga, tajo, vuelve), de frente y de espalda
- Muerte (solo de frente): suelta el mosquete, cae de rodillas y queda
  tendido boca arriba

## Poses base en SpriteCook

| Vista | Asset |
|---|---|
| Frente tres cuartos | `98eaf9a7-890f-498c-9111-5c9f770fb81a` |
| Espalda tres cuartos | `485c6f5e-41df-4f35-98d5-92f4aa876b4a` |

El concepto detallado del que salió es
`8beeb229-57a5-4d9f-b644-baab24ff9eb1`.

## Otros realistas que se podrían sumar

Sin conversar todavía: un oficial con espada que mande a los demás, un
artillero con cañón, un jinete.
