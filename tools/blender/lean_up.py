"""Raise a clip's upper body from the waist, every frame alike: one lying on his back propped up
against something (the dying royalist against a cart wheel), his legs left on the ground.

    Blender -b --python tools/blender/lean_up.py -- IN.glb CLIP OUT.glb DEGREES [BONE]

Turns BONE (Waist) about the rig's own left-right axis (+Y, his left), at its joint, by DEGREES on
top of how the clip has it, in every frame, and keys it so; the rest of the body as the clip has it.
"""
import math
import sys

import bpy
from mathutils import Matrix

args = sys.argv[sys.argv.index('--') + 1:]
src, clip, out, degrees = args[0], args[1], args[2], float(args[3])
bone = args[4] if len(args) > 4 else 'Waist'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
action = bpy.data.actions[clip]
arm.animation_data_create()
arm.animation_data.action = action
try:
    arm.animation_data.action_slot = action.slots[0]
except Exception:
    pass
pb = arm.pose.bones[bone]
pb.rotation_mode = 'QUATERNION'
first, last = (int(f) for f in action.frame_range)
scene = bpy.context.scene
# Every frame as the clip has it, read before anything is keyed.
was = {}
for f in range(first, last + 1):
    scene.frame_set(f)
    was[f] = pb.matrix.copy()
turn = Matrix.Rotation(math.radians(degrees), 4, 'Y')
for f in range(first, last + 1):
    scene.frame_set(f)
    head = was[f].to_translation()
    pb.matrix = Matrix.Translation(head) @ turn @ Matrix.Translation(-head) @ was[f]
    bpy.context.view_layer.update()
    pb.keyframe_insert('rotation_quaternion', frame=f)
    pb.keyframe_insert('location', frame=f)
print('LEANT', bone, degrees, 'frames', first, last)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True)
