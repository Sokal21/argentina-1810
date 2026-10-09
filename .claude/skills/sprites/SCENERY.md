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

## Showing it to the user

- A composed still beside Inti is right for choosing a manner or a size.
- Anything that moves, casts or covers is judged **running**, in the map
  viewer (`mapas.html`, which draws with the game's own code) or the game.
  Offered a mock-up of shadows as an image, the user asked to see them on
  the real map instead.
- Say what a round cost. A first concept round was 48 credits for a tree and
  32 for two grounds that were thrown away.
