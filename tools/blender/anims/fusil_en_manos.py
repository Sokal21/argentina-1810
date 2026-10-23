"""A capture already on his rig, played again with his musket in both fists laid along them every
frame (props.musket_in_fists, props.lay_in_fists): for a capture of a man holding a rifle (Mixamo's
Rifle Idle), whose hands the musket alone does not keep together.

    Blender -b --python tools/blender/anims/fusil_en_manos.py -- RIG.glb CLIP.glb OUT.glb NAME

CLIP is the capture on his rig (tools/blender/retarget_rot.py ... --twist 1); NAME the new clip's.
"""
import os
import sys

import bpy

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])
arm = rig.arm
bones = arm.pose.bones
gun = props.musket_in_fists(arm)
had = set(bpy.data.actions)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=args[1])
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
taken = next(a for a in bpy.data.actions if a not in had)
taken.name = "captura"
arm.animation_data_create()
arm.animation_data.action = taken
if getattr(taken, 'slots', None):
    arm.animation_data.action_slot = taken.slots[0]
# Every pose read first, then the new clip keyed (Blender's action slots: see tiro_arrodillado.py).
first, last = (int(f) for f in taken.frame_range)
poses = []
for frame in range(first, last + 1):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    poses.append({pb.name: pb.matrix_basis.copy() for pb in bones})
arm.animation_data.action = None
act = rig.action(args[3])
for n, pose in enumerate(poses):
    for pb in bones:
        pb.matrix_basis = pose[pb.name]
    bpy.context.view_layer.update()
    props.lay_in_fists(arm, gun)
    for pb in bones:
        pb.keyframe_insert('rotation_quaternion', frame=n)
        pb.keyframe_insert('location', frame=n)
act.frame_range = (0, last - first)
bpy.data.actions.remove(taken)
rig.export(args[2])
