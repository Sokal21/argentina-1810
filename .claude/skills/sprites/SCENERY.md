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

## Buildings and interiors

Learned making the buildings of El vado de las Vizcachas (stage 12). The
code is `src/world/inside.ts`; each building's data is in its map
(`buildings` in `src/world/maps/vado.ts`).

### What was chosen with the user

- **Real size.** A door is as tall as a man; the posada stands about 240
  sprite pixels tall, five times the coloured block it replaced. The user
  first said the blocks were too small; plan the map round buildings that
  size.
- **The manner of the scenery, not of the characters**: rough thatch,
  stained whitewash, texture. `assets/edificios/posada.png` (SpriteCook
  `c1faee78-…`) is the model every other building was generated from, as
  `style_asset_ids`, and they came back matching at the first try.
- **Only the posada and the chapel have an inside.** The rest (forge, burnt
  hut, tapera, bell tower) are only outsides.
- **Going in is a fade, to a room somewhere of its own.** Both ways were
  recorded as videos and compared: a fade, and "open world" (the house
  fades away and the room is under it). The user chose the fade. The open
  way is still there (`?entrar=directo`) but asks for the room to be drawn
  the same size as the house with its door in the same place, and lets
  people of the map wander "inside"; do not offer it again without a reason.
- The rooms are kept **as they came out**, shown 1.6 times their size. The
  furniture is a little small beside the characters; the user saw it in the
  game and liked it as it was. Do not regenerate a room for scale unasked.

### Generating them

- Outside: `gemini-3-pro-image`, two variations, the posada as style, a
  size hint about 320–384. Describe it "seen from above and in front at
  three quarters, its door facing down-right", "isolated on a transparent
  background, no ground, no people".
- Inside: the chosen room (`posada_adentro.png`, SpriteCook `892cffec-…`) as
  style; describe it "as if the front wall and the roof were taken away:
  only the back wall and the left wall stand", with its door in the left
  wall.
- **About one in four comes back tiny or broken** (82, 96, even 77×10
  pixels). Two variations per building cover it; look at the sizes before
  choosing.
- Lay every concept beside Cabral at one scale before showing it
  (`assets/edificios/concept/*_comparacion.png`); judge scale there, not in
  words.

### How a building stands

- **In upright slices, each with its own depth.** A long house seen at a
  slant is in front of someone at one end and behind them at the other: one
  depth for the whole picture put Cabral under the house. It is cut into
  slices 8 pixels wide (`slices()`), each as far forward as the lower edge
  of its **base** where it stands.
- **The base** is the ground it stands on, as a polygon in the drawing's own
  pixels (`base`, four corners of the rhombus a house makes on the ground).
  It is what blocks walking, for the hero and the soldiers, and what gives
  the slices their depth. Measure it on the drawing: lay the guessed outline
  in red over the picture and look (the bottom-most opaque pixel of each
  column gives the front corners); the back corner follows.
- `door` is a point in the drawing; coming within 15 pixels of it goes in.
- A building with a drawing is skipped by `raiseBuildings`, which still
  draws a coloured block for one without.

### How a room works

- `inside`: its picture, `scale`, the `floor` (polygon the hero is kept on),
  the `door` and where one `arrive`s, all in the room picture's own pixels.
- The rooms are laid out **below the bottom of the map** (`ROOMS` in
  `inside.ts`), on black; the camera's bounds are lifted while inside.
- **Furniture that hides and stops**: `furniture` outlines are cut out of the
  room's picture and drawn again over the room in slices, so whoever is
  behind a counter or an altar is hidden by it and cannot walk through it.
  `screens` hide but do not stop, and `blocks` stop but do not hide: a row
  of benches is walked round as one (`blocks`) while each bench still hides
  (`screens`). Without that the hero threaded between benches where the
  drawing has no aisle; the user called it strange.
- **People inside** are placed with `people[].inside: { building, at }` in
  the room's pixels. Put them on open floor: standing behind the counter
  read as floating on it ("parece arriba"); the user asked for Braulio to
  stand in the room instead.
- A save remembers which building the hero was in (`inside`); without that
  a reload left him in the dark under the map.
- `side` makes a building one a faction can shut (stage 9): the posada is
  barred after the rebato, the chapel after the ambush.

### What lights them

- **A hearth** (`fires` in the room, `src/fx/hearth.ts`): a flame shader on
  the drawing's pixel grid and two soft warm lights laid on with ADD, that
  flicker unevenly. A box of no size is light without flames (the chapel's
  candles).
- **Embers** (`embers` on a building, the burnt hut): a few dark pixels of
  the ash brighten and fade, slowly, read from the drawing itself, plus a
  faint breathing warmth laid on as light. Kept faint, as asked; a first
  version could not be seen at all in the dark of the scene.
- Never write a new shader into a file that exists: `fire.ts` (the
  grenades' fire) was once overwritten by mistake. Check `ls src/fx` first.

### Checking it

- Drive it headless and **record a video** frame by frame (the game's loop
  stopped and stepped by hand, 30 a second, `ffmpeg` to mp4): walking along
  a house's front, in at the door, round the room, talking, out again. The
  user judged going in from videos, not stills.
- Stand soldiers on the far side of a house from the hero and check they go
  round it (`src/world/route.ts`); stand the hero inside and check they wait.

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
