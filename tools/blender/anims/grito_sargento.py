"""The sergeant's shout: Mixamo's "Standing Taunt Battlecry" (hunched, then chest out and arms flung
wide, roaring), put on his rig, his halberd brandished in his right hand.

    Blender -b --python tools/blender/anims/grito_sargento.py -- RIG.glb REPOSO.glb CLIP.glb OUT.glb

REPOSO is his standing clip, to set the halberd in his hand as the game's model has it; CLIP the
capture already on his rig (tools/blender/retarget_rot.py ... --name grito --feet). Its
arms are flung too wide for both hands to stay on the shaft: his left lets it go, and his right holds
it up, every frame, standing out of his fist along his forearm's line turned up toward the sky, its
edge out ahead of him, so that it is raised as his arm is.
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
arm = rig.arm
bones = arm.pose.bones
local = arm.matrix_world.inverted()



def bring(path: str, name: str) -> bpy.types.Action:
    before, had = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o)
    found = next(a for a in bpy.data.actions if a not in had)
    found.name = name
    return found


standing = bring(args[1], 'reposo_mixamo')
pole = props.halberd_in_hands(arm)
bpy.data.actions.remove(standing)
act = bring(args[2], 'grito')
arm.animation_data_create()
arm.animation_data.action = act
if getattr(act, 'slots', None):
    arm.animation_data.action_slot = act.slots[0]

# How much of the forearm's line it follows, the rest straight up.
FOLLOW = 0.35


def axis() -> Vector:
    return (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()


def edge() -> Vector:
    return (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((0, -1, 0)))).normalized()


first, last = (int(f) for f in act.frame_range)
for frame in range(first, last + 1):
    hand = bones['R_Hand']
    hand.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    forearm = (hand.matrix.to_translation() - bones['R_Forearm'].matrix.to_translation()).normalized()
    x = (Vector((0, 0, 1)) * (1 - FOLLOW) + forearm * FOLLOW).normalized()
    ahead = Vector((1, 0, 0))
    e = (ahead - x * ahead.dot(x)).normalized()
    target = Matrix((x, -e, x.cross(-e))).transposed()
    now = Matrix((axis(), -edge(), axis().cross(-edge()))).transposed()
    q = (target @ now.inverted()).to_quaternion()
    head = hand.matrix.to_translation()
    hand.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ hand.matrix
    bpy.context.view_layer.update()
    hand.keyframe_insert('rotation_quaternion', frame=frame)

rig.export(args[3])
