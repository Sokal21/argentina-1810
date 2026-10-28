"""Roca's burst: his shot (the captain's, Mixamo's Handgun, al_frente.py) with his body turned at the
waist so that his revolver sweeps the cone of his burst from his right to his left as its balls go
off, one after another; turned to his right a little before, and back after.

    Blender -b --python tools/blender/anims/abanico.py -- RIG.glb TIRO.glb OUT.glb [--at 14] [--shots 5] [--apart 0.09] [--cone 50]

TIRO is his shot already on his rig; `--at` the frame its first ball goes off, `--shots` and
`--apart` (seconds) the balls of the burst, `--cone` how wide it sweeps (degrees). The turn is shared
between his two spine bones, so it bends through his back rather than at one joint. The clip comes
out named `rafaga`.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[3::2], args[4::2]))
AT, SHOTS = int(opts.get('--at', 14)), int(opts.get('--shots', 5))
APART, CONE = float(opts.get('--apart', 0.09)), math.radians(float(opts.get('--cone', 50)))
rig = Rig(args[0])
arm = rig.arm
FPS = rig.fps

before, had = set(bpy.data.objects), set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=args[1])
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
act = next(a for a in bpy.data.actions if a not in had)
act.name = 'rafaga'
arm.animation_data_create()
arm.animation_data.action = act
if getattr(act, 'slots', None):
    arm.animation_data.action_slot = act.slots[0]

# The sweep, in frames: drawn round to his right before the first ball, across to his left by the
# last, back to his front after. Turned about the upright, in the rig's axes (+Z up; + to his left).
last = AT + round((SHOTS - 1) * APART * FPS)
READY, BACK = 6, 9


def sweep(frame: float) -> float:
    if frame <= AT - READY or frame >= last + BACK:
        return 0.0
    ease = lambda k: k * k * (3 - 2 * k)
    if frame < AT:
        return -CONE / 2 * ease((frame - (AT - READY)) / READY)
    if frame <= last:
        return -CONE / 2 + CONE * (frame - AT) / max(1, last - AT)
    return CONE / 2 * (1 - ease((frame - last) / BACK))


SHARE = {'Spine01': 0.4, 'Spine02': 0.6}
up = (arm.matrix_world.inverted().to_3x3() @ Vector((0, 0, 1))).normalized()
first, end = (int(f) for f in act.frame_range)
# Each frame keyed as it is posed: a frame's keys change only that frame (every frame of the clip has its own).
for f in range(first, end + 1):
    angle = sweep(f)
    if angle == 0:
        continue
    bpy.context.scene.frame_set(f)
    for name in ('Spine01', 'Spine02'):
        pb = arm.pose.bones[name]
        head = pb.matrix.to_translation()
        turn = Quaternion(up, angle * SHARE[name]).to_matrix().to_4x4()
        pb.matrix = Matrix.Translation(head) @ turn @ Matrix.Translation(-head) @ pb.matrix
        bpy.context.view_layer.update()
        pb.keyframe_insert('rotation_quaternion', frame=f)

arm.animation_data.action = None
track = arm.animation_data.nla_tracks.new()
track.name = act.name
track.strips.new(act.name, first, act)
bpy.ops.export_scene.gltf(filepath=args[2], export_format='GLB', export_yup=True, export_animation_mode='NLA_TRACKS')
print('WROTE', args[2], act.name, f'swept from frame {AT - READY} to {last + BACK}, its balls from {AT} to {last}')
