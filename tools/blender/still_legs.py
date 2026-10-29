"""Keep a clip's legs at rest, for a body without legs: the Wekufe's tail of smoke is skinned to
Tripo's leg bones, and a capture's legs stepping and spreading spread it like a skirt. Every bone
from the thighs down is laid back at its rest turn each frame; the hips keep their sway, so the
tail follows the body.

    Blender -b --python tools/blender/still_legs.py -- CLIP.glb OUT.glb [--name zarpazo]

CLIP.glb is a single clip of one rig (tools/blender/retarget_rot.py's).
"""
import sys

import bpy
from mathutils import Quaternion

args = sys.argv[sys.argv.index('--') + 1:]
clip_path, out = args[:2]
opts = dict(zip(args[2::2], args[3::2]))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=clip_path)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
old = bpy.data.actions[0]
NAME = opts.get('--name', old.name)
for track in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(track)
arm.animation_data.action = old
arm.animation_data.action_slot = old.slots[0]
first, last = (int(f) for f in old.frame_range)
frames = []
for f in range(first, last + 1):
    bpy.context.scene.frame_set(f)
    frames.append({pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in arm.pose.bones})

legs = set()
for side in ('L_', 'R_'):
    thigh = arm.pose.bones[side + 'Thigh']
    legs |= {thigh.name} | {b.name for b in thigh.children_recursive}

act = bpy.data.actions.new(NAME)
arm.animation_data.action = act
bpy.data.actions.remove(old)
for f, pose in enumerate(frames):
    for pb in arm.pose.bones:
        loc, rot = pose[pb.name]
        if pb.name in legs:
            rot = Quaternion()
        pb.location, pb.rotation_quaternion = loc, rot
        pb.keyframe_insert('location', frame=f)
        pb.keyframe_insert('rotation_quaternion', frame=f)

arm.animation_data.action = None
track = arm.animation_data.nla_tracks.new()
track.name = NAME
track.strips.new(NAME, 0, act)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_animation_mode='NLA_TRACKS')
print('WROTE', out, NAME, f'{len(frames)} frames, its legs at rest ({len(legs)} bones)')
