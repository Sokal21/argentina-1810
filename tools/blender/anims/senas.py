"""Roca's spotter signalling to the battery where to fire, keyed by hand (no capture had it): a red
flag in his right hand and a white in his left, flung up in a V over his head, then the red cut down
to point before him (there: fire), the white held high; again, and down.

    Blender -b --python tools/blender/anims/senas.py -- RIG.glb OUT.glb

Said in the rig's own axes (keyframes.py): +X forward, +Y his left, +Z up. The flags are props.py's
signal_flag, built with `--carries signal_flag@R_Hand@roja,signal_flag@L_Hand@blanca`.
Its legs, keyed here, stand stiff: the game's clip is this one's upper body over his breathing
idle's hips and legs (tools/blender/upper_from.py), as tools/mocap/README.md says.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig, ahead, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])
rig.held = {'roja': props.signal_flag(rig.arm, 'R_Hand', 'roja'), 'blanca': props.signal_flag(rig.arm, 'L_Hand', 'blanca')}
act = rig.action('senas')

LEGS = {'L_Thigh': ahead(0.05, 0.1, -1), 'R_Thigh': ahead(-0.05, -0.1, -1)}
# Flags low before him.
LOW = {**LEGS, 'R_Upperarm': ahead(0.15, -0.2, -1), 'R_Forearm': ahead(0.6, -0.1, -1), 'roja': ahead(1, 0, -0.6),
       'L_Upperarm': ahead(0.15, 0.2, -1), 'L_Forearm': ahead(0.6, 0.1, -1), 'blanca': ahead(1, 0, -0.6)}
# Both flung up in a V over his head, his chest thrown back a little.
V = {**LEGS, 'Spine01': turn('y', -4),
     'R_Upperarm': ahead(0.1, -0.6, 1), 'R_Forearm': ahead(0.1, -0.5, 1), 'roja': ahead(0.1, -0.5, 1),
     'L_Upperarm': ahead(0.1, 0.6, 1), 'L_Forearm': ahead(0.1, 0.5, 1), 'blanca': ahead(0.1, 0.5, 1)}
# The red cut down to point straight before him, the white held up: there, fire.
POINT = {**LEGS, 'Spine01': turn('y', 6),
         'R_Upperarm': ahead(1, -0.2, 0), 'R_Forearm': ahead(1, -0.05, -0.05), 'roja': ahead(1, 0, -0.1),
         'L_Upperarm': ahead(0.1, 0.5, 1), 'L_Forearm': ahead(0.1, 0.4, 1), 'blanca': ahead(0.1, 0.4, 1)}

for frame, pose in [(0, LOW), (6, V), (11, V), (15, POINT), (21, POINT), (26, V), (30, POINT), (38, POINT), (46, LOW)]:
    rig.key(act, frame, pose)

rig.export(args[1])
