"""The sergeant's halberd blow: Mixamo's "Heavy Weapon Swing" (a heavy weapon in both hands, raised
and brought down hard before him), put on his rig, its long idle cut off, with the halberd in it.

    Blender -b --python tools/blender/anims/golpe_pesado.py -- RIG.glb REPOSO.glb CLIP.glb OUT.glb

CLIP is the capture already on his rig (tools/blender/retarget_rot.py ... --name barrido --feet);
REPOSO his standing clip, to set the halberd in his hand as the game's model has it
(props.halberd_in_hands). His body is the capture's, kept from FROM to TO (frames of the capture):
it begins swaying a while before it moves, and the cut is made where it is stillest, so that it
comes in from standing without a jerk. The capture holds both hands on the weapon all through, a
hand's breadth apart: the halberd lies along the line from one to the other, its head the way it is
ahead at the blow, and the left hand is set on the shaft (a few centimetres at most), its elbow as
the capture has it.
"""
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])
# Where the capture is cut: its stillest frame before it moves, and the frame it is still again by;
# and the frame of the blow (the hands lowest, stopped hardest), as the capture numbers them.
FROM, TO, BLOW = 19, 95, 53


def bring(path: str) -> bpy.types.Action:
    """The action of a clip on this rig, without its own objects."""
    before, had = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o)
    return next(a for a in bpy.data.actions if a not in had)


standing = bring(args[1])
standing.name = 'reposo_mixamo'
pole = props.halberd_in_hands(rig.arm)
bpy.data.actions.remove(standing)
act = bring(args[2])
act.name = 'barrido'
arm = rig.arm
arm.animation_data_create()
arm.animation_data.action = act
if getattr(act, 'slots', None):
    arm.animation_data.action_slot = act.slots[0]

# The cut: every key outside it dropped, the rest moved to begin at 0.
curves = act.fcurves if hasattr(act, 'fcurves') and act.fcurves else [c for layer in act.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves]
for curve in curves:
    # From the end back: removing one moves those after it.
    for i in reversed(range(len(curve.keyframe_points))):
        if not FROM <= curve.keyframe_points[i].co.x <= TO:
            curve.keyframe_points.remove(curve.keyframe_points[i])
    for point in curve.keyframe_points:
        point.co.x -= FROM
        point.handle_left.x -= FROM
        point.handle_right.x -= FROM
    curve.update()
last = TO - FROM
act.frame_range = (0, last)

bones = arm.pose.bones
local = arm.matrix_world.inverted()


def wrists() -> tuple:
    return bones['R_Hand'].matrix.to_translation(), bones['L_Hand'].matrix.to_translation()


# Which way the head is: from the left hand to the right, or back, whichever is ahead at the blow.
bones['R_Hand'].matrix_basis = Matrix.Identity(4)
bpy.context.scene.frame_set(BLOW - FROM)
bpy.context.view_layer.update()
right, left = wrists()
sign = 1 if (right - left).x >= 0 else -1

for frame in range(0, last + 1):
    hand = bones['R_Hand']
    # The capture does not turn the hand: it is kept as the forearm has it, and turned here.
    hand.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    right, left = wrists()
    way = ((right - left) * sign).normalized()
    now = (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()
    q = now.rotation_difference(way)
    hand.matrix = Matrix.Translation(right) @ q.to_matrix().to_4x4() @ Matrix.Translation(-right) @ hand.matrix
    bpy.context.view_layer.update()
    hand.keyframe_insert('rotation_quaternion', frame=frame)
    # The left wrist onto the line the right's lies on, along the shaft; its elbow where it was.
    upper = bones['L_Upperarm']
    forearm = next(c for c in upper.children if 'Twist' not in c.name)
    elbow = forearm.matrix.to_translation()
    shoulder = upper.matrix.to_translation()
    on = right + way * (left - right).dot(way)
    moved = (on - left).length
    middle = (shoulder + on) / 2
    rig.reach(upper, on, (elbow - middle).normalized())
    for pb in (upper, forearm):
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    print('F', frame, 'left moved %.3f' % moved, 'apart %.3f' % (right - left).length)

rig.export(args[3])
