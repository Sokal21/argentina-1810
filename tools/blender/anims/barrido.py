"""The sergeant's halberd sweep: from standing, the halberd taken in both hands, his right sliding
down to near its butt, and swung back over his right shoulder as he turns away and sinks onto his
back foot; then round before him, right to left at the height of his chest, as he steps onto his
left foot, its head straight ahead at the blow; on round to his left, low, and back to standing.
0.9 s, as the game's blow lasts, the blow landing at 0.55 s: frame 13 of 22 (src/tropa/brain.ts,
the sergeant's `blow`).

    Blender -b --python tools/blender/anims/barrido.py -- RIG.glb REPOSO.glb OUT.glb

REPOSO is his standing clip: the halberd is set in his fist as he stands in it, as the game's model
has it (props.halberd_in_hands), so that turning his hand points it here as it will point there.

Written in his own rig's units (he stands 1.0 tall; +X ahead, +Y his left, +Z up). The halberd's
way is keyed every frame, its head drawing a curve. His right hand goes along a path of its own,
said before his chest and turning with it, so that it never crosses through him; his left takes
the shaft above the right, wherever the shaft is found to be in each frame, and lets it go, out to
his side, where it is beyond his reach (his arms are short).
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig, plant, turn  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig = Rig(args[0])
# His standing, brought in only to set the halberd in his hand as the game's model has it.
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=args[1])
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)
standing = next(a for a in bpy.data.actions if a.name.startswith('reposo'))
standing.name = 'reposo_mixamo'
pole = props.halberd_in_hands(rig.arm)
rig.held = {'halberd': pole}
bpy.data.actions.remove(standing)
act = rig.action('barrido')
# A pole is guided by both hands, not held at the end of the wrist as a sabre is: it may stand at
# any angle to the forearm (standing about, it rises straight up from the hanging hand).
rig.GRIP = (0.0, math.pi)

FRAMES, BLOW = 22, 13
# How far up the shaft from the right hand the left takes it; how far the left can reach from its
# shoulder to the shaft (its arm and its fist), and over how much further it lets go.
APART, REACH, SLACK = 0.15, 0.345, 0.04
# Where the left hand goes when it has let go: out to his side, a little back (before his chest).
FREE = Vector((-0.02, 0.21, 0.55))
HIPS = Vector((0.032, 0.009, 0))

# The feet: the right stays where it stands; the left steps ahead into the blow and back.
RIGHT = (-0.017, -0.074, 0.018)
LEFT, LEFT_STEP, LEFT_UP = (-0.012, 0.085, 0.014), (0.11, 0.1, 0.014), (0.05, 0.095, 0.05)


def way(azimuth: float, elevation: float) -> Vector:
    """A direction by its bearing (0 ahead, positive toward his left) and its rise, in degrees."""
    a, e = math.radians(azimuth), math.radians(elevation)
    return Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))


# The keys: frame; the halberd's bearing and rise (as the world has them); the right hand before
# his chest (as his chest has it); the hips' shift and turn, the spine's turn and lean, the head's
# turn back; where the left foot is.
KEYS = [
    # Standing, as in his standing clip: upright in the hanging hand.
    (0, -10, 88, (0.07, -0.17, 0.5), (0, 0, -0.005), 0, 0, 2, 0, LEFT),
    # Taken in both hands, the right gone down the shaft.
    (3, -40, 70, (0.12, -0.1, 0.58), (0, 0, -0.01), -4, -6, 3, 4, LEFT),
    # Gathered: swung back over his right shoulder, turned away, sunk back.
    (7, -130, 30, (0.13, -0.08, 0.66), (-0.02, 0, -0.02), -15, -25, 4, 25, LEFT),
    (9, -150, 24, (0.12, -0.08, 0.68), (-0.025, 0, -0.022), -18, -30, 4, 30, LEFT),
    # Round before him: the head straight ahead at the blow, as the left foot lands ahead.
    (11, -70, 8, (0.14, -0.03, 0.64), (0.01, 0, -0.025), -4, -6, 10, 6, LEFT_UP),
    (BLOW, 0, -2, (0.14, -0.02, 0.63), (0.04, 0, -0.03), 12, 14, 14, -14, LEFT_STEP),
    (15, 55, -5, (0.13, 0.0, 0.6), (0.045, 0, -0.03), 20, 26, 14, -22, LEFT_STEP),
    # Following on round to his left, low; then gathered back to standing.
    (17, 75, -9, (0.12, 0.01, 0.58), (0.04, 0, -0.028), 22, 30, 12, -24, LEFT_STEP),
    (FRAMES, -10, 88, (0.07, -0.17, 0.5), (0, 0, -0.005), 0, 0, 2, 0, LEFT),
]


def ease(k: float) -> float:
    return k * k * (3 - 2 * k)


def at(frame: int) -> tuple:
    """The path's values at a frame: eased between the keys either side of it."""
    for (f0, *a), (f1, *b) in zip(KEYS, KEYS[1:]):
        if f0 <= frame <= f1:
            k = ease((frame - f0) / (f1 - f0)) if f1 > f0 else 0

            def mix(p, q):
                if isinstance(p, tuple):
                    return tuple(x + (y - x) * k for x, y in zip(p, q))
                return p + (q - p) * k
            return tuple(mix(p, q) for p, q in zip(a, b))
    return tuple(KEYS[-1][1:])


for frame in range(FRAMES + 1):
    azimuth, rise, hand, shift, hips, spine, lean, look, left = at(frame)
    # His chest's frame: turned as far as his hips and spine together, about his hips.
    facing = Matrix.Rotation(math.radians(hips + spine), 3, 'Z')
    pivot = HIPS + Vector(shift)
    chest = lambda p: pivot + facing @ (Vector(p) - HIPS)  # noqa: E731
    elbow = lambda p: tuple(facing @ Vector(p))  # noqa: E731
    pose = {
        'Hip': [('move', shift), turn('z', hips)],
        'L_Thigh': plant(*left, knee=(1, 0.3, 0)), 'R_Thigh': plant(*RIGHT, knee=(1, -0.3, 0)),
        'Spine01': [turn('z', spine * 0.6), turn('y', lean * 0.5)],
        'Spine02': [turn('z', spine * 0.4), turn('y', lean * 0.5)],
        'Head': turn('z', look),
        'R_Upperarm': plant(*chest(hand), knee=elbow((-0.2, -1, -0.5))),
        'halberd': ('ahead', way(azimuth, rise)),
    }
    # Where the shaft is now, with the right hand on it: the left takes it above the right, if it can reach.
    rig.pose(pose)
    world = rig.arm.matrix_world
    butt = pole.matrix_world.to_translation()
    along = (pole.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
    grip = world @ rig.arm.pose.bones['R_Hand'].matrix.to_translation()
    on = world.inverted() @ (butt + along * ((grip - butt).dot(along) + APART))
    shoulder = rig.arm.pose.bones['L_Upperarm'].matrix.to_translation()
    holds = max(0.0, min(1.0, (REACH + SLACK - (on - shoulder).length) / SLACK))
    # Before he has gathered it, and once he lets it go to stand again, his left hand is at his side.
    holds *= min(1.0, frame / 3, (FRAMES - frame) / 3)
    target = chest(FREE).lerp(on, holds)
    pose['L_Upperarm'] = plant(*target, knee=elbow((-0.2, 1, -0.5)))
    rig.key(act, frame, pose)
    print('F', frame, 'left holds %.2f' % holds, 'reach %.3f' % (on - shoulder).length)

act.frame_range = (0, FRAMES)
rig.export(args[2])
