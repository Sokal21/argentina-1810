"""Cabral standing at ease: arms down, his left hand by the sabre's hilt, breathing slowly,
shifting his weight once each way and looking about, as a sentry does. Four seconds, looped.

    Blender -b --python tools/blender/anims/reposo.py -- RIG.glb OUT.glb
"""
import math
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig, ahead, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])
act = rig.action('reposo')

LENGTH = 96   # frames: four seconds at 24
STEP = 8      # a key every this many frames; the loop's last key is its first

for frame in range(0, LENGTH + 1, STEP):
    t = frame / LENGTH                       # 0 to 1 round the loop
    breath = math.sin(t * 2 * math.pi * 2)   # two breaths a loop
    weight = math.sin(t * 2 * math.pi)       # onto one leg and the other, once
    look = math.sin(t * 2 * math.pi) * 0.6 + math.sin(t * 4 * math.pi + 1) * 0.4
    # Weight on his left leg when `weight` is 1, on his right at -1: the free leg's knee bends.
    left_free, right_free = max(0, -weight), max(0, weight)
    sway = math.sin(t * 2 * math.pi + 0.6)  # the arms follow the body a little late
    rig.key(act, frame, {
        # The hips tip toward the leg he stands on; the thighs undo it, so the feet stay put.
        'Hip': turn('x', -4.5 * weight),
        'L_Thigh': [turn('x', 4.5 * weight), turn('y', 7 * left_free)],
        'L_Calf': turn('y', -14 * left_free),
        'R_Thigh': [turn('x', 4.5 * weight), turn('y', 7 * right_free)],
        'R_Calf': turn('y', -14 * right_free),
        # The chest leans back the other way, and rises as he breathes.
        'Spine01': turn('x', 5 * weight),
        'Spine02': turn('y', -3 * breath),
        'L_Clavicle': turn('x', 3 * breath),
        'R_Clavicle': turn('x', -3 * breath),
        # He looks about, mostly to either side, and his head tips as it turns.
        'Head': [turn('z', 18 * look), turn('x', -3 * look), turn('y', 2 * breath)],
        # Arms down from the A-pose: the left hand by the hilt at his left hip, moving with it; the
        # right hangs loose and swings as he shifts, the elbow giving with it.
        'L_Upperarm': [ahead(0.18, 0.22, -1), turn('y', -4 * sway)],
        'L_Forearm': [ahead(0.4, 0.04, -1), turn('y', -6 * sway)],
        'R_Upperarm': [ahead(0.06, -0.2, -1), turn('y', -9 * sway), turn('x', 3 * weight)],
        'R_Forearm': [ahead(0.3, -0.1, -1), turn('y', -12 * sway - 6 * breath)],
    })

rig.export(args[1])
