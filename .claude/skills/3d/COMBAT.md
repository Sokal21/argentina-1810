# Combat's feedback

What makes a blow and an aim read in the 3D game. Code in `src/three/`. All approved by the user.

- **Whether a blow lands** is the 2D game's own rule, `lands(blow, spot, girth)` in
  `src/machi/controller.ts` (reach plus girth, within the arc), shared by both games.
- **The practice dummy** (`dummy.ts`): struck, it flashes red (the 2D HitFX's red, as emissive),
  rocks away and springs back, straw flies the way the blade went; never falls. By the start.
- **Camera jolt** (`View.jolt`, 70 ms, whole pixels) when a blow connects, as the 2D game shakes.
- **Impact ring** (`impact.ts`): small, thin, red, with an additive glow; faces whoever struck
  (seen in perspective), depth-tested so what stands before it hides it. Its numbers are in the
  panel's "Impacto".
- **Sabre trail** (`trail.ts`): a pale ribbon between the blade's foot and point over the last
  frames, only while it sweeps. Off in the panel's "Efectos".
- **Musket aim** (`aim.ts`): the 2D game's marks in 3D, the line of the shot from the muzzle to
  a ball's reach (420) and the blast's ring (46) as a true circle on the ground; amber.

## Tuning through the panel

Every number the user may want to feel out goes in `Look` (`look.ts`) with a control in
`panel.ts` (P in the game): roll length and reach, speed, impact, effects. The user tunes, presses
"Copiar config" and pastes the JSON; write it into `LOOK`. When a default changes, list the old
value in `STALE` in `panel.ts` so a browser that kept it takes the new one; adding a field needs
nothing. The panel gives the keys back to the game as soon as a control is set.
