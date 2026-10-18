"""Cabral's trot: one stride of each leg a loop, played in place; the game sets its pace to his speed.

    Blender -b --python tools/blender/anims/trote.py -- RIG.glb OUT.glb

Its curves are measured from a real run, CMU motion capture 09_01 (Carnegie Mellon's free
database), by tools/blender/measure_bvh.py, and eased down to a soldier's trot. Measured, a
running arm goes back twice as far as forward and the elbow stays bent near a right angle; the
first trot keyed by eye had neither. Signs as the rig takes them: a limb hanging down swings
forward on a negative turn about 'y', back on a positive one.
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
INWARD = 5    # the thighs drawn in from the A-pose's wide stance, so the feet fall under him

# The left side over one stride, sixteen even moments from the left thigh furthest forward, in
# degrees, as measured (09_01, frames 36 to 118; thigh and arm: back positive; bends: from straight).
THIGH = [-54.4, -50.1, -43.5, -37.5, -35.8, -29.2, -18.1, -3.4, 8.9, 21.6, 15.1, 6.0, -8.6, -24.1, -45.1, -52.9]
KNEE = [82.6, 57.0, 29.8, 23.1, 37.1, 41.4, 36.5, 25.8, 14.3, 0.0, 29.6, 57.5, 90.2, 110.1, 115.6, 105.4]
ARM = [32.9, 35.8, 32.3, 24.2, 13.6, -5.3, -14.2, -18.8, -19.6, -16.0, -9.6, -0.8, 7.6, 15.7, 21.9, 27.0]
ELBOW = [102.4, 105.1, 106.3, 106.8, 108.8, 109.5, 112.6, 118.1, 122.6, 120.0, 118.7, 113.0, 103.7, 99.0, 97.5, 99.8]
HEIGHT = [18.17, 18.48, 18.40, 18.01, 17.58, 17.37, 17.60, 18.22, 18.68, 18.64, 18.65, 18.37, 17.76, 17.32, 17.32, 17.70]
# A run eased to a trot: how much of each swing is kept round its middle.
STRIDE, KNEES, ARMS, ELBOWS = 0.7, 0.75, 0.85, 0.8
# The body's rise and fall, in the rig's units (he is ~0.75 tall; the run's is ~0.028).
BOB = 0.018


def at(values: list[float], p: float, keep: float = 1.0) -> float:
    """A measured curve at `p` round the stride, its swing round its middle scaled by `keep`."""
    p = (p % 1) * len(values)
    i, k = int(p) % len(values), p - int(p)
    v = values[i] + (values[(i + 1) % len(values)] - values[i]) * k
    middle = (max(values) + min(values)) / 2
    return middle + (v - middle) * keep


def bend(values: list[float], p: float, keep: float) -> float:
    """A bend kept from straight: scaled as a whole."""
    return at(values, p) * keep


def foot(thigh: float, knee: float, p: float) -> float:
    """The foot kept near flat to the ground while on it, its toe dropping as it leaves."""
    # Toe down most as the thigh is furthest back (pushing off), level while it is forward.
    push = max(0.0, math.sin(2 * math.pi * (p - 0.3)))
    return 22 * push - thigh - knee


hmid = (max(HEIGHT) + min(HEIGHT)) / 2
hhalf = (max(HEIGHT) - min(HEIGHT)) / 2
for frame in range(LENGTH + 1):
    t = frame / LENGTH
    lt, rt = at(THIGH, t, STRIDE), at(THIGH, t + 0.5, STRIDE)
    lk, rk = bend(KNEE, t, KNEES), bend(KNEE, t + 0.5, KNEES)
    la, ra = at(ARM, t, ARMS), at(ARM, t + 0.5, ARMS)
    le, re = bend(ELBOW, t, ELBOWS), bend(ELBOW, t + 0.5, ELBOWS)
    a = 2 * math.pi * t
    lifted = math.sin(a + math.pi)   # the leg in the air: the hips drop toward it
    rig.key(act, frame, {
        'Hip': [('move', (0, 0, BOB * (at(HEIGHT, t) - hmid) / hhalf)), turn('z', 6 * math.sin(a)), turn('x', 3 * lifted)],
        'L_Thigh': [turn('x', -INWARD - 2 * lifted), turn('y', lt)], 'L_Calf': turn('y', lk), 'L_Foot': turn('y', foot(lt, lk, t)),
        'R_Thigh': [turn('x', INWARD - 2 * lifted), turn('y', rt)], 'R_Calf': turn('y', rk), 'R_Foot': turn('y', foot(rt, rk, t + 0.5)),
        # Leaning into it; the chest turns against the hips.
        'Spine01': [turn('y', 7), turn('z', -9 * math.sin(a)), turn('x', -2 * lifted)],
        'Head': [turn('z', 5 * math.sin(a)), turn('y', -4)],
        # The arms hang from the shoulder and swing as measured; the forearm folds up from them.
        'L_Upperarm': [ahead(0.0, 0.12, -1), turn('y', la)],
        'L_Forearm': [ahead(0.0, 0.12, -1), turn('y', la - le)],
        'R_Upperarm': [ahead(0.0, -0.12, -1), turn('y', ra)],
        'R_Forearm': [ahead(0.0, -0.12, -1), turn('y', ra - re)],
        'L_Hand': turn('y', -10), 'R_Hand': turn('y', -10),
    })

rig.export(args[1])
