# A character's model

From the turnaround's cut views to a GLB standing in the game. Approved for Cabral on
17 October 2026 ("ahí se ve ideal"): `assets/cabral/3d/cabral.glb`.

## The turnaround's cut
`tools/cut_turnaround.py` fails when a ground line joins the figures (one connected part): cut at the
emptiest columns between them instead, paint the line out, and look at the four squares. SpriteCook
now gives 1K only on this account (2K needs a higher plan): 1376×768 is enough to cut.

## Generating it: Tripo
`python3 tools/tripo.py multiview OUT_DIR BODY front=… right=… back=…`
- The key is in `~/.tripo_key`; the script reads it and never prints it. The endpoint is the
  global one, `openapi.tripo3d.ai/v3`: the `.com` one is China's and refuses the key.
- Body: `{"model":"v3.1-20260211","texture":true,"pbr":false,"texture_quality":"standard","face_limit":8000}`.
  No PBR: the game's material is a flat colour. 8000 faces is plenty for a figure ~80 px tall.
- Views: front, the profile **as the side it shows** (see `TURNAROUND.md`), back. The 3/4 view
  is not sent. **30 credits** (USD 0.30), about a minute.
- The task's answer and what it made are saved in OUT_DIR, by task id: keep them in the repo
  under `assets/NAME/3d/tripo/`.

## Making it ready: Blender, no window
`Blender -b --python tools/blender/prepare_model.py -- IN.glb assets/NAME/3d/NAME.glb`
- Turns it to face +Z (Tripo faces +X), feet at the origin, one unit tall.
- Texture to **512 px in 16 colours** (k-means over its own pixels), nearest-filtered, no shine.

## Checking it
`Blender -b --python tools/blender/turntable.py -- NAME.glb DIR`, then
`python3 tools/turntable_sheet.py DIR assets/NAME/3d/giro_modelo.png --sprite assets/NAME/frente.png`.
- Eight views from the game's camera, with **flat light** so the colours are judged as they
  are (Blender's studio light makes everything look darker than it is), and below them the same
  pixelated to game size beside the sprite.
- Look first at whether **face, chest and toes point the same way** in every view, then at the
  colours and what hangs on one side.

## In the game
`model(url, drawn)` in `src/three/figure.ts` loads it, gives it the game's stepped flat
material with the texture nearest-filtered, and grows it to the drawn height.

## A building, and a room gone into without a cut (La posada, 20–21 October 2026)
- **Outside:** a turnaround of the building from its concept (front with the door, the gable end,
  back, three-quarter; nothing standing about it), cut into squares, Tripo multiview (30), then
  `prepare_model.py` (20 colours). Stood at its true size (a house about three men tall: its door
  must let Cabral through), on the ground the 2D game gives it, turned as its door wall is
  (`src/three/buildings.ts`). The door taken out with `tools/blender/cut_door.py`, measured on its
  dark wood, so the doorway is open.
- **Inside:** the walls are the model's own. Within them its roof is cut away from the ridge to the
  top of the walls and its front wall wiped down to its foot (clipping planes, `src/three/house.ts`);
  plain walls of their own looked like another house. The furniture is one Tripo model from a
  picture of it **without walls**, arranged off the doorway (Tripo image, 30): show the picture first.
  It came on a slab of earth: let it down so the slab's top is the floor, and paint the floor with
  that earth (one spot of its texture). Walls nobody walks through but by the door; a warm light
  within, kept in the scene and dark outside.
- **A second building (La capilla, 22 October 2026):** the sheet comes in two rows: cut it by
  quadrants, and **check every view against the three-quarter one** before Tripo: its "right side"
  showed the building's left (the lean-to was on the left, seen from the front), and its back view
  was drawn mirrored. A lean-to off one side makes the model's box lopsided: centre it on its walls
  (measured by the faces of its side walls), not its box, before cutting the door. A long side wall
  that faces the camera hides the room as the front does: `side: true` cuts it down too, and the
  lean-to with it.
- **A model's own floor** (La capilla, 23 October 2026): Tripo may give a building a slab of floor a
  few units over the ground; within the walls it hid the boots of whoever walked in, its underside too
  (the room's materials are drawn from both sides). Take it out with `tools/blender/cut_floor.py`,
  bounded **inside** the walls (wider, it took the walls' foot too). Find such things by casting a ray
  down over a foot in the game, not by face centres in Blender: a few big faces have their centres far off.
- **What stands in a room is not walked through:** `House.block` finds the furniture's footprint from
  its own geometry as it loads (above an ankle over the floor), squares that touch as one box. Legs
  hidden in a cot read as sunk in the floor.
- **Light within:** each room's `light` (its fire, its candles, a glow per flame), one room light for
  all of them, moved to whichever is gone into and casting shadows only while lit; the house casts its
  whole shadow, roof and all, though the roof is lifted, so the moon does not get in.
- **Its keeper:** a character's turnaround and model as above, rigged (Tripo `animations/rig`,
  `"input": <model task id>`, v1.0, 25), with the shared breathing idle; stood by the counter,
  turning to whoever comes in; talked to with F as in the 2D game, a sign over them.
- **More than one within, and one who sits** (Tobías, 23 October 2026): a building's `keepers` is a
  list, each talked to where they are and **each with a question-mark sign of their own** (the user's
  rule: whoever can be talked to has one). One who `sits` plays that clip, never turns, and has his
  sign lower. Sat on a cot: measure the cot's top and front edge by casting rays down over the
  furniture in Blender, measure the clip's seat (the body's lowest point under the hips, a share of
  his height), and choose his drawn height so the two meet; set him a little within the edge.
  A clip GLB straight out of `retarget_rot.py` faces +X, so `strip.py` shows it side on: judge
  which way a clip faces on the joined model (`NAME_animado.glb`), not on the clip's own file.
- **Outdoors** (Mateo, 23 October 2026): one standing about a map gets `url` in his dress in
  `src/three/people.ts` (`People`), and breathes where his plot is, turned as the map says.
- A sheet whose grey **darkens downward** joins its figures for `cut_turnaround.py` (it reads the
  background at the top-left corner): compare each pixel with the background at its own row, and cut
  at the emptiest columns. **Look at what the texture's colours do**: in 16, Mateo's mud went the red
  of his facings and read as blood; `prepare_rigged.py --colors 24` kept it brown.
- **One who lies abed** (the ensign, 23 October 2026): in a room, on a bed of its own furniture
  (`abed` in `buildings.ts`), not talked to; his line is heard where he lies (`World3D.abed`). Find
  the bed's extent and mattress by rays down over the furniture. A lying clip takes `--ground`, and
  `strip.py` frames it badly (it frames one standing): render it framed to the body instead. A bed
  can also be cut out of furniture as a model of its own (`tools/blender/cut_piece.py`).
- **Buildings with nothing within** (the forge, the burnt rancho, the tapera, the bell tower, 23 October
  2026): an entry in `MODELS` is all they need (url, true height, drawing size, `long`/`deep` from
  the model's box). Make what is walked under or through let Cabral (82) by; check the neighbours'
  spacing on the plots before choosing a height. Sheets come in a row or a two by two grid, often with
  a ground line: `tools/no_ground_line.py` then `tools/cut_views.py` (row or grid). The user asked for
  fieldstone and clay tiles on the forge and the bell tower: regenerate with the chosen sheet as
  reference and the chapel's stone sheet as style.
- **A tree** (the ombú, 24 October 2026): the turnaround's side view always comes back narrow (0.6 to
  0.7 of the front), even when told the tree is as wide every way. Tripo from the front alone made it
  as shallow (guessing its depth); stretching that in Blender stretched the leaves and looked wrong;
  the front put in for the sides left a lump hanging at the diagonals. What worked: multiview with the
  front, the back, and the **three-quarter view for one side and mirrored for the other**. Measure each
  view's width before Tripo. A plant with a model is in `MODELLED` (`src/three/world.ts`), instanced
  per patch from the model's meshes, as tall at size 1 as its shapes were.
