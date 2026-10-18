"""Cabral's sabre cut: rising, from low on his left, by the scabbard, across before him and up to
his right, as he lunges onto his right foot, and back to guard. The blade turns as the hand goes,
as the user drew it: point down by the hip at the start, point forward at the enemy all through
the sweep, and laid back over the right shoulder toward his back at the end. Half a second, as the game's
swing lasts, the blow landing at 0.26 s: frame 6 of 12.

    Blender -b --python tools/blender/anims/tajo.py -- RIG.glb OUT.glb

A limb hanging down swings forward on a negative turn about 'y'; 'z' turns toward his left.
"""
import math
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
    # The blade hangs point down by his left hip.
    'sabre': ahead(0.1, 0.25, -1),
    # The left arm forward, the elbow bent, the hand before his belly, to swing back from.
    'L_Upperarm': ahead(0.5, 0.15, -0.8), 'L_Forearm': ahead(0.6, -0.45, -0.15),
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
    # The point still forward, at the enemy, as the hand rises across.
    'sabre': ahead(0.85, -0.25, 0.35),
    # The left arm swung back and out against the cut, the elbow bent, the hand by the hip:
    # held straight out and far back, it read as stiff and behind him.
    'L_Clavicle': turn('z', 5),
    'L_Upperarm': ahead(-0.45, 0.6, -0.65), 'L_Forearm': ahead(-0.15, 0.6, -0.15),
}
# Following through: up past his right shoulder, the body rising and turned round after it.
FOLLOW = {
    **CUT,
    'Hip': [('move', (0.05, 0, -0.025)), turn('z', -16)],
    'Spine01': [turn('z', -28), turn('y', 2)],
    'R_Upperarm': ahead(0.3, -0.6, 0.7),
    'R_Forearm': ahead(0.0, -0.4, 0.9),
    # Ended high on his right, the blade laid back over his shoulder toward his back.
    'sabre': ahead(-0.85, -0.3, 0.4),
    'L_Upperarm': ahead(-0.4, 0.6, -0.7), 'L_Forearm': ahead(-0.05, 0.6, -0.3),
}
# The right foot off the ground on its way forward, the body already going.
STEP = {**WIND, 'Hip': [('move', (0.025, 0, -0.03)), turn('z', 4)], **feet(RIGHT_LIFTED),
        'Spine01': [turn('z', 8), turn('y', 12)],
        # The forearm across before him toward his left, so the point can be forward: a blade held in
        # the fist cannot lie along the forearm.
        'R_Upperarm': ahead(0.7, 0.2, -0.5), 'R_Forearm': ahead(0.45, 0.65, -0.35), 'sabre': ahead(1, 0.05, -0.1)}
# Pulling the right foot back to guard.
BACK = {**GUARD, 'Hip': [('move', (0.02, 0, -0.02))], **feet(RIGHT_LIFTED)}

# The right arm goes only this share of the way from guard to each pose: the full swing read as
# too violent. The blade is aimed as written: its point draws the cut (see the docstring).
SWING = 0.8


def calmer(pose: dict) -> dict:
    out = dict(pose)
    for bone in ('R_Upperarm', 'R_Forearm'):
        if bone in pose and bone in GUARD:
            g, p = GUARD[bone][1], pose[bone][1]
            out[bone] = ('ahead', (g + (p - g) * SWING).normalized())
    return out


def blend(a: dict, b: dict, k: float) -> dict:
    """A pose a share `k` of the way from one to another: each named move eased between."""
    def mix(x, y):
        if x[0] != y[0]:
            return y if k > 0.5 else x
        if x[0] == 'ahead':
            return ('ahead', x[1].lerp(y[1], k).normalized())
        if x[0] == 'turn':
            return ('turn', x[1].slerp(y[1], k))
        if x[0] == 'move':
            return ('move', tuple(p + (q - p) * k for p, q in zip(x[1], y[1])))
        if x[0] == 'plant':
            return ('plant', x[1].lerp(y[1], k), x[2].lerp(y[2], k).normalized())
        return y
    out = {}
    for name in set(a) | set(b):
        if name not in a or name not in b:
            out[name] = a.get(name, b.get(name))
            continue
        x, y = a[name], b[name]
        if isinstance(x, list) or isinstance(y, list):
            x, y = (x if isinstance(x, list) else [x]), (y if isinstance(y, list) else [y])
            out[name] = [mix(p, q) for p, q in zip(x, y)] if len(x) == len(y) else (y if k > 0.5 else x)
        else:
            out[name] = mix(x, y)
    return out


# The sweep is keyed every frame from one path, so that the blade draws a curve
# instead of wandering between a few keys: the hand along a smooth arc from low on his left out
# before him and up to his right (the arm reaching it by IK, the elbow out to his right), and the
# blade turning steadily from point down, through point forward, to laid back over his shoulder.
from mathutils import Quaternion, Vector  # noqa: E402

# Seen from the front the hand goes along the diagonal at an even pace, from low on his left to
# high on his right; it reaches forward only in depth, most at the middle. (With the forward reach
# as a curve's pull, seen from the front the hand hung low and then leapt up.)
HAND = [Vector((0.15, 0.13, 0.47)), Vector((0.12, -0.21, 0.76))]  # start, end
# At the start the elbow is low and the forearm lies across his belly, as drawing from the left
# hip: only so can the blade hang point down by his left leg (a blade cannot lie along the
# forearm, and with the forearm pointing down it was pushed across to his right). At the end the
# elbow is out to his right.
ELBOWS = [Vector((0.35, -0.3, -1)).normalized(), Vector((0.0, -1.0, -0.6)).normalized()]
REACH = 0.16
# Point forward in the middle, but tipped a little up and to his right: pointing straight at the
# camera, a blade is a dot and seems to jump.
BLADE = [Vector((0.1, 0.25, -1)).normalized(), Vector((1, -0.25, 0.2)).normalized(), Vector((-0.85, -0.3, 0.4)).normalized()]
ELBOW = (0.0, -1.0, -0.6)
# The sweep takes frames 3 to 9, half the cut, the blow landing in its middle at frame 6 as the
# game's does (0.26 s of 0.5): swept in four frames, the blade turned 90° a frame and seemed to
# jump from place to place.
SWEEP = (3, 9)
KEYS = [(0, GUARD), (1.5, LIFT), (3, WIND), (4.5, STEP), (6, CUT), (9, FOLLOW), (10.5, BACK), (12, GUARD)]


def body(frame: float) -> dict:
    for (f0, p0), (f1, p1) in zip(KEYS, KEYS[1:]):
        if f0 <= frame <= f1:
            return blend(calmer(p0), calmer(p1), (frame - f0) / (f1 - f0))
    return calmer(KEYS[-1][1])


def hips_forward(pose: dict) -> float:
    return next((m[1][0] for m in pose['Hip'] if m[0] == 'move'), 0.0)


def sweep(frame: int) -> dict:
    t = (frame - SWEEP[0]) / (SWEEP[1] - SWEEP[0])   # 0 at the start of the sweep, 1 at its end
    pose = body(frame)
    a, b = HAND
    hand = a.lerp(b, t) + Vector((REACH * math.sin(math.pi * t), 0, 0))
    hand.x += hips_forward(pose)             # the arc goes with the body as it lunges
    half = min(1.0, t * 2)
    way = BLADE[0].slerp(BLADE[1], half) if t < 0.5 else BLADE[1].slerp(BLADE[2], (t - 0.5) * 2)
    pose.pop('R_Forearm', None)
    pose['R_Upperarm'] = plant(*hand, knee=tuple(ELBOWS[0].slerp(ELBOWS[1], t)))
    pose['sabre'] = ('ahead', way)
    return pose


for frame in range(13):
    pose = sweep(frame) if SWEEP[0] <= frame <= SWEEP[1] else body(frame)
    rig.key(act, frame, pose)

rig.export(args[1])
