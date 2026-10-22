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
# Where the capture is cut: where it begins to raise the weapon (its sway and its slow first lowering
# left out: he took too long to strike), and the frame it is still again by;
# and the frame the hands are lowest at, as the capture numbers them, where the shaft is near upright (it
# tells which end is the head). The blow lands before that, at frame 12 of the cut (49 of the capture):
# the halberd sweeps across before him from his right, and its head is straight before him then.
FROM, TO, BLOW = 37, 95, 53


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


def fists() -> tuple:
    return props.held_at(arm, 'R_Hand'), props.held_at(arm, 'L_Hand')


def axis() -> Vector:
    return (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()


def edge() -> Vector:
    """The way the axe's edge faces: the halberd's -Y."""
    return (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((0, -1, 0)))).normalized()


def lay(hand, way: Vector, facing: Vector | None) -> None:
    """Turns the hand about its wrist so the halberd lies along `way`, its edge toward `facing`."""
    target_x = way.normalized()
    if facing is None:
        q = axis().rotation_difference(target_x)
    else:
        e = (facing - target_x * facing.dot(target_x)).normalized()
        target = Matrix((target_x, -e, target_x.cross(-e))).transposed()
        now = Matrix((axis(), -edge(), axis().cross(-edge()))).transposed()
        q = (target @ now.inverted()).to_quaternion()
    head = hand.matrix.to_translation()
    hand.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ hand.matrix
    bpy.context.view_layer.update()


def through_fists(hand) -> Vector:
    """The halberd laid through both fists. The shaft is held in the right fist, which moves as the hand
    turns about the wrist: laid, looked at again, laid again, until it passes through the left too."""
    for _ in range(4):
        right, left = fists()
        way = ((right - left) * sign).normalized()
        lay(hand, way, None)
    return way


# Which way the head is: from the left fist to the right, or back, whichever is down at the blow
# (the shaft stands near upright there, and which way is ahead of him is too near to call).
bones['R_Hand'].matrix_basis = Matrix.Identity(4)
bpy.context.scene.frame_set(BLOW - FROM)
bpy.context.view_layer.update()
right, left = fists()
sign = 1 if (right - left).z <= 0 else -1

# First the way it lies every frame, through both fists.
ways = {}
for frame in range(0, last + 1):
    hand = bones['R_Hand']
    hand.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    ways[frame] = through_fists(hand)

# The edge toward where the head is going: the way it turns from the frame before to the frame
# after, square to the shaft; where it hardly moves (standing on guard) it keeps the last edge it
# had; and smoothed over the frames either side, so that it does not flicker.
SMOOTH = 3
going, held = {}, None
for frame in range(0, last + 1):
    a, b = ways[max(0, frame - 1)], ways[min(last, frame + 1)]
    turn = b - a
    turn -= ways[frame] * turn.dot(ways[frame])
    if turn.length > 0.02:
        held = turn.normalized()
    going[frame] = held
first_known = next(v for v in going.values() if v is not None)
facing = {}
for frame in range(0, last + 1):
    near = [going[f] or first_known for f in range(frame - SMOOTH, frame + SMOOTH + 1) if f in going]
    facing[frame] = sum(near, Vector()).normalized()

# Where the axe's head is along the shaft from the right fist, and the ground it is kept on: the
# capture's weapon was shorter, and at the blow, bent over, the halberd went down through the ground
# at his feet. Where it would, it is raised about his right fist so the head lies on the ground before him.
LENGTH = pole.dimensions.x
HEAD = LENGTH * (0.9 - props.SWUNG)
GROUND = 0.035


def onto_ground(way: Vector) -> Vector:
    right = props.held_at(arm, 'R_Hand')
    if (right + way * HEAD).z >= GROUND:
        return way
    flat = Vector((way.x, way.y, 0))
    flat = flat.normalized() if flat.length > 0.25 else Vector((1, 0, 0))
    down = max(-1.0, min(1.0, (GROUND - right.z) / HEAD))
    return (flat * (1 - down * down) ** 0.5 + Vector((0, 0, down))).normalized()


def left_onto(way: Vector) -> None:
    """His left fist onto the shaft where it was along it, his elbow where it was."""
    upper, hand = bones['L_Upperarm'], bones['L_Hand']
    elbow = next(c for c in upper.children if 'Twist' not in c.name).matrix.to_translation()
    right = props.held_at(arm, 'R_Hand')
    along = (props.held_at(arm, 'L_Hand') - right).dot(way)
    for _ in range(4):
        fist_at = right + way * along
        wrist = hand.matrix.to_translation()
        target = fist_at - (props.held_at(arm, 'L_Hand') - wrist)
        shoulder = upper.matrix.to_translation()
        rig.reach(upper, target, (elbow - (shoulder + target) / 2).normalized())


# Then laid so (on the ground where it would go through it), and keyed.
for frame in range(0, last + 1):
    hand = bones['R_Hand']
    hand.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    through_fists(hand)
    for _ in range(2):
        right, left = fists()
        lay(hand, ((right - left) * sign).normalized(), facing[frame])
    raised = onto_ground(axis())
    if raised.angle(axis()) > 0.01:
        for _ in range(3):
            lay(hand, onto_ground(axis()) if _ else raised, facing[frame])
        left_onto(axis())
        upper = bones['L_Upperarm']
        for pb in (upper, next(c for c in upper.children if 'Twist' not in c.name)):
            pb.keyframe_insert('rotation_quaternion', frame=frame)
    hand.keyframe_insert('rotation_quaternion', frame=frame)
    tip = props.held_at(arm, 'R_Hand') + axis() * HEAD
    print('TIP', frame, 'ahead %.3f up %.3f' % (tip.x, tip.z))
    right, left = fists()
    off = (left - right) - axis() * (left - right).dot(axis())
    print('F', frame, 'left fist off the shaft %.4f' % off.length, 'edge to going %.0f' % __import__('math').degrees(edge().angle(facing[frame] - axis() * facing[frame].dot(axis()))))

rig.export(args[3])
