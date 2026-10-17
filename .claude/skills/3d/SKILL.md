---
name: 3d
description: The manual for moving 1810: Argentina to 3D (Three.js, pixelated). Use when standing a map or anything on it up in 3D, touching the camera, light, shadows or pixel pass, or making a character's 3D model, rig or animations.
---

# Moving 1810: Argentina to 3D

The 3D game lives on the `1810-3D` branch, at `3d.html` with its code in `src/three/`. Why it is
built the way it is: `docs/3d/decisiones.md`. Its tasks: beads epic `arg-ttn`.

This manual grows one stage at a time, as each is approved by the user. A stage written here
worked and was liked; follow it as written, and change it only when the user approves the change.

## The rule of the move

The game keeps thinking in the 2D game's terms, and only its drawing is 3D. Positions,
footprints, the controller, the brains and the maps are the 2D game's own code, imported
unchanged; `src/three/` turns what they say into things to draw. When something of the 2D game
is needed in 3D, import it; export a constant from a 2D file rather than copying it, so both
games reckon the same.

Coordinates (`src/three/space.ts`): `X = x`, `Z = y / ISO_Y`, `Y` up. Something drawn `h` pixels
tall stands `h * UPRIGHT` tall. One unit is one pixel of the drawing.

## Stages

| Stage | State | Read |
|---|---|---|
| 1. The look: camera, light, shadows, pixels, a map stood up in flat shapes | approved | [`LOOK.md`](LOOK.md) |
| 2. A character's HD turnaround sheet, cut into views | approved | [`TURNAROUND.md`](TURNAROUND.md) |
| 3. Its model | next | |
| 4. Its rig and animations | | |
