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
