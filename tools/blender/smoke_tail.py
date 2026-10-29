"""Turn a clip's legs into a tail of smoke, for a body without legs: the Wekufe's tail is skinned
to Tripo's leg bones, and a capture's legs stepping and spreading spread it like a skirt. Both legs
are given the same turns each frame, bone for bone, instead of the capture's: bent back from the
hips more at each bone down (the tail trailing behind him), and swaying side to side and a little
back and forth in a wave that runs down it, later at each bone, as a snake's. The hips keep their
sway, so the tail follows the body. The wave goes round a whole number of times in the clip, so a
loop stays one.

    Blender -b --python tools/blender/smoke_tail.py -- CLIP.glb OUT.glb [--name zarpazo] [--bend 18] [--sway 18] [--lag 0.9] [--wave 50] [--curl 16] [--lift 40]

CLIP.glb is a single clip of one rig (tools/blender/retarget_rot.py's). --bend is the bend back at
each bone, in degrees; --sway how far it swings at each; --lag how much later (in radians) each bone
down swings than the one above; --wave about how many frames the wave takes to go round; --curl how
much it is bent side to side, the other way at each bone down, in an S as a rattlesnake's lies; --lift
how much more its last bone is bent back, the tip raised behind him.
"""
import math
import sys

import bpy
from mathutils import Quaternion, Vector

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

BEND = math.radians(float(opts.get('--bend', 18)))
SWAY = math.radians(float(opts.get('--sway', 18)))
CURL = math.radians(float(opts.get('--curl', 16)))
LIFT = math.radians(float(opts.get('--lift', 40)))
LAG = float(opts.get('--lag', 0.9))
ROUNDS = max(1, round((len(frames) - 1) / float(opts.get('--wave', 50))))

legs = set()
for side in ('L_', 'R_'):
    thigh = arm.pose.bones[side + 'Thigh']
    legs |= {thigh.name} | {b.name for b in thigh.children_recursive}
# The bones the tail bends at, top down; the rest (twists, the toes) stay at rest.
CHAIN = ('Thigh', 'Calf', 'Foot')


def about(name: str, axis: tuple[float, float, float]) -> Vector:
    """The rig's axis (+X his front, +Y his left, +Z up) in a bone's own axes, at rest."""
    return (arm.pose.bones[name].bone.matrix_local.to_3x3().inverted() @ Vector(axis)).normalized()


def tail(name: str, f: int) -> Quaternion:
    """A tail bone's turn at frame f: its bend back, and the wave as it reaches it."""
    i = CHAIN.index(name[2:])
    at = 2 * math.pi * ROUNDS * f / (len(frames) - 1) - i * LAG
    # About his left (+Y) a hanging bone swings back; about his front (+X), to his side.
    back = BEND * (1 + 0.5 * i) + 0.35 * SWAY * math.sin(2 * at) + (LIFT if i == len(CHAIN) - 1 else 0)
    # The S: one way at the top, the other way twice as much below it (to undo it and go past).
    side = CURL * (1 if i == 0 else -2 if i == 1 else 2)
    return Quaternion(about(name, (1, 0, 0)), side + SWAY * math.sin(at)) @ Quaternion(about(name, (0, 1, 0)), back)

act = bpy.data.actions.new(NAME)
arm.animation_data.action = act
bpy.data.actions.remove(old)
for f, pose in enumerate(frames):
    for pb in arm.pose.bones:
        loc, rot = pose[pb.name]
        if pb.name in legs:
            rot = tail(pb.name, f) if pb.name[2:] in CHAIN else Quaternion()
        pb.location, pb.rotation_quaternion = loc, rot
        pb.keyframe_insert('location', frame=f)
        pb.keyframe_insert('rotation_quaternion', frame=f)

arm.animation_data.action = None
track = arm.animation_data.nla_tracks.new()
track.name = NAME
track.strips.new(NAME, 0, act)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_animation_mode='NLA_TRACKS')
print('WROTE', out, NAME, f'{len(frames)} frames, its legs a tail ({ROUNDS} waves)')
