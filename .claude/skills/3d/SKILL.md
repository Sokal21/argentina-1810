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

## The real game, its map wholly 3D

`GameScene` keeps running the game (controller, soldiers' brains, fury, experience, saving) and
draws none of the world: its camera is turned off and `World3D` (`src/three/world3d.ts`), a
Three.js canvas under Phaser's transparent one, draws the map. Phaser draws only the menus, the HUD
and the DOM screens (the character sheet). The 2D game is not playable here: Inti, who is not in
3D yet, is shown locked on the choosing screen.

- On a 3D map, by the user's choice: nobody is talked to, nothing is picked up or brought along,
  nobody goes indoors, and every soldier is a fusilier (`Realista`), the one modelled so far.
  Buildings and those standing about are simple block figures (`world.ts`, `people.ts`).
- What 3D draws is still laid out by the 2D code, for the ground it takes up.
- A figure reads its owner's state and is moved by nothing else: Cabral's controller
  (`cabral.ts`, shared with the demo), each royalist's brain (`realista.ts`, one model loaded
  and copied per soldier). The game tells `World3D` what happens (a shot, a blow landing); the
  hit tests and the damage stay the 2D game's.
- The mouse is read on the 3D ground (`World3D.underPointer`), and the 2D camera's shakes become
  the 3D camera's jolts.

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
