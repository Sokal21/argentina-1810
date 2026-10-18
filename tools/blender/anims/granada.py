"""Cabral's grenade: taken from his right hip, drawn back over his shoulder and held there while
he aims, and thrown overhand, then back to standing. Three clips, as the game's phases go
(src/machi/controller.ts: raise, aim, fire), his feet planted throughout, nothing travelling:

    granada_sacar     the shoulder time   his right hand to the hip for it, then up and back
    granada_apuntar   held                drawn back, side on, the left arm pointing where it goes
    granada_lanzar    the shot time       the throw: it leaves his hand at frame 3, he follows
                                          through bent over his left foot, and stands again

    Blender -b --python tools/blender/anims/granada.py -- RIG.glb OUT.glb

Positions in the rig's units, measured on Cabral (+X forward, +Y his left, +Z up; his right
shoulder near (0.05, -0.09, 0.69)); refitted to another body by `written_for`.
"""
import math
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import CABRAL, Rig, ahead, plant, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre', 'grenade'), written_for=CABRAL)

# Left foot forward, the right back, as one throws.
LEFT_FOOT, RIGHT_FOOT = (0.1, 0.08, 0.008), (-0.04, -0.09, 0.008)
STAND_L, STAND_R = (0.05, 0.085, 0.008), (0.03, -0.08, 0.008)
FLAT_L, FLAT_R = ahead(1, 0.25, -0.03), ahead(1, -0.35, -0.03)
STANCE = {
    'L_Thigh': plant(*LEFT_FOOT, knee=(1, 0.3, 0)), 'R_Thigh': plant(*RIGHT_FOOT, knee=(1, -0.3, 0)),
    'L_Foot': FLAT_L, 'R_Foot': FLAT_R,
}

EASE = {
    'L_Thigh': plant(*STAND_L), 'R_Thigh': plant(*STAND_R), 'L_Foot': FLAT_L, 'R_Foot': FLAT_R,
    'R_Upperarm': ahead(0.06, -0.2, -1), 'R_Forearm': ahead(0.3, -0.1, -1),
    'L_Upperarm': ahead(0.18, 0.22, -1), 'L_Forearm': ahead(0.4, 0.04, -1),
}
# Taking it: the right hand back at his hip, the body turned a little toward it.
TAKE = {
    **EASE,
    'Spine01': [turn('z', -10), turn('y', 4)],
    'R_Upperarm': plant(-0.01, -0.13, 0.46, knee=(-0.3, -1, 0)),
}
# Drawn back: hips and chest turned away to his right and leaning back, the right hand behind his
# head and high, the left arm reaching out before him toward where it will go.
WIND = {
    'Hip': [('move', (-0.01, 0, -0.014)), turn('z', -30)],
    **STANCE,
    'Spine01': [turn('z', -25), turn('y', -8)],
    'Head': [turn('z', 45), turn('y', 4)],
    'R_Upperarm': plant(-0.12, -0.14, 0.84, knee=(-0.2, -1, -0.4)),
    'L_Upperarm': ahead(1, 0.35, 0.25), 'L_Forearm': ahead(1, 0.1, 0.2),
}
# It goes: the body whipped round to face it and leaning in, the right hand high before him.
LOOSE = {
    'Hip': [('move', (0.02, 0, -0.016)), turn('z', 10)],
    **STANCE,
    'Spine01': [turn('z', 22), turn('y', 14)],
    'Head': [turn('z', -20), turn('y', -6)],
    'R_Upperarm': plant(0.2, -0.05, 0.8, knee=(0, -1, 0.3)),
    'L_Upperarm': ahead(0.1, 0.6, -1), 'L_Forearm': ahead(-0.4, 0.3, -1),
}
# Followed through: bent over the left foot, the right hand come down across to his left knee.
FOLLOW = {
    'Hip': [('move', (0.035, 0, -0.03)), turn('z', 22)],
    **STANCE,
    'Spine01': [turn('z', 22), turn('y', 26)],
    'Head': [turn('z', -24), turn('y', -16)],
    'R_Upperarm': plant(0.16, 0.06, 0.4, knee=(0.3, -1, 0)),
    'L_Upperarm': ahead(-0.3, 0.5, -1), 'L_Forearm': ahead(-0.2, 0.3, -1),
}
# Coming up out of it, the feet still apart.
RISE = {
    'Hip': [('move', (0.01, 0, -0.01)), turn('z', 6)],
    **STANCE,
    'Spine01': [turn('z', 6), turn('y', 6)],
    'R_Upperarm': ahead(0.2, -0.2, -1), 'R_Forearm': ahead(0.5, -0.1, -1),
    'L_Upperarm': ahead(0.1, 0.25, -1), 'L_Forearm': ahead(0.4, 0.05, -1),
}

take = rig.action('granada_sacar')
for frame, pose in [(0, EASE), (4, TAKE), (11, WIND)]:
    rig.key(take, frame, pose)

hold = rig.action('granada_apuntar')
for frame in range(0, 49, 6):
    # Held back, breathing a little, the hand rocking with it.
    breath = math.sin(frame / 48 * 2 * math.pi)
    rig.key(hold, frame, {**WIND, 'Spine01': [turn('z', -25), turn('y', -8 + 1.5 * breath)]})

throw = rig.action('granada_lanzar')
for frame, pose in [(0, WIND), (3, LOOSE), (7, FOLLOW), (12, RISE), (19, EASE)]:
    rig.key(throw, frame, pose)

rig.export(args[1])
