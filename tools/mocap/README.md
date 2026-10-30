# Motion capture

Clips from the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), free for any use, as
BVH from the una-dinosauria/cmu-mocap mirror. "The data used in this project was obtained from
mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."

| Clip | What |
|---|---|
| 07_01, 08_01, 35_01 | walks |
| 35_22 | a run, slower |
| 09_01 | a run (measured for the hand-keyed trot) |

Put one on a rig with `tools/blender/retarget_bvh.py`; measure one with `tools/blender/measure_bvh.py`.

## Mixamo

Mixamo's animations may be used in the game but not handed on as they come, and this repository
is public: their FBX files stay out of git (`.gitignore`), and only what is made of them for the
game (`assets/cabral/3d/anims/rodada_mixamo.glb`, inside the model) is kept. Put one on the rig
with `tools/blender/retarget_rot.py`.

| File (not in git) | What |
|---|---|
| stand_to_roll.fbx | "Stand To Roll": his roll, frames 7 to 60 |
| breathing_idle.fbx | "Breathing Idle": his standing, all 299 frames, `--feet` |
| walking.fbx | "Walking": his gait, one cycle, frames 1 to 32, `--gait --feet` |
| Falling Back Death.fbx | "Falling Back Death": the royalist's death, `--ground --backward`, its start eased from his standing by `tools/blender/ease_from.py` (the actor starts on guard) |
| Drinking.fbx | "Drinking": his flask, frames 66 to 180 only (raised with the left hand, drunk, lowered; the rest is standing about), `--feet`, played in 1.4 s |
| Walking Backwards.fbx | "Walking Backwards": his walk backwards while steered by the pointer, one cycle, frames 1 to 36, `--gait --feet` |
| Heavy Weapon Swing.fbx | "Heavy Weapon Swing": the sergeant's halberd blow, `--name barrido --feet`, then `tools/blender/anims/golpe_pesado.py` cuts it to frames 19 to 95 (its long sway before it moves left out) and lays the halberd between his hands |
| Standing Melee Attack Downward.fbx, Great Sword Slash.fbx | tried for the sergeant and left: the first is one-handed (a halberd forced into both hands broke his arms) |
| Standing Taunt Battlecry.fbx | "Standing Taunt Battlecry": the sergeant's shout, all 55 frames, `--name grito --feet`, then `tools/blender/anims/grito_sargento.py` raises the halberd in his right hand (his arms fling too wide for both) |
| Sitting.fbx | "Sitting" (sitting on a low edge, rocking over his knees, groaning): Tobías on his cot, all of it, `--name sentado --feet` |
| Look Over Shoulder.fbx | "Look Over Shoulder": Mateo's standing, glancing back as one in hiding, all of it, `--name mirada --feet` |
| Slow Run.fbx | "Slow Run": the sableador's run, its 15-frame cycle, `--name carrera --gait --feet`, paced by its stride in the game |
| Standing Melee Combo Attack Ver. 3.fbx | "Standing Melee Combo Attack Ver. 3": the sableador's two cuts, all 52 frames at their own pace (faster read as frantic), `--name tajo --feet` |
| Crying.fbx | "Crying": Remedios breaking down now and then by her burnt house, all of it, `--name llanto --feet` |
| Gunplay (1).fbx, Gunplay.fbx | "Gunplay" twice: a pistol shot from one knee and a shotgun fired standing. Both retargeted `--twist 1`, then `tools/blender/anims/tiro_arrodillado.py` joins them into the tirador's `tiro`: hips and legs from the kneeling one at its frame 24, waist up from the shotgun frame by frame, the musket laid through both fists |
| Yelling.fbx | "Yelling": ño Ciriaco shouting now and then, arms flung wide, all of it, `--name gritando --feet`; it starts and ends standing straight, so it blends from his breathing |
| Yelling While Standing.fbx | tried for him and left: it starts and ends bent over |
| Rifle Idle.fbx | "Rifle Idle": the tirador standing with his musket held low, all of it, `--feet --twist 1`, then `tools/blender/anims/fusil_en_manos.py ... reposo_fusil` lays the musket through both fists |
| Rifle Walk.fbx | "Rifle Walk": the tirador walking up with his musket at the ready, all of it, `--gait --feet --twist 1`, then `fusil_en_manos.py ... caminata_fusil` |
| Orc Idle.fbx | "Orc Idle": the paisano's standing, heavier, his weight shifting, all of it, `--name reposo_orco --feet` |
| Praying.fbx | "Praying": fray Benito's standing, hands joined at his chest, looped, all of it, `--name rezando --feet` |
| Writhing In Pain.fbx | "Writhing In Pain": the wounded ensign on his cot, all of it, `--name dolor --ground` (he lies: his lowest point on the ground, then set on the cot's mattress) |
| Gunplay (1).fbx (again) | tried for the captain's pistol shot, standing, and left (the user: "malísimo"): `--twist 1`, then `tools/blender/anims/al_frente.py ... --prop pistol --aim 14 --stand reposo_mixamo.glb --level-arm yes` keeps his legs as he stands and takes the kneeling man's upper body, stood up, the arm lowered from the shoulder and turned at the waist so the pistol points straight ahead at frame 14 |
| Stabbing.fbx | "Stabbing": the captain's thrust, all 41 frames, `--name estocada --feet`, then `tools/blender/anims/al_frente.py ... --prop sabre@R_Hand@little --aim 9 --name estocada` (the knife is held point down: the sabre leaves the fist by the little finger, the wrist bent and the waist turned so it points straight ahead where it lands) |
| Handgun.fbx | "Handgun": the captain's pistol shot, all 49 frames, `--twist 1 --feet`, mirrored for his left hand by `tools/blender/mirror_clip.py`, then `tools/blender/anims/al_frente.py ... --prop pistol@L_Hand --hand L --aim 14 --level-arm yes` |
| Laying Moaning.fbx | "Laying Moaning": the dying royalist, all of it, `--name jadeo --ground`, then `tools/blender/lean_up.py ... jadeo ... 60` raises him from the waist to lie back against a wheel |
| Standing Taunt Battlecry.fbx (again) | the captain's shout, all 55 frames, `--name grito --feet`, as it comes: his pistol and sabre flung up with his arms |
| Bull.fbx | Quaternius's bull (CC0, the Ultimate Animated Animal Pack): its skeleton and its 12 clips as they are, the ox's model put on it by `tools/blender/fit_to_bull.py` (bones moved into the ox's legs, skin weighed again). Carried over onto Tripo's quadruped rig instead (`quadruped_retarget.py`, `reskin_quadruped.py`) the walk was strange |
| Pro Magic Pack/*.fbx (56) | All on Inti to choose among in modelos.html, each `--twist 1`, named after the file (`standing ` dropped, lower case, `_` for spaces). The single clips (assets/machi/3d/anims/magia, 51 MB) are left out of git: they are all in inti_animado.glb |
| Wolf.fbx | Quaternius's wolf (CC0, the Ultimate Animated Animal Pack): its skeleton and 12 clips under Inti's nahuel, a puma of ours, by `tools/blender/fit_to_bull.py ... --still Ear,Tail --hips yes` (its great ears and thrashing tail hold nothing; its hind legs' joints set inside the puma's thighs up to the hip) |
| Grab And Put Back Rifle.fbx | "Grab And Put Back Rifle": Cabral's musket taken from his back over his right shoulder and put back there, `--name tomar_fusil --feet --twist 1`, then `tools/blender/anims/descolgar.py` cuts it in two (`mosquete_descolgar`, frames 6 to 51 eased into the aim; `mosquete_guardar`, eased from the aim into 74 to 130), and `props.musket_carried` moves the musket from his back into his hand and back (on trial in modelos.html, not in the game yet) |
| Unarmed Equip Over Shoulder.fbx | tried for the same and left for the one above, which does both ways |
| Bayonet Stab.fbx | "Bayonet Stab": the frontier soldier's thrust, all of it, `--name bayoneta_captura --feet --twist 1`, then `tools/blender/anims/fusil_en_manos.py ... bayoneta` lays his rifle through both fists (built with `--carries bayonet,musket,musket_in_hand,musket_in_fists@R_Hand@fusil_bayoneta`: the royalist's musket with a bayonet fixed) |
| Scary Zombie Pack (zombie idle, walk, attack, dying, death) | the plague-dead soldier's standing (`reposo`, `--feet`), walk (`caminata`, `--gait --feet`), blow (`golpe`, `--feet`) and two deaths to choose from (`muerte` from zombie dying, `muerte_b` from zombie death, `--ground`) |
| Zombie Scream.fbx | "Zombie Scream": the plague-dead soldier's scream, `--name grito --feet` |
| Laying Severe Cough.fbx | "Laying Severe Cough": the plague-dead soldier's retching. Captured lying down: retargeted as it is (`anims/aparte/tos_acostado.glb`), then `tools/blender/upper_from.py` stands its spine, arms and head on his standing's legs (`--name vomito`) |
| Scary Zombie Pack (zombie crawl, running crawl) | the plague-dead soldier's crawls on the ground, `arrastre` and `arrastre_rapido`, `--gait --ground` |
| Zombie Stand Up.fbx | "Zombie Stand Up": the plague-dead soldier getting up out of the ground, from lying face down, `--name levantarse --ground` |
| Scary Zombie Pack (zombie run) | the plague-dead soldier's run as he charges, `--name carrera --gait --feet` |

Julio Argentino Roca (assets/roca/3d, 28/10/2026) has the captain's clips made again on his rig, as the rows above say: breathing_idle, walking, Falling Back Death (eased), Stabbing (al_frente, sabre by the little finger, aim 9), Handgun (mirrored, al_frente with the pistol in his left hand, aim 14) and Standing Taunt Battlecry; built with `--front +x --carries sabre,revolver@L_Hand,sabre@R_Hand@little` (his revolver, props.revolver, in place of the pistol: named and aimed as the pistol is).
| Sword And Shield Slash.fbx | "Sword And Shield Slash": Roca's sabre slash, wide and one-handed (his revolver in the other), `--name sablazo --feet` |

Roca's signal to his battery (`senal`: his sabre raised at the sky, shaken, then cut down to point at her) is keyed by hand, `tools/blender/anims/senal.py`: no capture had it.

Roca's burst (`rafaga`) is his shot (`tiro`) with his body swept at the waist from his right to his left as its five balls go off, `tools/blender/anims/abanico.py`.
| Running.fbx | "Running": Roca's spotter's run, `--name carrera --gait --feet` |

Roca's spotter (assets/observador/3d) has Mixamo's Idle (`Idle.fbx`, `--name reposo_mixamo --feet`: wide-legged, his weight on one leg), Running and the fusilier's fall (Falling Back Death, eased), and his signals keyed by hand (`tools/blender/anims/senas.py`, kept as `anims/paso/senas_a_mano.glb`) and stood on that idle's hips and legs by `tools/blender/upper_from.py`, which keyed by hand stood stiff; built with `--front +x --carries signal_flag@R_Hand@roja,signal_flag@L_Hand@blanca`.
| Hard Landing.fbx | "Hard Landing": Roca dropping onto the clearing as he comes into his fight, all 48 frames, `--name aterrizaje` (neither `--feet` nor `--ground`: its fall is kept, his feet meeting the ground at frame 12), the gallery dropping him from higher still (its `caida`) |
| Mutant Idle.fbx | "Mutant Idle": the Wekufe floating, hunched and heaving, `--name reposo`, then `tools/blender/smoke_tail.py` (both legs given the same bend and wave: his gown of smoke swings with them); the joined model then cut under his waist (`tools/blender/cut_below.py`) before `glow.py` |
| Mutant Swiping.fbx | "Mutant Swiping": the Wekufe's claws as he comes out of smoke beside her, `--name zarpazo`, then `smoke_tail.py` |
| Run To Dive.fbx | "Run To Dive": the Wekufe going into the earth, head first, to come out of smoke beside her, all 24 frames, `--name zambullida`, then `smoke_tail.py` |
| Zombie Agonizing.fbx | "Zombie Agonizing": the Wekufe's death, writhing as he sinks into the earth, frames 0 to 120 (the writhing, of 224), `--name muerte`, then `smoke_tail.py` |
| Zombie Agonizing.fbx (again) | the plague-dead soldier as the Wekufe comes into him, frames 0 to 120, `--name agonia --feet`, on Tripo's rig `423e7cfe` (on the finished `apestado_animado.glb` every bone comes out still); kept apart as `assets/apestado/3d/anims/agonia.glb`, loaded by `modelos.ts` for now |
| Pro Magic Pack/Standing 2H Magic Attack 05.fbx | the Wekufe summoning his cloud of spirits, `--name invocar --twist 1`, then `smoke_tail.py` |
| Pro Magic Pack/Standing 2H Magic Attack 02.fbx | the Wekufe throwing his red fire, `--name lanzar --twist 1`, then `smoke_tail.py` |
