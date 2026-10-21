# A character's model

From the turnaround's cut views to a GLB standing in the game. Approved for Cabral on
17 October 2026 ("ahí se ve ideal"): `assets/cabral/3d/cabral.glb`.

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
- **Its keeper:** a character's turnaround and model as above, rigged (Tripo `animations/rig`,
  `"input": <model task id>`, v1.0, 25), with the shared breathing idle; stood by the counter,
  turning to whoever comes in; talked to with F as in the 2D game, a sign over them.
