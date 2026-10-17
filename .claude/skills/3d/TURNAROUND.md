# A character's turnaround sheet

The picture a 3D model is generated from. The game's sprites are 82 px, far too small: the
generator would invent half the character. So first one HD sheet of the character in four views.
Approved for Cabral on 17 October 2026 (sheet C, `assets/cabral/3d/giro_c.png`).

## Generating it
`generate_game_art`, one call, two variations (48 credits):
- `model: gemini-3-pro-image`, `pixel: false`, `aspect_ratio: 16:9`, `resolution: 2K`,
  `bg_mode: include`, `smart_crop: false`. It comes back 2752×1536.
- `reference_asset_id`: the character's **detailed concept** (Cabral: concept C,
  `ac5ce9ba-…`). **No `style_asset_ids`**: the pixel sprites as style drag the sheet into chunky
  pixel art with arms hanging down, which the generator and the rig both handle worse.
- The prompt, in this order: "Professional character turnaround model sheet for 3D modeling,
  smooth high-resolution digital painting, NOT pixel art"; the four views left to right
  (straight front, left side profile, straight back, three-quarter front); an **A-pose** spelled
  out (arms straight, clearly away from the body, about 45° down, a gap between arms and torso,
  hands open, nothing held); same height and baseline, no overlap; the costume item by item;
  "flat even studio lighting, no cast shadows, minimal shading, clean flat colour areas, plain
  light grey background, no text, no labels, no grid".
- Leave out what hangs loose and is not part of the body (Cabral's musket): it is added later as
  its own object, and the rig stays simple.

## Choosing
Put the variations beside the game sprite and let the user choose. Prefer the one in **flat
colour areas** over a painted one: grime and shading get baked into the model's texture, and the
light is the engine's job. Small departures from the design (Cabral's two crossbelts instead of
one) can be left for the texture.

## Cutting it into views
`python3 tools/cut_turnaround.py SHEET PREFIX frente izquierda espalda tres_cuartos` writes one
square per view on the sheet's background. It cuts by connected parts, so a hand and a
neighbour's sabre sharing columns are kept apart. Check the strip of four by eye before sending
them on: a figure must be whole and alone in its square.

Record every variation, chosen or not, in `spritecook-assets.json`.
