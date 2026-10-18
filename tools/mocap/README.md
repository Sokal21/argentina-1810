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
| breathing_idle.fbx | "Breathing Idle": his standing, all 299 frames |
