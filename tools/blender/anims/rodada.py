"""Cabral's dash: he dives forward, rolls right over, tucked, and comes up crouching. Half a second,
as the game's dash lasts, played in place: the game carries him forward.

    Blender -b --python tools/blender/anims/rodada.py -- RIG.glb OUT.glb

The body turns once forward about the hips (a positive turn about 'y' leans an upright bone
forward), keyed every frame so the whole turn is kept; the hips sink near the ground as he rolls
and rise as he comes up. A limb hanging down swings forward on a negative turn about 'y'.
"""
import math
import os
import sys

import bpy

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig, ahead, plant, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre',))
act = rig.action('rodada')

LENGTH = 12
HIP = 0.474          # the hips' height at rest, in the rig's units (he is ~0.75 tall)
LEFT, RIGHT = (0.05, 0.085, 0.008), (0.03, -0.08, 0.008)


def curve(points: list[tuple[float, float]], t: float) -> float:
    """A smooth curve through (moment, value) points, 0 to 1."""
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            k = k * k * (3 - 2 * k)
            return v0 + (v1 - v0) * k
    return points[-1][1]


# Over the half second, from 0 to 1: how far round he has rolled, how high his hips are, and how
# tucked he is (0 standing, 1 balled up).
ROLL = [(0, 0), (0.15, 25), (0.25, 70), (0.75, 330), (0.85, 360), (1, 360)]
HEIGHT = [(0, HIP), (0.12, 0.36), (0.25, 0.22), (0.5, 0.15), (0.72, 0.18), (0.85, 0.28), (1, 0.36)]
TUCK = [(0, 0.15), (0.15, 0.45), (0.28, 1), (0.7, 1), (0.85, 0.7), (1, 0.55)]

def rolling_height(roll: float) -> float:
    """How high the hips are while balled up and rolling: low with his side or back to the ground,
    high upside down, his shoulders and the back of his neck on it. (Kept low throughout, his head
    went through the ground.)"""
    return 0.13 + 0.16 * max(0.0, -math.cos(math.radians(roll)))


for frame in range(LENGTH + 1):
    t = frame / LENGTH
    roll, tuck = curve(ROLL, t), curve(TUCK, t)
    # From standing into the roll and out of it again, the height eases between the two.
    rolling = curve([(0, 0), (0.18, 0), (0.28, 1), (0.75, 1), (0.85, 0), (1, 0)], t)
    height = curve(HEIGHT, t) * (1 - rolling) + rolling_height(roll) * rolling
    pose = {
        'Hip': [('move', (0, 0, height - HIP)), turn('y', roll)],
        # Balled up: the back rounded, the head down, the knees to the chest.
        'Spine01': turn('y', 25 * tuck),
        'Spine02': turn('y', 15 * tuck),
        'Head': turn('y', 30 * tuck),
        # The arms in to the body, forearms folded, the sabre held out of the way along him.
        'R_Upperarm': [ahead(0.3, -0.25, -1), turn('y', -35 * tuck)],
        'R_Forearm': [ahead(0.3, -0.25, -1), turn('y', -90 * tuck)],
        'L_Upperarm': [ahead(0.3, 0.25, -1), turn('y', -35 * tuck)],
        'L_Forearm': [ahead(0.3, 0.25, -1), turn('y', -90 * tuck)],
    }
    on_feet = t < 0.12 or t > 0.82
    if on_feet:
        # At the start he pushes off and at the end he comes up: the feet on the ground.
        pose.update({'L_Thigh': plant(*LEFT), 'R_Thigh': plant(*RIGHT),
                     'L_Foot': ahead(1, 0.25, -0.03), 'R_Foot': ahead(1, -0.15, -0.03)})
    else:
        pose.update({
            'L_Thigh': turn('y', -110 * tuck), 'R_Thigh': turn('y', -100 * tuck),
            'L_Calf': turn('y', 125 * tuck), 'R_Calf': turn('y', 120 * tuck),
        })
    # Resting on the ground: the hips raised or lowered so the lowest point of him touches it.
    # Balled up and rolling, knees, elbows and shoulders take turns at the bottom; guessed, they
    # went through it.
    rig.arm.animation_data.action = act
    bpy.context.scene.frame_set(frame)
    lift = height - HIP
    for _ in range(3):
        pose['Hip'][0] = ('move', (0, 0, lift))
        rig.pose(pose)
        low = rig.lowest()
        if abs(low) < 0.002:
            break
        lift -= low
    rig.key(act, frame, pose)

rig.export(args[1])
