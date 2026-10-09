# Personajes y criaturas de 1810: Argentina

Acá se guarda qué es cada personaje y cada criatura del juego: su concepto,
cómo se ve, cómo pelea y por qué se decidió así. Es la referencia a la que
volver cuando haya que dibujar algo nuevo de ellos, sumar una habilidad o
diseñar a alguien que conviva con ellos.

| | Qué es | Documento |
|---|---|---|
| **Inti** | Machi mapuche. Maga de rango, usa maná | [inti.md](inti.md) |
| **Cabral** | Granadero a caballo. Guerrero cuerpo a cuerpo, usa furia | [cabral.md](cabral.md) |
| **Chonchón** | Cabeza voladora de un kalku. Enemigo | [chonchon.md](chonchon.md) |
| **Soldado realista** | Infante español. Enemigo: dispara de lejos, sable de cerca | [realista.md](realista.md) |

## El juego

RPG de acción en vista isométrica, pixel art, ambientado en la Argentina de
1810 con una vuelta fantástica y oscura. Se juega en el navegador. Va a
tener varios protagonistas, así que lo que representa al juego (título,
favicon, pantalla de inicio) no se ata a ninguno de ellos.

## Reglas de estilo que comparten todos

- **En el juego:** colores planos, sin sombreado, sin contornos y **sin
  cara**. La cabeza es una sola forma del color de la piel. El detalle sale
  de la silueta y de unos pocos acentos. Referencia: Children of Morta, pero
  más plano.
- **En las ilustraciones** (selección de personaje y similares): al revés.
  Ahí sí tienen cara, expresión, sombreado y textura.
- Tono serio y algo oscuro. Nunca tierno ni caricaturesco.
- **Letra:** Jacquard 12, una gótica en píxeles, para todo lo que el jugador
  lee (título, selección, pausa, notas del HUD). Solo queda nítida a 21 px y
  sus múltiplos. Las teclas de los casilleros van en Silkscreen.
- Cada personaje tiene **un color de acento** que es el único que brilla en
  él, y que se repite en sus efectos y en su HUD.

| | Acento | Dónde aparece |
|---|---|---|
| Inti | Celeste `#46e6fa` | Luz de la rama, hechizos, rayo, orbe de maná, estela del dash |
| Cabral | Naranja chillón `#ff7a00` | Furia, latigazo del sable, fuego, estela de la rodada |
| Chonchón | Amarillo verdoso enfermo | Ojos |
| Nahuel | El celeste de Inti | Anillos, ojos, halo y fuego fatuo |
| Realista | Rojo sobre blanco crema | Vueltas de la casaca, escarapela |

## Cómo mantener estos documentos

Cuando cambie algo de un personaje (una habilidad nueva, un número de
balance importante, una decisión de diseño), se actualiza su documento en el
mismo cambio. Los números que figuran acá son los vigentes al momento de
escribirlos; la fuente de verdad es el código, y cada documento dice en qué
archivo vive cada cosa.

Cómo se generan y arreglan los sprites está en
[`.claude/skills/sprites/SKILL.md`](../../.claude/skills/sprites/SKILL.md).
