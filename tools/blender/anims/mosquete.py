"""Cabral's musket: drawn from his back to the shoulder, held aiming, and fired, then slung again.
Three clips, timed as the game times them (src/machi/data.ts: SHOULDER_TIME, SHOT_TIME):

    mosquete_sacar     0.25 s  his right hand goes up behind his shoulder, takes it, brings it round
    mosquete_apuntar   held    a marksman's stance: left foot forward, body side on, left hand
                               under the barrel, right at the wrist of the stock, cheek to it
    mosquete_disparo   0.45 s  the kick, then the musket lowered and slung on his back again

    Blender -b --python tools/blender/anims/mosquete.py -- RIG.glb OUT.glb

Hands are placed by IK on the line of the shot; positions in the rig's units (+X forward, +Y his
left, +Z up; he is ~0.75 tall, his right shoulder near (0.05, -0.09, 0.69)).
"""
import math
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from keyframes import CABRAL, Rig, ahead, plant, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0], carries=('sabre', 'musket'), written_for=CABRAL)

LEFT_FOOT, RIGHT_FOOT = (0.1, 0.085, 0.008), (-0.03, -0.09, 0.008)
STAND_L, STAND_R = (0.05, 0.085, 0.008), (0.03, -0.08, 0.008)
FLAT_L, FLAT_R = ahead(1, 0.25, -0.03), ahead(1, -0.25, -0.03)

# The line of the shot: from the butt, in the pocket of his right shoulder, straight ahead.
# (At chest height first, it read as held at the hip: raised to the shoulder, cheek on the stock.)
SHOULDER = (0.07, -0.075, 0.7)
RIGHT_HAND = (0.15, -0.07, 0.675)     # at the wrist of the stock
LEFT_HAND = (0.3, -0.055, 0.68)       # under the barrel, toward the fore-end

AIM = {
    'Hip': [('move', (0, 0, -0.012)), turn('z', -28)],
    'L_Thigh': plant(*LEFT_FOOT, knee=(1, 0.3, 0)), 'R_Thigh': plant(*RIGHT_FOOT, knee=(1, -0.3, 0)),
    'L_Foot': FLAT_L, 'R_Foot': FLAT_R,
    # Side on: the chest turned further than the hips, leaning a touch into the gun.
    'Spine01': [turn('z', -22), turn('y', 6)],
    'Head': [turn('z', 40), turn('y', 12), turn('x', 8)],
    'R_Upperarm': plant(*RIGHT_HAND, knee=(-0.2, -1, -0.4)),
    'L_Upperarm': plant(*LEFT_HAND, knee=(0.2, 0.4, -1)),
}
# His hands at his sides, the musket still on his back: the at-ease the draw starts from.
EASE = {
    'L_Thigh': plant(*STAND_L), 'R_Thigh': plant(*STAND_R), 'L_Foot': FLAT_L, 'R_Foot': FLAT_R,
    'R_Upperarm': ahead(0.06, -0.2, -1), 'R_Forearm': ahead(0.3, -0.1, -1),
    'L_Upperarm': ahead(0.18, 0.22, -1), 'L_Forearm': ahead(0.4, 0.04, -1),
}
# Reaching up behind the right shoulder for the musket.
REACH = {
    **EASE,
    'Spine01': turn('z', 12),
    'R_Upperarm': plant(-0.03, -0.13, 0.75, knee=(0.3, -1, 0.5)),
    'L_Upperarm': ahead(0.3, 0.3, -1), 'L_Forearm': ahead(0.6, 0.2, -0.6),
}
# Coming round to the front, the left hand rising to meet it.
ROUND = {
    **AIM,
    'Spine01': [turn('z', -10), turn('y', 3)],
    'Head': turn('z', 15),
    'R_Upperarm': plant(0.1, -0.12, 0.68, knee=(0, -1, -0.5)),
    'L_Upperarm': plant(0.22, 0.0, 0.63, knee=(0.2, 0.5, -1)),
}
# The kick: shoulder and muzzle thrown back and up, the head off the stock.
KICK = {
    **AIM,
    'Spine01': [turn('z', -24), turn('y', -4)],
    'Head': [turn('z', 36), turn('y', 2)],
    'R_Upperarm': plant(0.12, -0.075, 0.7, knee=(-0.2, -1, -0.4)),
    'L_Upperarm': plant(0.27, -0.06, 0.72, knee=(0.2, 0.4, -1)),
}

draw = rig.action('mosquete_sacar')
for frame, pose in [(0, EASE), (2, REACH), (4, ROUND), (6, AIM)]:
    rig.key(draw, frame, pose)

hold = rig.action('mosquete_apuntar')
for frame in range(0, 49, 6):
    # Steady, breathing a little.
    breath = math.sin(frame / 48 * 2 * math.pi)
    rig.key(hold, frame, {**AIM, 'Spine01': [turn('z', -22), turn('y', 6 + 0.8 * breath)]})

fire = rig.action('mosquete_disparo')
for frame, pose in [(0, AIM), (1, KICK), (3, AIM), (5, ROUND), (8, REACH), (11, EASE)]:
    rig.key(fire, frame, pose)

rig.export(args[1])
