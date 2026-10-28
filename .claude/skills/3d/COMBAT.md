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

- **His rage (R)** is the 2D game's (`Rage`: faster, unkillable, scorching what is near); in 3D
  it is seen (`fury.ts`): his roar keyed in Blender (`anims/grito.py`, sabre to the sky), a burst of
  light and a ring flung out as it begins, then tongues of fire and embers about him, a flickering
  light of fire, a faint ring as far as he scorches, his body burning and throbbing, his cuts as quick
  as his blows; and the finishing pass's `fury`: all but the reds and the fire drained, harder, more
  aberration, and red edges throbbing with a heartbeat. Lights for effects are kept in the scene and
  dimmed, never added and removed: that rebuilds every material, a stutter.

- **Many little pictures facing the camera** (drops, bubbles, puffs of cloud) go in one
  `Billboards` (`billboards.ts`): one mesh, a copy of a square each, placed, sized, faded and
  turned by `put`, uploaded by `commit` once a frame. Never a `THREE.Sprite` each: a sprite is a
  draw call, and the plague-dead soldier's retching was 134 of them (measured 27 October 2026:
  his stench 53 calls at rest, his retching 154 at its peak, against 20 and 23 on billboards).

- **A sergeant's shout** (`shout.ts`, approved 23 October 2026): a burst ring (thick, bright,
  0.34 s) and two echoes (thinner, ~1 s), each born bright red and thinning to a duller red, their
  edge in trembling peaks drawn anew each shout, laid on the ground's relief corner by corner (flat,
  a rise hid all but an arc), out to his shout's reach; a faint camera shake (0.45 s, a pixel) with
  the burst. Those it quickens throb a faint red (a third of a blow's) while it lasts.

## Tuning through the panel

Every number the user may want to feel out goes in `Look` (`look.ts`) with a control in
`panel.ts` (P in the game): roll length and reach, speed, impact, effects. The user tunes, presses
"Copiar config" and pastes the JSON; write it into `LOOK`. When a default changes, list the old
value in `STALE` in `panel.ts` so a browser that kept it takes the new one; adding a field needs
nothing. The panel gives the keys back to the game as soon as a control is set.
