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
