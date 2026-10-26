"""Cabral's musket taken from his back and put back by Mixamo's "Grab And Put Back Rifle", joined to
the aim keyed in mosquete.py. The capture does both: he reaches over his right shoulder, takes the
rifle by the stock, swings it over and down into both hands, holds it a while, and swings it back
up and hangs it behind his shoulder again. It is cut in two:

    mosquete_descolgar   the capture's frames FROM_DRAW to TO_DRAW, then eased into the aim
    mosquete_guardar     eased from the aim into the capture's frame FROM_SLING, then on to TO_SLING

    Blender -b --python tools/blender/retarget_rot.py -- RIG.glb "Grab And Put Back Rifle.fbx" GRAB.glb --name tomar_fusil --feet --twist 1
    Blender -b --python tools/blender/anims/mosquete.py -- RIG.glb MOSQUETE.glb
    Blender -b --python tools/blender/anims/descolgar.py -- RIG.glb GRAB.glb MOSQUETE.glb OUT.glb [--measure yes]

Where the musket is all the while (on his back, in his right hand by the barrel, or in both by the
stock) is not keyed here but by `props.musket_carried`, given CARRIED for each clip; this file
shows it too, for the strips. With --measure it prints how near his right hand comes to the
musket on his back, frame by frame, to choose where he takes it and lets it go.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import CABRAL, Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
files = [a for a in args if not a.startswith('--') and (args.index(a) == 0 or not args[args.index(a) - 1].startswith('--'))]
opts = dict(zip(args[len(files)::2], args[len(files) + 1::2]))
rig = Rig(files[0], written_for=CABRAL)

# The capture's frames (24 a second; measured with --measure): his hand still on the stock behind
# his shoulder from 14 to 26, and away with it from 27; the left hand on it by 51 and off it by 85;
# the barrel behind his shoulder again until 114, and his hand down by 130. The sling starts at 74,
# as he lifts it: before, he stands holding it low, a pause after the aim.
FROM_DRAW, TO_DRAW = 6, 51
FROM_SLING, TO_SLING = 74, 130
# Frames to ease between the capture and the aim.
EASE = 8
# Where the musket is in each clip's own frames (props.musket_carried).
CARRIED = {
    'mosquete_descolgar': 'back.0.18+barrel.18.36+stock.45.53',
    'mosquete_guardar': 'stock.0.12+barrel.19.48+back.48.64',
}


def borrowed(path: str) -> list:
    """The actions of another file made on the same rig, its objects dropped."""
    before, had = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o)
    return [a for a in bpy.data.actions if a not in had]


def play(act: bpy.types.Action) -> None:
    rig.arm.animation_data_create()
    rig.arm.animation_data.action = act
    slots = getattr(act, 'slots', None)
    if slots:
        rig.arm.animation_data.action_slot = slots[0]


def sampled(act: bpy.types.Action, frame: int) -> dict:
    """Every bone's own turn and shift at a frame of an action."""
    play(act)
    bpy.context.scene.frame_set(frame)
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in rig.arm.pose.bones}


def eased(u: float) -> float:
    return (1 - math.cos(math.pi * min(1.0, max(0.0, u)))) / 2


def between(a: dict, b: dict, u: float) -> dict:
    out = {}
    for name, (loc, q) in a.items():
        loc2, q2 = b[name]
        if q.dot(q2) < 0:
            q2 = -q2
        out[name] = (loc.lerp(loc2, u), q.slerp(q2, u))
    return out


def keyed(act: bpy.types.Action, frame: int, pose: dict) -> None:
    play(act)
    for pb in rig.arm.pose.bones:
        loc, q = pose[pb.name]
        pb.location, pb.rotation_quaternion = loc, q
        pb.keyframe_insert('location', frame=frame)
        pb.keyframe_insert('rotation_quaternion', frame=frame)


for pb in rig.arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'
grab = next(a for a in borrowed(files[1]) if a.name.startswith('tomar_fusil'))
theirs = borrowed(files[2])
aim_act = next(a for a in theirs if a.name.startswith('mosquete_apuntar'))
aim_act.name = 'mosquete_apuntar'
AIM = sampled(aim_act, 0)

if opts.get('--measure') == 'yes':
    back = props.musket(rig.arm)
    for frame in range(FROM_DRAW, TO_SLING + 1):
        play(grab)
        bpy.context.scene.frame_set(frame)
        hand = rig.arm.matrix_world @ rig.arm.pose.bones['R_Hand'].head
        butt = back.matrix_world.to_translation()
        along = (back.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
        s = max(0.0, min(0.62, (hand - butt).dot(along)))
        print(f'MEASURE {frame:3d} hand {(hand - (butt + along * s)).length:.3f} from the musket, {s:.2f} up it')
    sys.exit(0)

draw = bpy.data.actions.new('mosquete_descolgar')
draw.use_fake_user = True
for k, frame in enumerate(range(FROM_DRAW, TO_DRAW + 1)):
    keyed(draw, k, sampled(grab, frame))
last = sampled(grab, TO_DRAW)
for k in range(1, EASE + 1):
    keyed(draw, TO_DRAW - FROM_DRAW + k, between(last, AIM, eased(k / EASE)))

sling = bpy.data.actions.new('mosquete_guardar')
sling.use_fake_user = True
first = sampled(grab, FROM_SLING)
for k in range(EASE):
    keyed(sling, k, between(AIM, first, eased(k / EASE)))
for k, frame in enumerate(range(FROM_SLING, TO_SLING + 1)):
    keyed(sling, EASE + k, sampled(grab, frame))

for act in (grab, *theirs):
    if act is not aim_act:
        bpy.data.actions.remove(act)

# What he carries, for the strips: the musket on his back and the one in his hand, moved as the game will.
props.musket(rig.arm)
props.musket_in_hand(rig.arm)
for name, spans in CARRIED.items():
    props.musket_carried(rig.arm, name, spans)
# The game hides the one on his back through these clips; the aim is mosquete.py's own.
bpy.data.objects.remove(bpy.data.objects['mosquete'])
bpy.data.actions.remove(aim_act)
rig.export(files[3])
