---
name: sprites
description: How art for 1810: Argentina is generated with SpriteCook and made ready for the game. Use when designing a character or creature, generating or animating sprites, fixing a sheet that came back wrong, or wiring new art into a character's kit.
---

# Making sprites for 1810: Argentina

Everything here was learned the hard way on Inti, the chonchón and Cabral.
Read it before spending credits.

## The look

- Pixel art in the style of Children of Morta, but flatter: **each shape one
  flat colour, no shading, no gradients, no outlines, no face.** A head is a
  single skin-coloured shape. Detail comes from silhouette and a few accents.
- Serious and a little dark. Never cute, never chibi.
- The model's first answer is always more detailed than this. Plan on two
  rounds: a detailed concept to settle the design, then a simplified redraw.
- Characters stand in a 94x94 frame, feet on the bottom row. The world is
  shown at twice that size; a sprite pixel is two screen pixels.

## Designing something new

1. Describe it in words with the user first. Agree on what it is before
   generating anything.
2. `generate_game_art`, `model: gemini-3-pro-image`, three variations, with
   an existing character as `style_asset_ids`. Show them side by side with
   Inti for scale (compose a comparison image, open it for the user).
3. The user picks one. Simplify it: generate again with the pick as
   `reference_asset_id` and Inti as style, asking for the list under "The
   look" explicitly, at a small size hint (96). Editing the pick with
   `edit_asset_id` changes too little; a fresh generation from a reference
   works.
4. Only then make the other views and animate.

Costs: a still is 12 to 16 credits per variation, an animation 26 whatever
its length. `width`/`height` are hints: the same request can return 82px or
246px. Check the size of what comes back and resample if needed.

## Views

Five are drawn, mirrored to cover eight directions:
`south` (facing the viewer), `down` (the down diagonal), `front` (three
quarters; also used for pure sideways), `back` (three quarters from behind;
the up diagonals) and `north`.

- Generate the other views from the chosen design as style reference, with
  **the matching view of Inti as a second style reference** to pin the
  angle. Asking for "straight front" in words alone returns another three
  quarter view.
- **Check that the head faces the way the body does** before animating
  anything. Without a face, direction reads from which side a hat's peak and
  the patch of skin are on, and the model gets it wrong. Fix the pose (by
  script or by regenerating) and upload the fixed pose as the source; do not
  repair every animation afterwards.
- A `down` pose asked for directly comes back as a copy of `front`. Take it
  instead from an early frame of the south-to-front turn.
- Record which way each view is drawn heading (`faces: 1` right, `-1` left,
  `0` symmetric). It differs between characters and between views; guessing
  it has been wrong three times. Tell the user it is a guess and let them
  confirm it in the game.

## Animating

Always: `animate_game_art` with `model: pixel-engine-v1.5`,
`auto_enhance_prompt: false`, `output_format: spritesheet`, `pixel: true`,
`colors: 24`. Eight frames for a loop, six for a turn or a dash, twelve for
something long like a death. At most four jobs at once. It returns an
animated WebP of square frames; `tools/webp_to_sheet.py` lays it out in a row.

Writing the prompt:
- Describe the motion as stages, in order, and what never happens ("never
  rolls, never leaves the ground, never turns round").
- Say "in place, as if the camera follows", "same size, same flat colours",
  "no effects", and whether it loops.
- Say where a thing points **on the picture** ("the barrel runs down the
  middle of the image, muzzle at the bottom"), not relative to the character
  ("pointing the way he faces"). Asked the second way, a musket aimed
  toward the camera came back end-on and one aimed down a diagonal came
  back horizontal.
- Animate **from the exact pose of the view** it will be shown in, so its
  first frame matches.

What comes back wrong, reliably:
- **Turns overshoot.** Asked for 45 degrees it gives 90. Use only the early
  frames and let the trot it leads into finish the move. Lay the turn between
  the two trots it joins and look before choosing frames.
  A six-frame turn moves about 20 degrees a frame, which leaves nothing
  between views 22 degrees apart. Ask for the same turn in twelve frames and
  "twelve small equal steps": it still overshoots, but now there are frames
  between every pair of views.
- **Changes of side and about-turns are not generated.** Side views are one
  drawing mirrored, so they are assembled from the other turns by script
  (`tools/build_cabral_turns.py`, `tools/build_turn_side_flip.py`) and
  marked `pivot` so the character slows, turns and sets off again.
- **The first frame is the source pose**, including whatever it lacked (a
  sabre the view did not show). Check props frame by frame, by counting
  their pixels, not by eye.
- **Loops can repeat their start.** A trot whose last two frames copy its
  first two takes the same step twice: use fewer frames.
- **Things grow or change colour.** A plume triples in height; a shawl seen
  from behind turns light blue; brass appears on the back of a hat; eyes,
  hands and props get redrawn. Asking it not to does not help. Measure, then
  repair locally.
- "Walking backwards" comes back as walking forwards. Build it locally
  instead (see `tools/build_attack_retreat.py`).

## Repairing locally (free)

Prefer a script to a regeneration, and keep the script: the next sheet will
need it too. Keep SpriteCook's output untouched as `NAME_original.png` and
write the repaired sheet beside it as `NAME.png`.

- `tools/build_cabral_sheet.py` enlarges him and can trim his plume, mirror
  his head, lend a missing sabre blade from a neighbouring frame and paint
  brass off the back of his hat.
- `tools/recolor_sprite.py FILE FROM:TO...` swaps exact colours (always from
  the original, so pass every pair each time); `tools/normalize_branch.py`
  fixes the greens of Inti's branch.
- `tools/build_attack_standing.py`, `build_turn_*.py` assemble sheets from
  parts of others.
- To animate from a repaired pose, upload it: `create_asset_upload`, `PUT`
  the bytes to the URL it returns, `finalize_asset_upload`. Never write the
  token or the URL into a file.

Inti's colours: shawl `(52,65,81)` with shade `(40,49,62)`; spell light
`(70,230,250)`; branch greens `(46,70,38)`, `(62,90,50)`, `(78,112,63)`.

## Checking a sheet

Compose a strip of the frames, enlarged, on a mid-tone background and read
it as an image. For a turn, put the trot it leaves on the left and the trot
it reaches on the right. Measure rather than judge where you can: body
centre per frame (for `ax`), top and bottom rows (height), pixel counts of
props. A character must stand the same height in every sheet.

Do not open the game in the browser to check; the user plays it and reports.

## Wiring it in

- Art lives under `assets/`, which is served as the site root, so a sheet is
  `cabral/trote_sur.png` in code.
- Each character is a `Kit` in `src/machi/data.ts`: its sheets and its turns.
  The controller is shared. A sheet records `frames`, `faces`, `ax` (the
  body's centre in a frame) and, when needed, `ay`, `still`, `order`.
- Add every generated asset to `spritecook-assets.json` with its id.
- Add or extend a test in `tests/` for what the controller should pose, then
  run `npx tsc --noEmit`, `pnpm test` and `pnpm build`.

## Working with the user

- One step at a time: generate a little, show it, adjust, go on. Turns
  especially needed several rounds.
- Report what was measured or seen as an image, and say plainly that it was
  not seen running.
- Say what each step cost and what is left. Warn when credits run low.
- `references/` holds other studios' art for style reference only. It is
  ignored by git and must stay out of this public repository.
