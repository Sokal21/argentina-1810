# Scenery and maps

What was learned making the Patagonian forest, Inti's first map. The rules in
`SKILL.md` for characters still hold where this says nothing.

## What a map is

Agreed with the user, after Diablo: a **map** is one stretch of country walked
from end to end without a break. At its heart is a **safe zone** (Inti's is a
Mapuche camp); around it the map spreads into named **zones** (Bosque, Bosque
oscuro, Bosque de los espíritus) that hold the objectives. A hero has a first
map, and more later.

- A map is drawn in letters, a grid of plots, in `src/world/maps/`. Change its
  shape by editing that text; `faults()` and its test say whether it still
  holds together.
- **Judge its size by walking time**, at the hero's speed, from the safe zone
  to the furthest objective. The first map was crossed in under a minute and
  the user found it small at once; about a minute from camp to an objective,
  in a straight line with no fighting, was accepted.
- **Nothing is placed by hand.** Trees are planted by rule from the map
  (`src/world/trees.ts`), so the wall follows the map when its shape changes.
  Give every random draw a seed number of its own: a tree's height once
  reused the draw that had just decided to plant it, and every tree came out
  the same.
- Zones are told apart by what stands on them, never by the colour of their
  ground. Blocks of colour with straight edges were the first thing the user
  asked to remove.

## The look of scenery

- Scenery may carry **more detail than the characters**; the user said so.
  The ceiling is "super realistic pixel art", which was rejected.
- The level that was chosen: foliage as big rounded clumps of three flat
  greens, thin bare branches, no leaves drawn one by one. `araucaria_e` in
  `spritecook-assets.json` is the reference for it.
- Trees are araucarias (pehuén), not generic pines: sacred to the Mapuche
  and what the region looks like. A second, broad-crowned species (coihue or
  lenga) is still owed, to break up the wall.

## Generating a piece of scenery

1. First round: `gemini-3-pro-image`, three variations, Inti as
   `style_asset_ids`. They come back in three different manners (dithered,
   flat bands, shaded); it is a choice of manner, not of detail.
2. The user picks. Every later piece is generated with that pick as
   `reference_asset_id`, and comes back in the same manner reliably.
3. **The chosen level of detail only exists at about 82 pixels.** Asked for
   200, the model returns either 82 again or a finely detailed 198 pixel
   tree. So generate small and let the game enlarge it: about twice for a
   tree standing in a zone, three times for the wall at the map's edge.
4. `tools/build_forest_trees.py` cuts them ready: trimmed, trunk on the bottom
   row and centred, a margin at each side for the crown to sway into, and
   **all the same size**, which the wind shader counts on. Add new trees to
   its table and to `TREES` in `src/world/scenery.ts`.

**The ground is painted in code**, not generated (`src/world/grass.ts`).
SpriteCook's ground textures came back loud, with leaf litter and high
contrast, and Inti was lost on them. What works is quiet drifts of a few
very close colours with an occasional tuft.

## What the game does to scenery

Each of these was asked for by the user and tuned by them running it:

- **Shadows**: a thing's own shape laid over on the ground, from one fixed
  light. No shader is needed. A light that moves with the hero was discussed
  and left for later.
- **Wind** (`src/fx/wind.ts`): the whole tree leans from its foot, trunk
  included, in uneven gusts that cross the map, each tree rocking in its own
  time and its crown shivering. Where a tree stands and what sets it apart
  reach the shader through its **tint**, so a tree is never tinted for
  colour, and is turned by drawing it mirrored, never by flipping it.
- **No two trees alike**: each has a height and a shade of its own.
- Thick country and trunks stop the hero; a crown that hides her thins out.

**Start strong.** The first wind, the first variation in height and the
first variation in shade were each reported as too subtle to see. Set a new
effect where it is plainly visible and let the user turn it down.

## Keeping it fast

The game ran slowly on Cabral's map once it was full of plants, and the user
asked for these to be written down. Phaser does none of this for you.

- **Nothing is left out for being off screen.** Phaser works out every image
  in a scene each frame, wherever the camera is. The vado has some 14,700
  standing things (5,840 plants, as many shadows, 929 posts, 2,075 slices of
  wall) and about 200 are ever in view. Anything stood on a map in numbers
  is handed to the scene's `Sight` (`src/world/sight.ts`), which rules the
  ground into squares and shows only those near the camera. Pass it to
  whatever raises new scenery, as `Forest`, `Country` and `raiseFences` do.
- A loop over all of a map's things each frame (`reveal`) skips the ones not
  visible. Do not add another that looks at every plant.
- **Hidden is also off the draw list.** `Sight` takes what it hides off the
  scene's display list, which Phaser sorts by depth every frame anything
  moves: 15,000 things to sort became 1,100.
- **One picture for everything drawn together** (`packed` in
  `src/world/scenery.ts`). Every change of texture or of pipeline between one
  thing and the next in depth is a draw call. Measured in October 2026, the
  village took **790 draw calls a frame**, one per plant, shadow and post,
  which on a phone was most of the cost. Now all the plants of the open
  country (each way round) are one grid in one picture, the fence posts lie
  under that grid in the same picture and are drawn by the wind as things
  that stand still, and all the shadows are another picture: **about 50 draw
  calls**. The wind shader reads which cell of the grid it is in (`uCells`,
  `uGrid`). A new plant goes into `PLANTS` and is packed with the rest; a new
  thing drawn among plants should go in the same picture, not a loose one.
  Inti's forest is still loose (three drawings; it measured 55 calls).
- **Keep a drawing's canvas tight.** The wind shader runs its noise on every
  pixel of the canvas before it knows whether anything is drawn there, and
  the canvas is shown at twice or more its size. All drawings of plants share
  one size (206 by 141) because the shader counts on it: make that size as
  small as the largest of them allows, not generous.
- **An effect worn by one sprite costs a pass over the whole screen**, and
  cuts the batch in two around it, however small the sprite. `HitFX` is given
  with `HitFX.on(sprite)` and puts itself on only while the sprite flashes or
  burns. Do the same for any new effect on a sprite: never leave a post
  pipeline on at rest. Keep the copy and switch it (`hasPostPipeline`)
  instead of removing and adding it, which compiles the shader again.
- **A shader over the whole view is paid for per screen pixel.** The grass
  (`src/fx/meadow.ts`), the water and the camera's `LookFX` each run on every
  pixel of the window, at the window's size, though they draw in sprite
  pixels at a zoom of two: four times the work the picture needs. Before
  adding another, or a loop inside one, count what it does per pixel. Still
  owed: drawing grass and water into a texture at sprite size and showing
  that enlarged.
- Things made each frame (an array spread from two others, a list of every
  foe) are small but add up; walk what is already there.
- **These are judged by measuring, running.** Count draw calls, program
  and texture changes by wrapping the WebGL context's `drawElements`,
  `useProgram` and `bindTexture` for a few seconds at several places of the
  map; time `displayList.depthSort` and the scene's `update`. Headless Chrome
  draws on the CPU, so its frame times say nothing about a phone's GPU: trust
  the counts, not the milliseconds.

## Showing it to the user

- A composed still beside Inti is right for choosing a manner or a size.
- Anything that moves, casts or covers is judged **running**, in the map
  viewer (`mapas.html`, which draws with the game's own code) or the game.
  Offered a mock-up of shadows as an image, the user asked to see them on
  the real map instead.
- Say what a round cost. A first concept round was 48 credits for a tree and
  32 for two grounds that were thrown away.
