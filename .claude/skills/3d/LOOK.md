# The look

Approved by the user on the first try (17 October 2026): "me gustan los bordes y el efecto pixel".
Keep these values unless the user asks otherwise. Code: `src/three/view.ts`, `paint.ts`.

## Camera
- **Orthographic, fixed, pitched 30°** (`PITCH = asin(ISO_Y)`), looking north, no yaw. That
  angle foreshortens the ground by exactly the 2D game's 2:1, so maps, footprints and speeds
  keep their meaning.
- The frustum is `floor(screen / PIXEL)` units across: **one world unit per render pixel**.
- **Snap** the camera's position to whole units along its own right and up axes every frame
  (`View.follow`), so standing things do not shimmer as it moves. The sun's shadow camera is
  snapped to whole texels of its map for the same reason.

## Pixels, edges and the finishing pass
- Every number of the look lives in `LOOK` in `src/three/look.ts`, as the user tuned it in the
  panel (`src/three/panel.ts`, P in the game) and pasted back with its "Copiar config" button.
  To change the look, have the user tune it there and paste the JSON; write it into `LOOK`.
- `RenderPixelatedPass`, `OutputPass`, then the finishing pass (`finishing()` in `look.ts`),
  which works a world pixel at a time: colour, palette levels and Bayer dithering, grain,
  vignette, chromatic aberration, CRT bulge, scanlines.
- Chosen: 3 screen pixels per world pixel; edges `creases 0.3` (lighter, along folds) and
  `outlines 0.89` (darker, along silhouettes), in the object's own colour, which is why they suit
  art that has no black lines; chromatic aberration 0.9; scanlines 0.05; nothing else.
- Renderer at pixel ratio 1, canvas `image-rendering: pixelated`, no antialias.

## Light and colour
- A hemisphere light (sky `#cfd8dc`, ground `#8a7a50`, 1.6) and one sun (`#fff1d6`, 2.4) high
  behind the left shoulder (50° left, 55° up), hard shadows (`BasicShadowMap`, 2048, ±900 units
  round the hero).
- Materials are `MeshToonMaterial` in **three hard steps** (0.45 to 1) through `flat()`;
  `shadeIn()` changes the steps of every one.
- Flat colours: a shape of several colours is built from `part()` pieces, each painted one
  colour per vertex, `joined()` into one geometry. Faces are kept apart so each lights flat.

## Standing a map up (`src/three/world.ts`)
- **Ground**: one plane, a canvas texture of 8×8 patches per plot in the map's own `ground`
  colours, nearest filtered. Ground nobody crosses is 0.72 darker; water from `waterLevels`.
- **Plants**: exactly where `plantCountry` puts them, one `InstancedMesh` per kind, sized by
  `GROWN`, each instance slightly lighter or darker. Footprints reckoned as `country.ts` does.
- **Fences**: `palisade` and `walls` posts, instanced.
- **Buildings**: a box `wide × tall·UPRIGHT × deep` back from the front foot on its plot, a
  gabled roof, a door; footprint as `raiseBuildings`.
- Anyone without a model yet: `figure()` in `src/three/figure.ts`, blocks in their colours.

## Moving the hero
`MachiController` with the character's kit, `Keys` for input, `Stamina` for running; then
`pushOut` against every footprint and `walk` against the map, as `GameScene` does. The figure
turns toward the way it moved (`heading`).

## HUD
The 2D `HudScene` on a transparent Phaser canvas over the 3D one (`src/three/hud.ts`), reading a
stand-in scene called `game` that forwards what the 3D game knows (`Readings`).

## The harder look (19 October 2026)

Asked for as "darker, dirtier, harder, sadder colours", and laid over the look the user had chosen
(`HARSH` over `CLEAN` in `look.ts`; the panel's "estética dura" puts either back to compare). Less
saturation and a little more contrast; cold grey-blue in the darks and dull ochre in the lights; a
greyer sky, a weaker and less warm sun, a darker bounce from the ground; and three things of the
finishing pass's own: the deepest darks crushed toward black (`crush`; pushed into the mid tones it
blacked out Cabral's coat), every colour drawn toward one dull olive (`murk`), and grime, blotches
and specks held to the world by the camera's place (`grime`), so they go by with the ground. No
moving grain: it read as rain.
The finishing pass works on the screen's colours: its tints are handed over as written, not as
Three's linear colours, which came out nearly black.
