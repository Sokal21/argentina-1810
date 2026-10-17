"""Cabral's trot: two strides a loop, played in place; the game sets its pace to his speed.

    Blender -b --python tools/blender/anims/trote.py -- RIG.glb OUT.glb

A limb hanging down swings forward on a negative turn about 'y' and back on a positive one.
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
STEP = 2

SWING = 28    # how far a thigh goes forward and back
KNEE = 62     # how far the knee bends as the leg comes through
BOB = 0.014   # how far the body drops onto each foot, in the rig's units (he is ~0.75 tall)
ARMS = 34


def leg(phase: float) -> tuple[float, float, float]:
    """Thigh, knee and foot turns for a leg `phase` round its stride (0: furthest back... 0.25 passing)."""
    a = 2 * math.pi * phase
    thigh = -SWING * math.sin(a)                 # forward is negative
    coming = max(0.0, math.cos(a))               # the leg coming through: thigh moving forward
    knee = 6 + KNEE * coming ** 1.5              # bends back as it comes through
    foot = -0.5 * knee + 0.3 * thigh             # the foot kept roughly flat to the ground
    return thigh, knee, foot


for frame in range(0, LENGTH + 1, STEP):
    t = frame / LENGTH
    lt, lk, lf = leg(t)
    rt, rk, rf = leg(t + 0.5)
    a = 2 * math.pi * t
    rig.key(act, frame, {
        # Down onto each foot as the legs are furthest apart, up as they pass; the hips turn with
        # the leg going forward.
        'Hip': [('move', (0, 0, -BOB * abs(math.sin(a)))), turn('z', 6 * math.sin(a))],
        'L_Thigh': turn('y', lt), 'L_Calf': turn('y', lk), 'L_Foot': turn('y', lf),
        'R_Thigh': turn('y', rt), 'R_Calf': turn('y', rk), 'R_Foot': turn('y', rf),
        # Leaning a little into it, the chest turning against the hips.
        'Spine01': [turn('y', 7), turn('z', -9 * math.sin(a))],
        'Head': [turn('z', 5 * math.sin(a)), turn('y', -4)],
        # Each arm swings against the leg on its side, the elbows bent; the left, by the sabre, less.
        'L_Upperarm': [ahead(0.05, 0.2, -1), turn('y', ARMS * 0.6 * math.sin(a))],
        'L_Forearm': [ahead(0.05, 0.2, -1), turn('y', -28 + 10 * math.sin(a))],
        'R_Upperarm': [ahead(0.05, -0.2, -1), turn('y', -ARMS * math.sin(a))],
        'R_Forearm': [ahead(0.05, -0.2, -1), turn('y', -30 - 18 * math.sin(a))],
    })

rig.export(args[1])
