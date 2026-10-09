# Chonchón

**Cabeza voladora de un kalku. Enemigo.**

En la mitología mapuche, el chonchón (o tué-tué, por su grito) es un kalku,
un brujo que hace el mal, que se untó la garganta con un ungüento, dejó el
cuerpo en su casa y salió de noche a hacer daño. Verlo es presagio de
muerte.

Fue el primer enemigo real del juego. Queda el kalku como jefe natural para
más adelante.

## Concepto

Tiene que verse como **una persona**, no como un bicho: eso es lo que lo
hace inquietante. Es una cabeza humana que vuela.

Complementa a los enemigos que tiran de lejos: el chonchón te persigue y te
obliga a moverte y a usar el dash.

## Cómo se ve

- **Cabeza de hombre** adulto, flaca, de piel gris ceniza tirando a
  violácea. **Sin cuello**: termina debajo de la mandíbula.
- **Expresión demencial:** ojos redondos, grandes y desparejos, con
  pupilas, en amarillo verdoso; boca abierta en una sonrisa torcida con
  dientes.
- **Lengua** roja, larga, fina y puntiaguda, colgando afuera.
- **Alas de murciélago** donde irían las orejas, tal cual: membrana violeta
  oscura con los huesos de los dedos.
- **Pelo** negro, largo y lacio, que cuelga y flamea hacia atrás como una
  cola.
- **Trarilonko** tejido en rojo y blanco en la frente: marca que fue una
  persona de la misma cultura y no un demonio genérico.

Es el único con cara en el juego, y es a propósito: la cara es el personaje.
Aun así está dibujado con muy pocos píxeles, al nivel de detalle de Inti.

Se eligió una versión **muy simplificada** entre varias. Las primeras eran
más detalladas y con sombreado.

## Cómo se comporta

Los números viven en `src/chonchon/brain.ts`.

| | |
|---|---|
| Vida | 2 golpes |
| Altura de vuelo | 40 píxeles sobre el suelo, con sombra abajo |
| Reaparece | a los 6 segundos |

1. **Ronda.** Vuela alrededor a unos 95 píxeles, sin quedarse quieto,
   cambiando de sentido cada tanto.
2. **Picada**, si estás lejos. Se frena, se le salen los ojos y la lengua se
   pone tiesa y **gira hasta apuntarte**: ese es el aviso, de medio segundo.
   Después sale disparado en línea recta hacia donde estabas y se pasa de
   largo.
3. **Recuperación.** Queda bajo y lento un segundo mientras remonta. Es la
   ventana para castigarlo.
4. **Mordida**, si estás cerca. No puede hacer la picada: abre la boca y
   muerde. Si te alejás a tiempo, muerde el aire.

El dash esquiva las dos cosas.

Dos ataques distintos según la distancia fue una decisión explícita: así
acercarse no es una forma de anularlo.

## Animaciones que tiene

Dos vistas dibujadas, tres cuartos de frente y tres cuartos de espalda,
espejadas. Como flota y casi siempre mira al jugador, no necesitó las cinco.

- Vuelo (aleteo), de frente y de espalda
- Aviso y picada, de frente y de espalda. El sprite además **se rota** para
  que la lengua apunte hacia donde va, así sirve para cualquier ángulo
- Mordida (solo de frente)
- Muerte (solo de frente): cae y queda hecho un montón que se desvanece

## Poses base en SpriteCook

| Vista | Asset |
|---|---|
| Frente tres cuartos | `86a6541e-2e2c-4eb0-905a-9522b7a1cd6b` |
| Espalda tres cuartos | `9dfc0e07-a680-4754-aa63-888db7c9058f` |

El concepto detallado del que salió es
`90371287-9078-4de6-b335-8822dc588994`.

## Otras criaturas que se pensaron

Quedaron conversadas como candidatas, todas de la mitología mapuche:

- **Anchimallén:** ser pequeño que se vuelve una esfera de fuego; sirve a un
  kalku.
- **Colo Colo:** mitad rata, mitad culebra. Bicho de grupo, cuerpo a cuerpo.
- **Piuchén:** serpiente alada que paraliza con su silbido.
- **Witranalwe:** jinete no-muerto. Élite que carga a caballo.
- **Cherufe:** criatura de roca y magma. Tanque o jefe de zona.
- **Kalku:** el brujo. Jefe; invoca chonchones y anchimallenes.
- **Nguruvilu:** zorro con cola de serpiente, en zonas de agua.

El Trauco y el Invunche son de la mitología chilota, no mapuche
propiamente.
