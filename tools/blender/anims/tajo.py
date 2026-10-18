"""Cabral's sabre cut: wound up over his right shoulder, a diagonal cut down across from his right
to his left as he lunges onto his right foot, and back to guard. Half a second, as the game's
swing lasts, the blow landing at 0.26 s: frame 6 of 12.

    Blender -b --python tools/blender/anims/tajo.py -- RIG.glb OUT.glb

A limb hanging down swings forward on a negative turn about 'y'; 'z' turns toward his left.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig, ahead, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre',))
act = rig.action('tajo')

# On guard: sabre held before him, point up and forward, left arm back by the hip, knees soft.
GUARD = {
    'Hip': [('move', (0, 0, -0.01))],
    'L_Thigh': [turn('y', -8), turn('x', -4)], 'L_Calf': turn('y', 14), 'L_Foot': turn('y', -6),
    'R_Thigh': [turn('y', 6), turn('x', 4)], 'R_Calf': turn('y', 12), 'R_Foot': turn('y', -18),
    'Spine01': [turn('z', -8), turn('y', 5)],
    'R_Upperarm': ahead(0.45, -0.35, -0.8),
    'R_Forearm': ahead(0.9, -0.1, 0.25),
    'sabre': ahead(0.45, -0.1, 0.9),
    'L_Upperarm': ahead(-0.15, 0.3, -1), 'L_Forearm': ahead(0.2, 0.3, -1),
}
# Lifting: the arm comes up by his head, the blade straight up, on its way back.
LIFT = {
    **GUARD,
    'Spine01': [turn('z', -18), turn('y', 1)],
    'R_Upperarm': ahead(0.3, -0.6, 0.3),
    'R_Forearm': ahead(0.05, -0.25, 0.95),
    'sabre': ahead(-0.1, -0.15, 1),
}
# Wound up: turned away to his right, weight back, the sabre back over the right shoulder.
WIND = {
    'Hip': [('move', (-0.01, 0, -0.012)), turn('z', -14)],
    'L_Thigh': [turn('y', -12), turn('x', -4)], 'L_Calf': turn('y', 16), 'L_Foot': turn('y', -4),
    'R_Thigh': [turn('y', 10), turn('x', 4)], 'R_Calf': turn('y', 20), 'R_Foot': turn('y', -24),
    'Spine01': [turn('z', -28), turn('y', -4), turn('x', 4)],
    'Head': turn('z', 18),
    'R_Upperarm': ahead(-0.1, -0.7, 0.55),
    'R_Forearm': ahead(-0.6, -0.1, 0.6),
    'sabre': ahead(-0.6, 0.1, 0.55),
    'L_Upperarm': ahead(0.5, 0.35, -0.6), 'L_Forearm': ahead(0.8, 0.1, -0.2),
}
# The cut lands: lunged forward onto the right foot, turned through to his left, the arm thrown
# out across and down, the blade at the end of it.
CUT = {
    'Hip': [('move', (0.03, 0, -0.03)), turn('z', 16)],
    'R_Thigh': [turn('y', -42), turn('x', 3)], 'R_Calf': turn('y', 40), 'R_Foot': turn('y', 2),
    'L_Thigh': [turn('y', 26), turn('x', -3)], 'L_Calf': turn('y', 18), 'L_Foot': turn('y', -30),
    'Spine01': [turn('z', 30), turn('y', 22), turn('x', -4)],
    'Head': [turn('z', -16), turn('y', -14)],
    'R_Upperarm': ahead(0.85, 0.2, -0.35),
    'R_Forearm': ahead(0.75, 0.55, -0.45),
    'sabre': ahead(0.65, 0.65, -0.3),
    'L_Upperarm': ahead(-0.5, 0.45, -0.7), 'L_Forearm': ahead(-0.4, 0.3, -0.8),
}
# Following through: the blade carried on down past his left knee, the body settling.
FOLLOW = {
    **CUT,
    'Hip': [('move', (0.025, 0, -0.028)), turn('z', 20)],
    'Spine01': [turn('z', 36), turn('y', 24), turn('x', -4)],
    'R_Upperarm': ahead(0.55, 0.45, -0.7),
    'R_Forearm': ahead(0.3, 0.6, -0.8),
    'sabre': ahead(0.15, 0.6, -0.8),
}

for frame, pose in [(0, GUARD), (2, LIFT), (4, WIND), (6, CUT), (8, FOLLOW), (12, GUARD)]:
    rig.key(act, frame, pose)

rig.export(args[1])
