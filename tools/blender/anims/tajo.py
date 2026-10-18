"""Cabral's sabre cut: rising, from low on his left, by the scabbard, across before him and up to
his right, as he lunges onto his right foot, and back to guard. Half a second, as the game's
swing lasts, the blow landing at 0.26 s: frame 6 of 12.

    Blender -b --python tools/blender/anims/tajo.py -- RIG.glb OUT.glb

A limb hanging down swings forward on a negative turn about 'y'; 'z' turns toward his left.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig, ahead, plant, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre',))
act = rig.action('tajo')

# Where the feet stand, in the rig's units (he is ~0.75 tall): the left stays planted the whole
# cut; the right is a little back on guard and steps well forward into the lunge.
LEFT = (0.05, 0.085, 0.008)
RIGHT_BACK = (0.0, -0.08, 0.008)
RIGHT_STEP = (0.18, -0.07, 0.008)
RIGHT_LIFTED = (0.1, -0.075, 0.045)
FLAT_L, FLAT_R = ahead(1, 0.25, -0.03), ahead(1, -0.15, -0.03)
OUT_L, OUT_R = (1, 0.25, 0), (1, -0.25, 0)


def feet(right: tuple) -> dict:
    return {'L_Thigh': plant(*LEFT, knee=OUT_L), 'L_Foot': FLAT_L, 'R_Thigh': plant(*right, knee=OUT_R), 'R_Foot': FLAT_R}


# On guard: sabre held before him, point up and forward, left arm back by the hip, knees soft.
GUARD = {
    'Hip': [('move', (0, 0, -0.012))],
    **feet(RIGHT_BACK),
    'Spine01': [turn('z', -8), turn('y', 5)],
    'R_Upperarm': ahead(0.45, -0.35, -0.8),
    'R_Forearm': ahead(0.9, -0.1, 0.25),
    'sabre': ahead(0.45, -0.1, 0.9),
    'L_Upperarm': ahead(-0.15, 0.3, -1), 'L_Forearm': ahead(0.2, 0.3, -1),
}
# Gathering: the sabre brought down across before him toward his left hip.
LIFT = {
    **GUARD,
    'Hip': [('move', (-0.005, 0, -0.016)), turn('z', 6)],
    'Spine01': [turn('z', 12), turn('y', 6)],
    'R_Upperarm': ahead(0.5, 0.3, -0.5),
    'R_Forearm': ahead(0.4, 0.6, -0.4),
    'sabre': ahead(0.05, 0.5, -0.7),
}
# Wound up: crouched and turned to his left, the right arm across him and the blade low by his
# left hip, by the scabbard, as if just drawn.
WIND = {
    'Hip': [('move', (-0.015, 0, -0.026)), turn('z', 14)],
    **feet(RIGHT_BACK),
    'Spine01': [turn('z', 28), turn('y', 12)],
    'Head': turn('z', -18),
    'R_Upperarm': ahead(0.35, 0.5, -0.6),
    'R_Forearm': ahead(0.1, 0.7, -0.6),
    'sabre': ahead(-0.5, 0.45, -0.55),
    'L_Upperarm': ahead(-0.2, 0.35, -0.9), 'L_Forearm': ahead(0.1, 0.3, -1),
}
# The cut lands: lunged onto the right foot, the blade rising across before him, at his chest
# and going up to his right as he turns through.
CUT = {
    'Hip': [('move', (0.06, 0, -0.035)), turn('z', -8)],
    **feet(RIGHT_STEP),
    'Spine01': [turn('z', -14), turn('y', 10)],
    'Head': [turn('z', 6), turn('y', -6)],
    'R_Upperarm': ahead(0.8, -0.4, 0.25),
    'R_Forearm': ahead(0.6, -0.6, 0.45),
    'sabre': ahead(0.4, -0.6, 0.7),
    'L_Upperarm': ahead(-0.45, 0.5, -0.7), 'L_Forearm': ahead(-0.3, 0.35, -0.85),
}
# Following through: up past his right shoulder, the body rising and turned round after it.
FOLLOW = {
    **CUT,
    'Hip': [('move', (0.05, 0, -0.025)), turn('z', -16)],
    'Spine01': [turn('z', -28), turn('y', 2)],
    'R_Upperarm': ahead(0.3, -0.6, 0.7),
    'R_Forearm': ahead(0.0, -0.4, 0.9),
    'sabre': ahead(-0.3, -0.4, 0.85),
}
# The right foot off the ground on its way forward, the body already going.
STEP = {**WIND, 'Hip': [('move', (0.025, 0, -0.03)), turn('z', 4)], **feet(RIGHT_LIFTED),
        'Spine01': [turn('z', 8), turn('y', 12)],
        'R_Upperarm': ahead(0.9, 0.1, -0.35), 'R_Forearm': ahead(0.9, 0.0, -0.3), 'sabre': ahead(0.8, -0.1, -0.5)}
# Pulling the right foot back to guard.
BACK = {**GUARD, 'Hip': [('move', (0.02, 0, -0.02))], **feet(RIGHT_LIFTED)}

for frame, pose in [(0, GUARD), (2, LIFT), (4, WIND), (5, STEP), (6, CUT), (8, FOLLOW), (10, BACK), (12, GUARD)]:
    rig.key(act, frame, pose)

rig.export(args[1])
