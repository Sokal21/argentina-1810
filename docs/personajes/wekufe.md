# El Wekufe

The demon of the plague, the last boss of the demon's road in Inti's arc (`arg-sur.5`, `arg-tsr`). He
lends Roca's army its dead (the apestados) and its spirits (the chonchones), and feeds on the plague
and the destruction. Designed with the user on 29 October 2026; not in the game yet, shown in
`modelos.html` as "Wekufe". His fight is written in `docs/historia/inti/README.md`.

## How he looks
- A floating shadow with wide ram's horns, long arms and claws, two red eyes and a red glow within his
  belly (concept C of three, `assets/wekufe/concept/`; turnaround A, `assets/wekufe/3d/giro_a.png`;
  asset ids in `spritecook-assets.json`).
- His model ends a little under his waist; **below it he is a long gown of smoke and fire, as a
  lady's of old** (the user): narrow at the waist, flaring out in a bell to its hem just over the
  ground, swung as his legs (bones under nothing now) swing. First he had a tail of smoke on Tripo's
  legs; the user had it bent, snaking like a rattlesnake's and raised, then cut it away for the gown.
- Drawn 150 tall (Inti 81); he floats a little off the ground, rising and sinking.
- He casts no shadow (the user).
- Sinking (his dive, his death) his own smoke is drawn over his model, as thick as it always is, so the
  ground closing on him is not seen (the user; extra smoke for it was tried and not liked).
- All of it beyond his model is `src/three/wekufe.ts`:
  - **Smoke**, quite clear (the user: "mucho más transparente"), bubbling slowly (each puff a lump of
    round blobs, swelling and shrinking once every one to three seconds): a black core filling the
    gown, a dark cloud, a dark haze; at the hem smoke of many greys and blacks and more lying on the
    ground; at the waist a thick black band, slim, hiding where the model ends.
  - **Tongues of black fire** licking up from low on the gown, close along it, pointed at both ends,
    those behind it dimmer; each drawn again over itself as a **red dodge** (what is behind it
    brightened and reddened, the more where they lie over one another). A red rim round them was
    tried and not liked.
  - **Black souls** winding up round the gown and off him, streaks fading along their length (pale
    at first; the user had them black).
  - **Red halos** at his eyes and belly, faint (stronger, they lit his smoke).
  - **His claws' lines:** four thin red lines from each hand along the real path of its claws through
    his `zarpazo` (frames 22.5 to 27 of 51), with a soft red glow and sparks thrown off, draining away
    from where they began in 0.42 s.
- His eyes and belly lit by `glow.py` (`--colors 43,12,5 --to 255,45,25`).

## How he fights (decided, not made)
- **First phase:** three apestados lying in a dark wet cave; he goes into one at a time, which grows,
  blackens and is quicker, keeps the apestado's blow and adds a leap with a blow on the ground. All
  three are to be killed.
- **Second phase, himself:**
  - **He dives into the earth and comes out of smoke beside her with his claws** (the smoke gathers
    first where he will come out, to be dodged). His dive (`zambullida`) sinks him right under the
    ground; where his head goes in, the ground splashes black (drops, a pool), a cloud of black
    smoke bursts out low and black fire bursts up, the smoke and fire gone together.
  - **A cloud of lost souls** about him, hurting her while she is near: 38 wailing faces (concept A; Tripo's model, `assets/wekufe/3d/alma.glb`, 800 faces, flying mouth first, the red of the streaks, unlit, without the outline every model has) going round him, each trailing a streak of black fire with the red dodge, bursting out at his thrust and lasting about 7 s, a red ring on the ground saying how far it hurts (`WRAITH_REACH`).
  - **Slow red demon fire** that follows her and turns little, dodged by rolling late.
  - **Dying, he writhes and sinks into the earth, in that same pose,** with the same explosion of smoke and fire as his dive (the user).
    When he dies the screen and the pad shake, to frighten a little (the user; to do when his fight goes in: `GameScene.shake`, which drives both).

## Model and clips (`assets/wekufe/3d`)
Tripo multiview of turnaround A (front, his left, back), Tripo's rig; Mixamo clips retargeted
(`tools/mocap/README.md`), each made a gown's legs by `tools/blender/smoke_tail.py`; joined by
`prepare_rigged.py`, then `decimate.py --faces 2500`, `cut_below.py` (keeping what the arms move: his
claws hang below his waist) and `glow.py`.

| Clip | From | For |
|---|---|---|
| `reposo` | Mutant Idle | floating |
| `zarpazo` | Mutant Swiping | his claws, coming out beside her |
| `zambullida` | Run To Dive | going into the earth |
| `invocar` | Standing 2H Magic Attack 05 (Pro Magic Pack; the user's choice, none of Inti's) | his cloud of spirits |
| `lanzar` | Standing 2H Magic Attack 02 (Pro Magic Pack; the user's choice, none of Inti's) | his red fire |
| `muerte` | Zombie Agonizing, frames 0 to 120 | dying: writhing, he sinks into the earth, and as his waist goes under it splashes as his dive does |

Still to come: the cloud of spirits and the red fire themselves.
