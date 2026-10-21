"""Cabral's roar, as his rage begins: he gathers himself a moment, then throws his chest out and his
head back with his sabre raised high, point to the sky, his left fist clenched low at his side, and
shakes with it; then eases toward guard. The game plays it over the rage's roar (0.7 s), his feet
planted throughout.

    Blender -b --python tools/blender/anims/grito.py -- RIG.glb OUT.glb

A limb hanging down swings forward on a negative turn about 'y'; 'z' turns toward his left.
"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import CABRAL, Rig, ahead, plant, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre',), written_for=CABRAL)
act = rig.action('grito')

# Where the feet stand, in the rig's units (he is ~0.75 tall): planted a little wide, braced.
LEFT, RIGHT = (0.03, 0.1, 0.008), (-0.02, -0.1, 0.008)
FLAT_L, FLAT_R = ahead(1, 0.25, -0.03), ahead(1, -0.25, -0.03)


def feet() -> dict:
    return {'L_Thigh': plant(*LEFT, knee=(1, 0.3, 0)), 'L_Foot': FLAT_L, 'R_Thigh': plant(*RIGHT, knee=(1, -0.3, 0)), 'R_Foot': FLAT_R}


# Standing on guard, sabre before him.
GUARD = {
    'Hip': [('move', (0, 0, -0.01))],
    **feet(),
    'Spine01': [turn('y', 4)],
    'R_Upperarm': ahead(0.45, -0.35, -0.8),
    'R_Forearm': ahead(0.9, -0.1, 0.25),
    'sabre': ahead(0.45, -0.1, 0.9),
    'L_Upperarm': ahead(-0.1, 0.3, -1), 'L_Forearm': ahead(0.2, 0.3, -1),
}
# Gathering himself: crouched a little, head down, the sabre brought in low before him.
GATHER = {
    'Hip': [('move', (0, 0, -0.03))],
    **feet(),
    'Spine01': [turn('y', 16)],
    'Head': [turn('y', 18)],
    'R_Upperarm': ahead(0.35, -0.25, -0.9),
    'R_Forearm': ahead(0.8, 0.1, -0.2),
    'sabre': ahead(0.6, 0.2, -0.3),
    'L_Upperarm': ahead(0.1, 0.35, -0.95), 'L_Forearm': ahead(0.5, 0.2, -0.6),
}
# The roar: chest out, head back, the sabre high with its point to the sky, the left fist clenched by his hip
# (held out at the shoulder it read as pointing).
ROAR = {
    'Hip': [('move', (-0.008, 0, -0.016))],
    **feet(),
    'Spine01': [turn('y', -14)],
    'Head': [turn('y', -20)],
    'R_Upperarm': ahead(0.25, -0.4, 1),
    'R_Forearm': ahead(0.15, -0.15, 1),
    'sabre': ahead(0.2, -0.05, 1),
    'L_Upperarm': ahead(-0.05, 0.45, -0.9), 'L_Forearm': ahead(0.25, 0.35, -0.9),
}


def shaking(by: float) -> dict:
    """The roar, shaken: his head and his raised arm a little one way or the other."""
    return {**ROAR, 'Head': [turn('y', -20), turn('x', by)], 'Spine01': [turn('y', -14), turn('x', by * 0.4)],
            'R_Upperarm': ahead(0.25 + by * 0.01, -0.4, 1)}


for frame, pose in [(0, GUARD), (3, GATHER), (6, ROAR), (8, shaking(5)), (10, shaking(-5)), (12, shaking(4)), (14, ROAR), (17, GUARD)]:
    rig.key(act, frame, pose)

rig.export(args[1])
