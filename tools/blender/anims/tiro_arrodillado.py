"""The rifleman's shot, on one knee: two Mixamo captures joined, the kneeling of one (a pistol shot
from one knee) under the shoulders of the other (a shotgun fired standing, violently). Every frame
his hips and legs are the kneeling capture's, held at one steady frame of it, and his waist, spine,
neck, head and arms are the shotgun's at that frame; so he stays down behind his basket while his
body raises the gun, aims and takes the kick.

    Blender -b --python tools/blender/anims/tiro_arrodillado.py -- RIG.glb KNEEL.glb SHOT.glb OUT.glb [--kneel 24] [--aim 27]

KNEEL and SHOT are the captures already on his rig (tools/blender/retarget_rot.py ... --twist 1).
Bones are each a turn from their rest relative to their parent: the upper body's, taken from the
standing capture, sit on the kneeling hips as they sat on the standing ones.

The shotgun's man fires off to his left and upwards (55 and 15 degrees, measured), while the game's
ball goes straight before him, level: so his whole upper body is turned, from the waist, by the one
turn that lays the barrel straight before him and level at frame `--aim` (the shot), every frame.
"""
import os
import sys

import bpy

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[4::2], args[5::2]))
KNEEL_AT = int(opts.get('--kneel', 24))
AIM_AT = int(opts.get('--aim', 27))
rig = Rig(args[0])
arm = rig.arm
bones = arm.pose.bones


def bring(path: str, name: str) -> bpy.types.Action:
    before, had = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o)
    found = next(a for a in bpy.data.actions if a not in had)
    found.name = name
    return found


gun = props.musket_in_fists(arm)
kneel = bring(args[1], 'arrodillado')
shot = bring(args[2], 'escopeta')
# From the kneeling: his hips (where they are and how they turn) and his legs.
LOWER = {b.name for b in arm.data.bones if b.name in ('Root', 'Hip', 'Pelvis') or any(k in b.name for k in ('Thigh', 'Calf', 'Foot', 'ToeBase'))}


def pose_of(act: bpy.types.Action, frame: int) -> dict:
    arm.animation_data_create()
    arm.animation_data.action = act
    if getattr(act, 'slots', None):
        arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {pb.name: pb.matrix_basis.copy() for pb in bones}


# Every pose read off the captures first, then the new clip keyed: an action switched to again
# after another was keyed was no longer played (Blender's action slots), and the shoulders stood still.
down = pose_of(kneel, KNEEL_AT)
first, last = (int(f) for f in shot.frame_range)
ups = [pose_of(shot, frame) for frame in range(first, last + 1)]
arm.animation_data.action = None
act = rig.action('tiro')
waist = bones['Waist']
# Straight before him and level, on his rig (+X forward, +Z up).
AHEAD = Vector((1, 0, 0))


def pose(n: int, turn: Quaternion) -> None:
    """Frame n of the joined clip: kneeling legs, the shotgun's upper body turned from the waist, the musket laid."""
    for pb in bones:
        pb.matrix_basis = (down if pb.name in LOWER else ups[n])[pb.name]
    bpy.context.view_layer.update()
    head = waist.matrix.to_translation()
    waist.matrix = Matrix.Translation(head) @ turn.to_matrix().to_4x4() @ Matrix.Translation(-head) @ waist.matrix
    bpy.context.view_layer.update()
    # The musket from the right fist through the left, its top up.
    props.lay_in_fists(arm, gun)


def barrel() -> Vector:
    """The way the musket points, on his rig."""
    return (arm.matrix_world.inverted().to_3x3() @ gun.matrix_world.to_3x3().col[0]).normalized()


# The turn found at the shot, a few times over: each laying of the musket moves it a little.
turn = Quaternion()
for _ in range(4):
    pose(AIM_AT, turn)
    turn = barrel().rotation_difference(AHEAD) @ turn
pose(AIM_AT, turn)
print('barrel at the shot', [round(v, 3) for v in barrel()])
for n in range(len(ups)):
    pose(n, turn)
    for pb in bones:
        pb.keyframe_insert('rotation_quaternion', frame=n)
        pb.keyframe_insert('location', frame=n)
act.frame_range = (0, last - first)
for other in (kneel, shot):
    bpy.data.actions.remove(other)
rig.export(args[3])
