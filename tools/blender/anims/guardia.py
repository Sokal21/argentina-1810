"""The sergeant standing and walking with his halberd in both hands, on guard, as his blow begins:
his standing and walking clips kept as they are but for his arms, which hold the halberd across
before him as the blow ends, both fists on the shaft, carried with his chest as it
breathes and sways.

    Blender -b --python tools/blender/anims/guardia.py -- RIG.glb REPOSO.glb CAMINATA.glb GOLPE.glb OUT_DIR

GOLPE is his blow (tools/blender/anims/golpe_pesado.py); OUT_DIR gets reposo_guardia.glb and
caminata_guardia.glb, their clips still named as the game plays them (reposo_mixamo, caminata_mixamo),
the captures they are made from kept as they are. The guard is read off the blow's last frame, in his chest's frame: where
each fist is, and how the halberd lies (read off its last frame). Then, every frame of each clip, his right arm reaches so its
fist is there and its hand turns the halberd so; his left reaches so its fist is on the shaft.
"""
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from keyframes import Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
RIG, REPOSO, CAMINATA, GOLPE, OUT = args[:5]
rig = Rig(RIG)
arm = rig.arm
bones = arm.pose.bones
local = arm.matrix_world.inverted()


def bring(path: str, name: str) -> bpy.types.Action:
    before, had = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o)
    act = next(a for a in bpy.data.actions if a not in had)
    act.name = name
    return act


standing = bring(REPOSO, 'reposo_mixamo')
walking = bring(CAMINATA, 'caminata_mixamo')
blow = bring(GOLPE, 'barrido')
pole = props.halberd_in_hands(arm)


def play(act: bpy.types.Action, frame: int) -> None:
    arm.animation_data_create()
    arm.animation_data.action = act
    if getattr(act, 'slots', None):
        arm.animation_data.action_slot = act.slots[0]
    for pb in bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()


def chest() -> Matrix:
    """His chest's frame as he is posed now, in the armature's space."""
    pb = bones['Spine02']
    return pb.matrix @ pb.bone.matrix_local.inverted()


def axis() -> Vector:
    return (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((1, 0, 0)))).normalized()


def edge() -> Vector:
    return (local.to_3x3() @ (pole.matrix_world.to_3x3() @ Vector((0, -1, 0)))).normalized()


def elbow(upper) -> Vector:
    return next(c for c in upper.children if 'Twist' not in c.name).matrix.to_translation()


# The guard, off the blow's last frame (where it ends, still, on guard: its first is already the
# weapon dropped to be swung), in his chest's frame.
play(blow, int(blow.frame_range[1]))
to_chest = chest().inverted()
GUARD = {
    'right': to_chest @ props.held_at(arm, 'R_Hand'),
    'left': to_chest @ props.held_at(arm, 'L_Hand'),
    'axis': (to_chest.to_3x3() @ axis()).normalized(),
    'edge': (to_chest.to_3x3() @ edge()).normalized(),
    'r_elbow': to_chest @ elbow(bones['R_Upperarm']),
    'l_elbow': to_chest @ elbow(bones['L_Upperarm']),
}


def lay(hand, way: Vector, facing: Vector) -> None:
    """Turns the hand about its wrist so the halberd lies along `way`, its edge toward `facing`."""
    x = way.normalized()
    e = (facing - x * facing.dot(x)).normalized()
    target = Matrix((x, -e, x.cross(-e))).transposed()
    now = Matrix((axis(), -edge(), axis().cross(-edge()))).transposed()
    q = (target @ now.inverted()).to_quaternion()
    head = hand.matrix.to_translation()
    hand.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ hand.matrix
    bpy.context.view_layer.update()


def reach(side: str, fist_at: Vector, elbow_at: Vector) -> None:
    """His arm reaching so its fist is at a spot: the wrist aimed where the fist must be less how far
    the fist is from it, looked at again and again as the hand turns with the forearm."""
    upper, hand = bones[f'{side}_Upperarm'], bones[f'{side}_Hand']
    for _ in range(4):
        wrist = hand.matrix.to_translation()
        held = props.held_at(arm, f'{side}_Hand')
        shoulder = upper.matrix.to_translation()
        target = fist_at - (held - wrist)
        rig.reach(upper, target, (elbow_at - (shoulder + target) / 2).normalized())
        if side == 'R':
            frame = chest()
            lay(hand, frame.to_3x3() @ GUARD['axis'], frame.to_3x3() @ GUARD['edge'])


worst = 0.0
for act in (standing, walking):
    first, last = (int(f) for f in act.frame_range)
    for frame in range(first, last + 1):
        play(act, frame)
        frame_now = chest()
        reach('R', frame_now @ GUARD['right'], frame_now @ GUARD['r_elbow'])
        # The left fist onto the shaft, where the guard has it along it.
        right = props.held_at(arm, 'R_Hand')
        along = (frame_now @ GUARD['left'] - right).dot(axis())
        reach('L', right + axis() * along, frame_now @ GUARD['l_elbow'])
        left = props.held_at(arm, 'L_Hand')
        off = (left - right) - axis() * (left - right).dot(axis())
        worst = max(worst, off.length)
        for name in ('R_Upperarm', 'R_Forearm', 'R_Hand', 'L_Upperarm', 'L_Forearm'):
            bones[name].keyframe_insert('rotation_quaternion', frame=frame)
    print('GUARD', act.name, 'frames', first, last, 'left fist off the shaft at most %.4f' % worst)

# Each written alone, as the clips are kept.
for act in (standing, walking):
    for other in list(bpy.data.actions):
        other.use_fake_user = other is act
    arm.animation_data.action = None
    for track in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(track)
    track = arm.animation_data.nla_tracks.new()
    track.name = act.name
    track.strips.new(act.name, int(act.frame_range[0]), act)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, act.name.split('_')[0] + '_guardia.glb'), export_format='GLB', export_yup=True,
                              export_animation_mode='NLA_TRACKS')
    print('WROTE', act.name)
