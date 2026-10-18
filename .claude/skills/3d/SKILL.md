---
name: 3d
description: The manual for moving 1810: Argentina to 3D (Three.js, pixelated). Use when standing a map or anything on it up in 3D, touching the camera, light, shadows or pixel pass, making a character's 3D model, rig or animations (Mixamo, CMU, hand-keyed), or combat's feedback and the tuning panel.
---

# Moving 1810: Argentina to 3D

The 3D game lives on the `1810-3D` branch, a fork that never goes back to main. **`index.html` is
the real game** (title, choosing, story, dialogues, HUD), with the map drawn in 3D under it;
`3d.html` is the bench where the look and clips are tried, and `modelos.html` shows every model's
clips. The 3D code is in `src/three/`. Why it is built the way it is: `docs/3d/decisiones.md`. Its
tasks: beads epic `arg-ttn`.

## The real game, drawn in 3D underneath

`GameScene` keeps everything it did (controller, enemies and their brains, story, saving) and
leaves the drawing of what has been made in 3D to `World3D` (`src/three/world3d.ts`), a Three.js
canvas under Phaser's, which is transparent. Off with `?2d`.

- What 3D draws is still laid out by the 2D code, for its footprints, and left undrawn there
  (`leftTo3d`, `cam.ignore`); what is only looks (grass, water) is not made at all.
- **The two pictures line up by construction**: the 3D camera is set so the ground lies where the 2D
  game draws it, Phaser's camera is zoomed to the 3D scale and follows a spot on the 3D world's
  pixel grid, and the 3D world is drawn round Phaser's own middle (shake included) on its
  `FOLLOW_UPDATE`. Whatever is still 2D (people, effects, rooms) is drawn on top, where it belongs.
- A figure reads its controller and is moved by nothing else (`cabral.ts`); the demo and the game
  use the same one. To bring something into 3D: its figure, then hide its sprite in 3D.
- Indoors the rooms are 2D, and so is the hero.

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
| 3. Its model: Tripo, then Blender | approved | [`MODEL.md`](MODEL.md) |
| 4. Its rig and animations: capture first, keyed by hand for weapons | in progress (idle, gait, cut, roll, musket approved; the royalist's set and death approved) | [`ANIMATION.md`](ANIMATION.md) |
| Combat's feedback: dummy, hit flash, impact ring, trail, aim marks, the tuning panel | approved | [`COMBAT.md`](COMBAT.md) |
