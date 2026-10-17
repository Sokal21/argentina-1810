"""Cabral's trot: one stride of each leg a loop, played in place; the game sets its pace to his speed.

    Blender -b --python tools/blender/anims/trote.py -- RIG.glb OUT.glb

Each leg goes round its stride by curves through the moments of a real step, not by sine waves:
the heel strikes with the knee nearly straight, the knee gives as the weight comes on, straightens
to push off from the toe, and folds right up as the leg comes through. The body drops as the weight
comes on and rises after, the hips drop toward the leg in the air, and the arms and head come a
little late. A limb hanging down swings forward on a negative turn about 'y'.
"""
import math
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig, ahead, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])
act = rig.action('trote')

LENGTH = 16   # frames: one stride of each leg
STEP = 1
BOB = 0.016   # how far the body drops onto each foot, in the rig's units (he is ~0.75 tall)
INWARD = 5    # the thighs drawn in from the A-pose's wide stance, so the feet fall under him
ARMS = 30
LATE = 0.07   # how far round the stride the arms and head come behind


def curve(points: list[tuple[float, float]], p: float) -> float:
    """The value at `p` (0 to 1, round a loop) of a smooth curve through (moment, value) points."""
    p %= 1
    pts = points + [(points[0][0] + 1, points[0][1])]
    for (p0, v0), (p1, v1) in zip(pts, pts[1:]):
        if p0 <= p <= p1:
            k = (p - p0) / (p1 - p0)
            k = k * k * (3 - 2 * k)  # eased in and out
            return v0 + (v1 - v0) * k
    return pts[0][1]


# One leg round its stride, from the moment its heel strikes (0); it pushes off at 0.45.
THIGH = [(0, -21), (0.2, -4), (0.45, 17), (0.6, 12), (0.8, -17), (0.92, -23)]
KNEE = [(0, 8), (0.15, 24), (0.42, 12), (0.68, 56), (0.86, 24), (0.96, 6)]
# The foot's angle to the ground: toe up at the strike, flat, toe down to push off, up again.
FOOT = [(0, -12), (0.1, 0), (0.32, 2), (0.47, 32), (0.62, 18), (0.82, -6)]
# The body over one step: dropping as the weight comes on, highest after the push.
BODY = [(0, -0.4), (0.3, -1), (0.75, 0.35)]


def leg(p: float) -> tuple[float, float, float]:
    thigh, knee = curve(THIGH, p), curve(KNEE, p)
    return thigh, knee, curve(FOOT, p) - thigh - knee


for frame in range(0, LENGTH + 1, STEP):
    t = frame / LENGTH
    lt, lk, lf = leg(t)
    rt, rk, rf = leg(t + 0.5)
    a = 2 * math.pi * t
    late = 2 * math.pi * (t - LATE)
    # Which leg is in the air: the hips drop toward it (left in the air from 0.5 to 1).
    lifted = math.sin(a + math.pi)
    rig.key(act, frame, {
        'Hip': [('move', (0, 0, BOB * curve(BODY, 2 * t))), turn('z', 5 * math.sin(a)), turn('x', 3 * lifted)],
        'L_Thigh': [turn('x', -INWARD - 3 * lifted), turn('y', lt)], 'L_Calf': turn('y', lk), 'L_Foot': turn('y', lf),
        'R_Thigh': [turn('x', INWARD - 3 * lifted), turn('y', rt)], 'R_Calf': turn('y', rk), 'R_Foot': turn('y', rf),
        # Leaning a little into it; the chest turns against the hips and rolls back level.
        'Spine01': [turn('y', 6), turn('z', -8 * math.sin(late)), turn('x', -3 * lifted)],
        'Spine02': turn('y', 1.5 * math.sin(2 * late)),
        'Head': [turn('z', 4 * math.sin(late)), turn('y', -3 + 2 * math.sin(2 * late))],
        # The arms swing against the legs, late, the elbows giving more as they come forward.
        'L_Upperarm': [ahead(0.05, 0.16, -1), turn('y', ARMS * 0.55 * math.sin(late))],
        'L_Forearm': [ahead(0.05, 0.16, -1), turn('y', -30 - 12 * max(0, -math.sin(late)))],
        'R_Upperarm': [ahead(0.05, -0.16, -1), turn('y', -ARMS * math.sin(late))],
        'R_Forearm': [ahead(0.05, -0.16, -1), turn('y', -28 - 22 * max(0, math.sin(late)))],
        'L_Hand': turn('y', -8), 'R_Hand': turn('y', -8),
    })

rig.export(args[1])
