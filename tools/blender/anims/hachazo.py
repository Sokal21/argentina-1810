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
# Over how many frames at the start it is brought from standing upright to the arm's line, and
# over how many at the end it is stood up again, as he stands about with it.
RAISE, LOWER = 6, 10
bones = arm.pose.bones
first, last = (int(f) for f in act.frame_range)
world = arm.matrix_world
local = world.inverted()
# How far before his chest the left hand must be (from the chest bone's joint, along the way his
# chest faces), so that his arm does not go through him; the places along the shaft it may take,
# from the right hand (negative: toward the butt), the nearer the butt the better; and over how
# many frames the place it takes is smoothed.
CLEAR, PLACES, SMOOTH = 0.15, [x / 100 for x in range(-22, 23, 2)], 2


def chest() -> tuple:
    """Where his chest is, and the ways it faces ahead and to his left, as he is posed now."""
    pb = bones['Spine02']
    turned = pb.matrix.to_3x3() @ pb.bone.matrix_local.to_3x3().inverted()
    return pb.matrix.to_translation(), (turned @ Vector((1, 0, 0))).normalized(), (turned @ Vector((0, 1, 0))).normalized()


def shaft() -> tuple:
    hand = bones['R_Hand']
    butt = local @ pole.matrix_world.to_translation()
    along = (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()
    grip = hand.matrix.to_translation()
    return butt + along * (grip - butt).dot(along), along


# The halberd's way, keyed on the capture's timing (it is his arm's, not his wrist's: the capture
# ends the blow with his hand hung back by his hip, as an axe can be and a halberd cannot): frame,
# bearing (0 ahead, 90 his left, 180 behind), rise. Upright as he stands, back over his shoulder as
# he gathers, over the top, down before him at the blow (frame 17), on low to his left, and up again.
PATH = [(0, 0, 90), (4, 175, 70), (9, 175, 25), (12, 180, 15), (14, 0, 85), (16, 0, 25), (17, 5, -20),
        (20, 30, -30), (26, 35, -25), (32, 15, 15), (37, 0, 70), (last, 0, 90)]


def bearing(azimuth: float, rise: float) -> Vector:
    a, e = math.radians(azimuth), math.radians(rise)
    return Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))


def path(frame: int) -> Vector:
    for (f0, a0, e0), (f1, a1, e1) in zip(PATH, PATH[1:]):
        if f0 <= frame <= f1:
            k = (frame - f0) / (f1 - f0)
            return bearing(a0, e0).slerp(bearing(a1, e1), k * k * (3 - 2 * k))
    return bearing(*PATH[-1][1:])


# Every frame keyed, the hand turned (from as the capture has it) so the halberd lies that way.
for frame in range(first, last + 1):
    hand = bones['R_Hand']
    hand.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    now = (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()
    q = now.rotation_difference(path(frame))
    head = hand.matrix.to_translation()
    hand.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ hand.matrix
    bpy.context.view_layer.update()
    hand.keyframe_insert('rotation_quaternion', frame=frame)

# Where on the shaft the left hand can best go, every frame: the halberd itself is the capture's
# wrist's, held as an axe.
chosen = {}
for frame in range(first, last + 1):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    grip, along = shaft()
    middle, ahead, _ = chest()
    reach_from = bones['L_Upperarm'].matrix.to_translation()

    def worth(place):
        spot = grip + along * place
        clear = (spot - middle).dot(ahead)
        far = (spot - reach_from).length
        # Reachable and before his chest first; then as near the butt as can be.
        return (far <= REACH) + (clear >= CLEAR), -abs(place - APART), clear
    chosen[frame] = max(PLACES, key=worth)

# Then the left hand on the shaft there (smoothed over the frames either side), the elbow out to his left.
for frame in range(first, last + 1):
    near = [chosen[f] for f in range(frame - SMOOTH, frame + SMOOTH + 1) if f in chosen]
    place = sum(near) / len(near)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    grip, along = shaft()
    middle, ahead, left = chest()
    on = grip + along * place
    # Kept before his chest where it is level with his body (over his shoulders it cannot go through him).
    clear = (on - middle).dot(ahead)
    shoulders = bones['L_Upperarm'].matrix.to_translation().z
    if clear < CLEAR and on.z < shoulders:
        on += ahead * (CLEAR - clear) * min(1.0, (shoulders - on.z) / 0.08)
    upper = bones['L_Upperarm']
    far = (on - upper.matrix.to_translation()).length
    # Where it cannot reach the shaft (standing, the halberd upright at his right), it keeps the capture's place.
    holds = max(0.0, min(1.0, (REACH + SLACK - far) / SLACK))
    on = bones['L_Hand'].matrix.to_translation().lerp(on, holds)
    rig.reach(upper, on, (ahead * 0.5 + left * 1.0 - Vector((0, 0, 0.5))).normalized())
    forearm = next(c for c in upper.children if 'Twist' not in c.name)
    for pb in (upper, forearm):
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    print('F', frame, 'place %+.2f' % place, 'reach %.3f' % far, 'clear %.3f' % clear, 'holds %.2f' % holds)

rig.export(args[3])
