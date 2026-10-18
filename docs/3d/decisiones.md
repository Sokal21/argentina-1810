# 1810-3D: decisiones

Lo acordado antes de empezar (17 de octubre de 2026). Las tareas viven en beads, en la épica
`arg-ttn`; acá queda el porqué.

## Qué es
- Una prueba para pasar el juego a **3D completo** con aspecto pixel art: modelos low-poly con
  texturas chicas, dibujados a baja resolución con un pase pixel, **luz y sombras reales**.
  Se reusa todo el juego, no se copia el 2D: el look se *inspira* en los sprites.
- Primero un **vertical slice**: Cabral en un pedazo del vado, un realista, una carreta con
  bueyes, el ombú y una casa. Si sale bien y el método es repetible, se migra todo.
- La rama `1810-3D` diverge de main del todo: **no se rebasea**. Lo que interese de main
  (lógica nueva de un `brain.ts`, por ejemplo) se trae a mano con cherry-pick.

## Técnica
- **Three.js** sobre el mismo Vite + TS. Si el look queda sólido y el juego escala, Godot es el
  destino posible; por eso los modelos se guardan en glTF.
- Se reusa toda la lógica que no depende de Phaser (`src/world`, `src/machi`, los `brain.ts`,
  `src/story`, `src/npc`) y sus tests. Se reescriben las vistas.
- **Cámara fija, ortográfica**, inclinada 30°: el suelo se ve a la mitad de su fondo, igual que
  el 2:1 del 2D (`ISO_Y = 0.5`). Un pixel del render es una unidad del mundo, como un pixel del
  sprite; la cámara se ajusta a esa grilla para que nada tiemble. Cabral mide en pantalla lo que
  mide hoy.
- Coordenadas: el juego sigue pensando en las del 2D (x, y del suelo achatado). En 3D,
  `X = x`, `Z = y / ISO_Y`, `Y` es la altura. Un alto dibujado `h` es un alto real `h / cos 30°`.
- **Colisiones**: los mismos rectángulos de suelo (`footprint.ts`) sobre el plano. La física 3D
  queda como preocupación abierta (beads), para cuando aparezcan desniveles, saltos o arcos.
- **HUD**: el `HudScene` de Phaser tal cual, en un canvas transparente encima. Su estilo final se
  decide cuando se vea el resultado (en Diablo el HUD es dibujo, no render).

## Arte, todo con IA
- Los sprites miden 82 px: muy poco para un generador. Primero una **hoja de giro HD** (pose A,
  frente, lado, espalda y 3/4, luz plana) con SpriteCook, desde el sprite.
- **Tripo** como generador principal (low-poly limpio, rig de humanoides y cuadrúpedos, más de
  100 animaciones). **Meshy** de respaldo. Rodin queda afuera por el precio de su API.
- **Colores planos**: la textura de la IA, cuantizada a 8 a 16 colores tomados del sprite. Una
  herramienta de texturas, más adelante, si hace falta.
- **Animaciones**: de biblioteca (trote, reposo, rodada, muerte, tajo), por texto (mosquete,
  granada), y el **grito** como experimento de trazar articulaciones desde las 5 vistas de los
  sprites con la cámara conocida. Los giros desaparecen: en 3D el modelo rota.
- Blender lo maneja Claude, sin ventana, por scripts. El usuario no lo usa.
- Presupuesto de pruebas: USD 100.

## Proceso
1. Base sin IA: el look, con Cabral como muñeco.
2. Hoja de giro de Cabral.
3. Modelo con Tripo, cuantizado, en escena.
4. Rig y animaciones.
5. Experimento del grito.
6. Realista, carreta con bueyes, ombú y casa.

Al principio **el usuario valida cada paso**. Cuando el flujo esté afianzado, Claude chequea
solo (giros de cada modelo en Blender, capturas con Playwright) y dice cómo lo ve. Cada paso
aprobado se escribe en el momento como skill del manual de migración.

## El juego real, con el mapa todo en 3D (18 de octubre de 2026)
La rama es un fork aparte, pero el 3D se monta sobre el juego que ya tiene, no sobre una demo:
`index.html` sirve el juego real. Primero se probó dibujar el 3D debajo y dejar encima, en 2D, lo
que no tenía modelo; el usuario prefirió ir directo al mapa todo en 3D: quedan el menú, la
selección, el HUD y la hoja de experiencia, y en el mapa se pierden las charlas, los objetos, las
carretas y los interiores. Todos los enemigos son el realista 3D, con su IA de siempre; los
edificios y la gente, modelos simples.
