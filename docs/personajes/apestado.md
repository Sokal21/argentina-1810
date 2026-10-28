# El apestado

The spirit-touched tank of Inti's arc (`arg-sur.3`): a soldier of Roca's frontier line, dead of the
smallpox he and his kind brought south, and got up again by what the plague feeds. One of the
Wekufe's own (the Wekufe, the demon of the plague, is the arc's last boss, `arg-sur.5`). Decided
with the user on 27 October 2026; not in the game yet, shown in `modelos.html` as "Apestado".

## How he looks
- The frontier soldier's uniform, torn: dark blue kepi and tunic, a brown strap across the chest,
  the belt with its brass buckle, ragged trousers, boots.
- Big and heavy, swollen; his right shoulder and arm deformed by the plague. Pale grey-green skin
  and sores that shine a sickly, half radioactive green (`tools/blender/glow.py`, lit as a light map
  by `figure.ts`).
- A head over the frontier soldier: drawn 88 to his 78.
- He walks in a stench: puffs of a dull green cloud carried off behind him (`three/stench.ts`).

Concept C of three (`assets/apestado/concept/`), turnaround A (`assets/apestado/3d/giro_a.png`),
Tripo's model and rig (`assets/apestado/3d/tripo/`); asset ids in `spritecook-assets.json`.

## How he fights (to be built)
- **He comes up out of the earth near her** (the user: walking up he would always be seen far off
  and easily kept away from). The ground heaves, clods and stones pushed off it, dust (the warning,
  0.8 s); it breaks and he gets up out of it, sunk at first; he screams. `three/rising.ts`, `RISE`.
- **A tank**: slow, a great deal of life, his blow up close (`golpe`).
- **His retching**, played on his scream: a spray into a cone before him and a pool there, broad,
  bubbling, lying 5 s and soaking away unevenly. **Whoever stands in it is slowed.** The pool's
  shape is `VOMIT` in `three/vomit.ts`, for the game to slow her by the same shape that is seen.
- Crawls (`arrastre`, `arrastre_rapido`), perhaps once he is badly hurt: fallen, still coming.

## His clips (`assets/apestado/3d/apestado_animado.glb`)
Mixamo's, retargeted (`tools/mocap/README.md`): `reposo`, `caminata`, `golpe`, `grito`,
`levantarse`, `arrastre`, `arrastre_rapido`, `muerte` (zombie dying) and `muerte_b` (zombie death),
to choose between; `vomito` (a cough captured lying down, stood up by `tools/blender/upper_from.py`),
kept, though the retching is played on `grito`.
