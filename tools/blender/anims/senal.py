"""Roca calling his battery down on her, keyed by hand (no capture had it): standing, he raises his
sabre straight at the sky, holds it there a moment, then cuts it down to point at her, the signal to
fire, and holds it pointed before he lowers it. His revolver stays at his side in his left hand.

    Blender -b --python tools/blender/anims/senal.py -- RIG.glb OUT.glb

Said in the rig's own axes (keyframes.py): +X forward, +Y his left, +Z up.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import Rig, ahead, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre',))
act = rig.action('senal')

# His left arm down at his side, the revolver held low; his legs a little apart, as he stands.
STAND = {
    'L_Upperarm': ahead(0.05, 0.2, -1), 'L_Forearm': ahead(0.45, 0.1, -1),
    'L_Thigh': ahead(0, 0.08, -1), 'R_Thigh': ahead(0, -0.08, -1),
}
# Sabre low by his side, its point down before him.
LOW = {**STAND, 'R_Upperarm': ahead(0.1, -0.2, -1), 'R_Forearm': ahead(0.5, -0.1, -1), 'sabre': ahead(1, 0, -0.7)}
# Raised straight at the sky, his chest thrown back a little, his head up.
UP = {**STAND, 'Spine01': turn('y', -5), 'Head': turn('y', -10),
      'R_Upperarm': ahead(0.15, -0.3, 1), 'R_Forearm': ahead(0.05, -0.1, 1), 'sabre': ahead(0.05, 0, 1)}
# Shaking it at the sky as he roars.
UP_SHAKE = {**UP, 'R_Forearm': ahead(0.15, -0.15, 1), 'sabre': ahead(0.2, -0.05, 1)}
# Cut down to point at her, leaning into it.
POINT = {**STAND, 'Spine01': turn('y', 8), 'Head': turn('y', 4),
         'R_Upperarm': ahead(1, -0.25, 0.05), 'R_Forearm': ahead(1, -0.05, 0), 'sabre': ahead(1, 0, -0.05)}

for frame, pose in [(0, LOW), (8, UP), (14, UP_SHAKE), (20, UP), (26, POINT), (38, POINT), (48, LOW)]:
    rig.key(act, frame, pose)

rig.export(args[1])
