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
    rig.key(act, frame, {
        # The weight onto one leg: the hips tip a little, the chest leans back the other way.
        'Hip': turn('x', 1.2 * weight),
        'Spine01': turn('x', -1.6 * weight),
        # Breathing: the chest rises and the shoulders with it.
        'Spine02': turn('y', -1.2 * breath),
        'L_Clavicle': turn('x', 1.0 * breath),
        'R_Clavicle': turn('x', -1.0 * breath),
        # He looks about, slowly, mostly to either side.
        'Head': [turn('z', 9 * look), turn('y', 0.8 * breath)],
        # Arms down from the A-pose. The left hand rests forward, by the hilt at his left hip;
        # the right hangs loose, a little forward, swaying as he shifts.
        'L_Upperarm': ahead(0.18, 0.22, -1),
        'L_Forearm': ahead(0.4, 0.04, -1),
        'L_Hand': ahead(0.3, -0.08, -1),
        'R_Upperarm': ahead(0.06 + 0.02 * weight, -0.2, -1),
        'R_Forearm': ahead(0.3, -0.1, -1),
        'R_Hand': ahead(0.25, -0.05, -1),
    })

rig.export(args[1])
