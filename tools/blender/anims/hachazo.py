"""The sergeant's blow with the halberd: Mixamo's "Standing Melee Attack Downward" (a one-handed axe
brought down overhead), put on his rig, with the halberd swung in it and his left hand on it too.

    Blender -b --python tools/blender/anims/hachazo.py -- RIG.glb REPOSO.glb CLIP.glb OUT.glb

CLIP is the capture already on his rig (tools/blender/retarget_rot.py ... --name barrido --feet);
REPOSO his standing clip, to set the halberd in his hand as the game's model has it
(props.halberd_in_hands). Every frame his body is the capture's; only two things are added:

- The halberd is pointed along his right arm, from the shoulder through the hand and on, a little
  more upright: up and back as he raises it, down before him as it falls. Held as an axe is, a
  pole that long pointed wherever the capture's wrist did, down at his feet as he raised it.
- His left hand takes the shaft below the right, toward the butt (the right holding it a fifth of the way up), wherever the shaft is, by reach; where it cannot
  reach it, it keeps the capture's place.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])


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

# How far along the shaft from the right hand the left takes it (below it, toward the butt); how far the left reaches from its
# shoulder to the shaft, and over how much further it lets it go.
APART, REACH, SLACK = -0.15, 0.345, 0.05
# How much more upright than the arm's line the halberd is held.
LIFT = 0.25
# Over how many frames at the start it is brought from standing upright to the arm's line, and
# over how many at the end it is stood up again, as he stands about with it.
RAISE, LOWER = 6, 12
bones = arm.pose.bones
first, last = (int(f) for f in act.frame_range)
world = arm.matrix_world
for frame in range(first, last + 1):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    shoulder = bones['R_Upperarm'].matrix.to_translation()
    wrist = bones['R_Hand'].matrix.to_translation()
    line = (wrist - shoulder).normalized()
    want = (line + Vector((0, 0, LIFT))).normalized()
    k = min(1.0, (frame - first) / RAISE, (last - frame) / LOWER)
    k = k * k * (3 - 2 * k)
    want = Vector((0, 0, 1)).slerp(want, k) if k < 1 else want
    # The halberd turned by the hand, about the wrist, to lie that way.
    hand = bones['R_Hand']
    now = (world.inverted().to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()
    q = now.rotation_difference(want)
    head = hand.matrix.to_translation()
    hand.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ hand.matrix
    bpy.context.view_layer.update()
    hand.keyframe_insert('rotation_quaternion', frame=frame)
    # The left hand on the shaft above the right, where it can reach it.
    butt = world.inverted() @ pole.matrix_world.to_translation()
    along = (world.inverted().to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()
    grip = world.inverted() @ (world @ hand.matrix.to_translation())
    on = butt + along * ((grip - butt).dot(along) + APART)
    upper = bones['L_Upperarm']
    far = (on - upper.matrix.to_translation()).length
    holds = max(0.0, min(1.0, (REACH + SLACK - far) / SLACK))
    if holds > 0:
        own = bones['L_Hand'].matrix.to_translation()
        side = Vector((0, 1, 0)) - along * along.y
        rig.reach(upper, own.lerp(on, holds), (side.normalized() * 0.6 + Vector((0, 0, -0.8))).normalized())
        forearm = next(c for c in upper.children if 'Twist' not in c.name)
        for pb in (upper, forearm):
            pb.keyframe_insert('rotation_quaternion', frame=frame)
    print('F', frame, 'left holds %.2f' % holds, 'reach %.3f' % far, 'hand z %.3f' % wrist.z)

rig.export(args[3])
