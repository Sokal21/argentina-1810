"""The sergeant's halberd sweep: from standing, the halberd taken in both hands and swung back over
his right shoulder as he turns away and sinks onto his back foot; then round before him, right to
left at the height of a man's chest, as he steps onto his left foot, its head straight ahead at the
blow; on round to his left, low, and back to standing. 0.9 s, as the game's blow lasts, the blow
landing at 0.55 s: frame 13 of 22 (src/tropa/brain.ts, the sergeant's `blow`).

    Blender -b --python tools/blender/anims/barrido.py -- RIG.glb REPOSO.glb OUT.glb

REPOSO is his standing clip: the halberd is set in his fist as he stands in it, as the game's model
has it (props.halberd), so that turning his hand points it here as it will point there.

Written in his own rig's units (he stands 1.0 tall; +X ahead, +Y his left, +Z up). The halberd's
path is keyed every frame, its head drawing a curve; his right hand goes along a path of its own
by reach, and his left takes the shaft below it wherever the shaft is found to be in each frame.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

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
rig.held = {'halberd': props.halberd(rig.arm)}
pole = rig.held['halberd']
bpy.data.actions.remove(standing)
act = rig.action('barrido')
# A pole is guided by both hands, not held at the end of the wrist as a sabre is: it may stand at
# any angle to the forearm (standing about, it rises straight up from the hanging hand).
rig.GRIP = (0.0, math.pi)

FRAMES, BLOW = 22, 13
LENGTH = 1.15
# How far down the shaft from the right hand the left takes it.
APART = 0.12

# The feet: the right stays where it stands; the left steps ahead into the blow and back.
RIGHT = (-0.017, -0.074, 0.018)
LEFT, LEFT_STEP, LEFT_UP = (-0.012, 0.085, 0.014), (0.11, 0.1, 0.014), (0.05, 0.095, 0.05)


def way(azimuth: float, elevation: float) -> tuple:
    """A direction by its bearing (0 ahead, positive toward his left) and its rise, in degrees."""
    a, e = math.radians(azimuth), math.radians(elevation)
    return (math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e))


# The keys of the path, each: frame; the halberd's bearing and rise; the right hand's place; the
# hips' shift and turn; the spine's turn and lean; the head's turn back; where the left foot is.
KEYS = [
    # Standing, as in his standing clip: upright in the hanging hand.
    (0, -10, 88, (0.07, -0.17, 0.5), (0, 0, -0.005), 0, 0, 2, 0, LEFT),
    # Gathered: both hands on it, swung back over his right shoulder, turned away, sunk back.
    (7, -135, 28, (-0.03, -0.18, 0.7), (-0.02, 0, -0.02), -18, -28, 4, 22, LEFT),
    (9, -150, 22, (-0.05, -0.17, 0.71), (-0.025, 0, -0.022), -22, -32, 4, 26, LEFT),
    # Round before him: the head straight ahead at the blow, as the left foot lands ahead.
    (11, -70, 8, (0.06, -0.15, 0.66), (0.01, 0, -0.025), -4, -8, 10, 8, LEFT_UP),
    (BLOW, 0, -2, (0.13, -0.07, 0.62), (0.04, 0, -0.03), 12, 14, 14, -10, LEFT_STEP),
    (15, 60, -14, (0.12, 0.03, 0.59), (0.045, 0, -0.03), 20, 26, 14, -18, LEFT_STEP),
    # Following on round to his left, low; then gathered back to standing.
    (17, 80, -22, (0.1, 0.06, 0.57), (0.04, 0, -0.028), 22, 30, 12, -20, LEFT_STEP),
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
    pose = {
        'Hip': [('move', shift), turn('z', hips)],
        'L_Thigh': plant(*left, knee=(1, 0.3, 0)), 'R_Thigh': plant(*RIGHT, knee=(1, -0.3, 0)),
        'Spine01': [turn('z', spine * 0.6), turn('y', lean * 0.5)],
        'Spine02': [turn('z', spine * 0.4), turn('y', lean * 0.5)],
        'Head': turn('z', look),
        'R_Upperarm': plant(*hand, knee=(-0.3, -1, -0.4)),
        'halberd': ('ahead', Vector(way(azimuth, rise))),
    }
    # Where the shaft is now, with the right hand on it: the left takes it a little toward the butt.
    rig.pose(pose)
    butt = pole.matrix_world.to_translation()
    along = (pole.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
    world = rig.arm.matrix_world
    grip = world @ rig.arm.pose.bones['R_Hand'].matrix.to_translation()
    on = world.inverted() @ (butt + along * ((grip - butt).dot(along) - APART))
    # Before he has gathered it, his left hand comes to it from his side.
    reach = min(1.0, frame / 4)
    side = Vector((0.0, 0.2, 0.55))
    pose['L_Upperarm'] = plant(*(side.lerp(on, reach)), knee=(-0.3, 1, -0.4))
    rig.key(act, frame, pose)

act.frame_range = (0, FRAMES)
rig.export(args[2])
