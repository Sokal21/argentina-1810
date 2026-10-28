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

## How he fights (in Inti's forest since 27 October 2026; numbers in `KINDS.apestado`, `PLAGUE`, `LURK`)
- **He comes up out of the earth near her**, a few at a time as she goes on (the user: walking up he
  would always be seen far off). The ground heaves, clods and stones pushed off it, dust (the warning,
  0.8 s); it breaks and he gets up out of it, sunk at first, not to be struck while under it.
  `three/rising.ts`. Left behind off screen for 3 s, he sinks and comes up again before her.
- **A tank**: slow, 14 of life, no blow moves him; his swipe lands at 1.3 s and takes 3 of her 5,
  pushing her nowhere (he wants her close).
- **His charge**, now and then from 150 to 380 off (else she kept away): he roars, runs at her
  (turning after her 0.3 s into it) and swipes as he reaches her.
- **His retching**, played on his scream, from 80 to 220 off: a pool before him (`tropa/vomit.ts`,
  the same shape the game reckons). Standing in it she walks at 60%; stepping in it plagues her:
  half a point of life drained little by little over 4 s (stepping in again starts it over), which
  neither breaks her healing nor guards her from a blow; her healing rids her of it. Plagued she
  throbs green and smokes.

## His clips (`assets/apestado/3d/apestado_animado.glb`)
Mixamo's, retargeted (`tools/mocap/README.md`): `reposo`, `caminata`, `golpe`, `grito`,
`levantarse`, `arrastre`, `arrastre_rapido`, `muerte` (zombie dying) and `muerte_b` (zombie death),
to choose between; `vomito` (a cough captured lying down, stood up by `tools/blender/upper_from.py`),
kept, though the retching is played on `grito`.
