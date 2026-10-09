# Cabral

**Granadero a caballo. Guerrero cuerpo a cuerpo.**

Por el sargento **Juan Bautista Cabral**, el granadero correntino, de
ascendencia guaraní y africana, que murió en San Lorenzo en 1813 salvando a
San Martín. El Regimiento de Granaderos a Caballo se crea en 1812, no en
1810; se toma la licencia.

## Concepto

Es lo opuesto a Inti. Ella pelea de lejos y administra un recurso que se
agota; él se mete en el medio y **tiene que arriesgarse para tener
recurso**.

| | Inti | Cabral |
|---|---|---|
| Distancia | Lejos | Cuerpo a cuerpo |
| Recurso | Maná: arranca lleno y se gasta | Furia: arranca vacía y se gana peleando |
| Cuando ataca | Puede caminar | **Se queda parado** |
| Dash | Derrape | Rodada |
| Se mueve | Más lento | Más rápido |

Su ritmo es: entrar, pegar para cargar furia, gastarla en algo fuerte,
volver a cargar.

## Cómo se ve

- **Uniforme de granadero**, gastado: casaca azul oscuro con cuello y puños
  rojos, botones de bronce, **bandolera blanca** cruzada al pecho (es lo que
  lo hace reconocible), pantalón azul con franja roja, botas negras altas.
- **Morrión** negro, alto, con placa de bronce y un penacho rojo **corto**.
- **Sable corvo** en la mano derecha y **mosquete** colgado a la espalda.
- Piel morena. **Sin cara** en el juego.
- **Más alto y corpulento que Inti.**

### Cosas a cuidar cada vez que se dibuja algo suyo

Están resueltas en `tools/build_cabral_sheet.py`, pero conviene saberlas:

- **La cabeza tiene que mirar hacia donde va el cuerpo.** Sin cara, la
  dirección se lee por el lado de la visera y de la piel; el primer diseño
  los tenía cruzados.
- **El penacho crece** al animarlo, hasta el triple. Se recorta.
- **Sale del mismo alto que Inti contando el morrión**, o sea más chico de
  cuerpo. Se agranda un 15%.
- **Las vistas de espalda salieron sin el sable** en el diseño; se les
  agregó.
- A diferencia de Inti, sus vistas de costado y de espalda están dibujadas
  **yendo hacia la derecha**.

## Cómo pelea

Los números son los vigentes al escribir esto. Viven en `src/machi/data.ts`
(su `Kit`), `src/machi/fury.ts`, `src/machi/musket.ts` y
`src/machi/grenade.ts`.

| | |
|---|---|
| Vida | 5 golpes, igual que Inti por ahora |
| Velocidad | 84 píxeles por segundo, un 20% más que Inti |
| Recurso | **Furia**: 100 de tope, arranca en cero |

### Furia

- Sube **12** por cada enemigo que alcanza un sablazo.
- Sube **20** por cada golpe que recibe.
- Si pasa **4 segundos** sin pegar ni recibir, baja 10 por segundo.
- Se pierde entera al morir.
- Las habilidades la gastan y **no** la cargan.

### Ataque básico: sable corvo

Se planta y lanza un tajo con zancada: se agazapa, lleva el sable atrás, cae
sobre la pierna de adelante barriendo a ras del piso y vuelve. Tiene que ser
**eufórico**, con mucho cuerpo y cambio de piernas; la primera versión, con
los pies clavados, se descartó por tímida.

Pega a todo lo que esté en un **cono** frente a él. Hace el doble que el
hechizo de Inti.

| Duración | Alcance | Ancho del cono | Daño |
|---|---|---|---|
| 0,5 s, pega a los 0,26 | 84 | 150° | 2 |

El efecto es un latigazo de luz blanca con borde naranja, sólido y de
contorno neto (se probó difuminado y no gustó), con chispas en lo que
alcanza y un sacudón de cámara cuando conecta.

### Dash: rodada

Se tira de cabeza, rueda sobre el hombro y sale en cuclillas. Más lenta que
el derrape de Inti para que se lea. Deja una estela naranja. Es inmune
mientras dura.

| Duración | Distancia |
|---|---|
| 0,5 s | 96 |

### Q — Tiro de mosquete

Manteniendo Q se descuelga el mosquete y apunta al cursor; con el arma
arriba, **el clic dispara**. Soltar la Q sin disparar la baja sin gastar
nada. Queda quieto mientras apunta y mientras dispara.

La bala es muchísimo más rápida que un hechizo, no atraviesa, y **explota**
en el primer enemigo que toca, dañando todo lo que esté en el radio. Si no
toca nada, se pierde. La recarga es lenta a propósito: es un recurso para un
momento, no para repetir.

| Costo | Recarga | Velocidad | Alcance | Radio | Daño |
|---|---|---|---|---|---|
| 30 de furia | 9 s | 1.500 | 420 | 46 | 2 |

### E — Granada

Funciona igual: mantener E para apuntar, clic para arrojar. Vuela en arco,
con bastante alcance y poca área, y tarda en caer. Al caer explota y **deja
el suelo ardiendo**.

Lo que agarra la explosión o pisa el fuego **se prende**: sigue quemándose
unos segundos aunque salga, con manchas naranjas que le suben por su propia
textura y chispas que se le desprenden. No son llamas encima.

El fuego del piso es una mancha de brasas despareja, que se degrada hacia
afuera hasta tierra chamuscada, casi sin llama, y va por debajo de todo.

| Costo | Recarga | Alcance | Vuelo | Radio | Explosión | Fuego | Quemadura |
|---|---|---|---|---|---|---|---|
| 40 de furia | 12 s | 200 | 0,55 a 0,95 s | 30 | 2 | dura 4,5 s | 1 cada 0,5 s, sigue 3 s |

### Muerte

Recibe el golpe en el vientre y se le cae el sable; se dobla agarrándose el
estómago; cae de rodillas; el torso se le vence y cae sobre sus propias
piernas. Queda arrodillado y doblado en dos, con el morrión volcado
adelante. **No cae tendido**, a diferencia de Inti.

### Reposo

Cada tanto levanta la mano libre y se acomoda el morrión. La idea original
incluía acomodarse los hombros, pero a este tamaño casi no se ve.

## Su HUD

Militar de la época, de **madera, piedra y hierro**; nada de naturaleza. En
lugar de orbes, **frascos** panzones con corcho, sostenidos por jaulas de
flejes de hierro sobre un zócalo de piedra. Entre los dos, un tablón macizo
con esquineras de hierro, correas de cuero con hebilla, y los cuatro
casilleros. Arriba, **empanadas** y una pirámide de **balas de mosquete**.
Al centro, una placa de bronce con la granada llameante de los granaderos.

Vida en rojo a la izquierda, furia en naranja a la derecha.

## Animaciones que tiene

Las mismas cinco vistas que Inti.

- Reposo
- Trote
- Giros entre vistas vecinas, media vuelta y cambio de lado (armados por
  script con cuadros de otros giros). No tiene giros parado: no los necesita
  porque no apunta sin atacar.
- Tajo de sable
- Rodada
- Mosquete: sube, apunta, dispara, guarda
- Granada: saca, carga, arroja, vuelve
- Muerte (solo de frente)

## Poses base en SpriteCook

Son las corregidas, las que hay que usar para animar.

| Vista | Asset |
|---|---|
| Frente tres cuartos | `7c75032f-5dfd-4f4c-b973-ea32da3b3fa2` |
| Frente recto | `a5742f18-51d7-47c8-aaea-4828a5188a0e` |
| Diagonal abajo | `ad81f7b2-9723-4584-a48a-31938c66d168` |
| Espalda tres cuartos | `81ca3c63-6784-470b-9b35-d6ca154de9e9` |
| Espalda recta | `73948811-f137-4636-b853-44a9d25036e8` |

El diseño detallado del que salió es `ac5ce9ba-98c6-4581-92a8-6b305129f42c`.
El resto está en `spritecook-assets.json`.
