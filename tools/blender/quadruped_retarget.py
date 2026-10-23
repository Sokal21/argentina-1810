"""A clip of Quaternius's bull (CC0) put on the ox Tripo rigged as a quadruped: the bull's walk, made
by hand, where Tripo's own (preset:quadruped:walk) folded the hind legs flat under its belly.

    Blender -b --python tools/blender/quadruped_retarget.py -- OX_RIG.glb BULL.fbx CLIP OUT.glb [--name caminata]

The two skeletons are nothing alike (Tripo's 20 bones, the hind right leg a bone short; the bull's 56),
so it is not turns that are carried over but ways: each chain of the ox (each leg, the back, the neck
and head) is laid along the matching chain of the bull, its joints at the same shares of its length,
and each of its bones is turned from its own rest by the turn that takes the bull's matching stretch
from its rest to where it is in that frame. The ox keeps its own stance and gets the bull's motion;
the rise and fall of the bull's body, as a share of its legs' length, is the ox's root's.

The bull looks along -Y with its left at +X; the ox along +X with its left at +Y (Tripo's).
"""
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[4::2], args[5::2]))
OX, BULL, CLIP, OUT = args[:4]

# Each chain of the ox, by its bones in order, and the bull's points it is laid along (a bone's head,
# or its tail with ':tail'). The bull's shoulder stubs and its feet are left out: they lie across.
CHAINS = {
    'front_left': (['0_Left_Limb_0', '0_Left_Limb_1', '0_Left_Limb_2', '0_Left_Limb_3'], ['FrontUpperLeg.L', 'FrontLowerLeg.L', 'FrontLowerLeg.L:tail']),
    'front_right': (['0_Right_Limb_0', '0_Right_Limb_1', '0_Right_Limb_2', '0_Right_Limb_3'], ['FrontUpperLeg.R', 'FrontLowerLeg.R', 'FrontLowerLeg.R:tail']),
    'hind_left': (['1_Left_Limb_0', '1_Left_Limb_1', '1_Left_Limb_2'], ['BackLeg.L', 'BackUpperLeg.L', 'BackLowerLeg.L', 'BackLowerLeg.L:tail']),
    'hind_right': (['1_Right_Limb_0', '1_Right_Limb_1'], ['BackLeg.R', 'BackUpperLeg.R', 'BackLowerLeg.R', 'BackLowerLeg.R:tail']),
    'back': (['Spine_0', 'Spine_1', 'Spine_2'], ['Back', 'Torso', 'Torso2', 'Torso3:tail']),
    'head': (['Head_0', 'Head_1', 'Head_2'], ['Neck1', 'Neck2', 'Neck3', 'Head', 'Head:tail']),
}


def to_ox(v: Vector) -> Vector:
    """A way in the bull's frame as one in the ox's: its forward (-Y) to the ox's (+X), its left (+X) to the ox's (+Y)."""
    return Vector((-v.y, v.x, v.z))


def along(points: list, shares: list) -> list:
    """Points at these shares of a broken line's length."""
    lengths = [(b - a).length for a, b in zip(points, points[1:])]
    total = sum(lengths)
    out = []
    for share in shares:
        left = share * total
        for (a, b), length in zip(zip(points, points[1:]), lengths):
            if left <= length or (a, b) == (points[-2], points[-1]):
                out.append(a.lerp(b, min(1.0, left / length) if length else 0))
                break
            left -= length
    return out


def bones_of(armature) -> dict:
    return {b.name.split('::')[-1]: b for b in armature.pose.bones}


bpy.ops.wm.read_factory_settings(use_empty=True)
# The bull: every frame's points read first.
bpy.ops.import_scene.fbx(filepath=BULL)
bull = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
clip = next(a for a in bpy.data.actions if a.name.split('|')[-1] == CLIP)
bull.animation_data_create()
bull.animation_data.action = clip
if getattr(clip, 'slots', None):
    bull.animation_data.action_slot = clip.slots[0]
first, last = (int(f) for f in clip.frame_range)
fps = bpy.context.scene.render.fps
bb = bones_of(bull)


def point(name: str) -> Vector:
    bone, end = (name.split(':') + ['head'])[:2]
    pb = bb[bone]
    return bull.matrix_world @ (pb.tail if end == 'tail' else pb.head)


def chain_points() -> dict:
    return {key: [to_ox(point(p)) for p in source] for key, (_, source) in CHAINS.items()}


for pb in bull.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bull.animation_data.action = None
bpy.context.view_layer.update()
rest_bull = chain_points()
body_rest = point('Body').z
bull.animation_data.action = clip
if getattr(clip, 'slots', None):
    bull.animation_data.action_slot = clip.slots[0]
frames = []
for f in range(first, last + 1):
    bpy.context.scene.frame_set(f)
    bpy.context.view_layer.update()
    frames.append((chain_points(), point('Body').z - body_rest))
leg_bull = sum((b - a).length for a, b in zip(rest_bull['front_left'], rest_bull['front_left'][1:]))
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)

# The ox, standing at rest.
before = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=OX)
for a in set(bpy.data.actions) - before:
    bpy.data.actions.remove(a)
ox = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
ox.animation_data_create()
ox.animation_data.action = None
ob = bones_of(ox)
for pb in ox.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
# Each chain's rest: its bones' ways, and the shares of its length its joints stand at.
rest_ox = {}
for key, (names, _) in CHAINS.items():
    joints = [ob[n].head.copy() for n in names] + [ob[names[-1]].tail.copy()]
    lengths = [(b - a).length for a, b in zip(joints, joints[1:])]
    total = sum(lengths)
    shares = [sum(lengths[:i]) / total for i in range(len(joints))]
    rest_ox[key] = ([(b - a).normalized() for a, b in zip(joints, joints[1:])], shares)
leg_ox = sum((ob[n].tail - ob[n].head).length for n in CHAINS['front_left'][0])
root = ob['Root']

act = bpy.data.actions.new(opts.get('--name', 'caminata'))
ox.animation_data.action = act
# Parents before children: each bone is set against its parent as it already stands.
order = sorted(ox.pose.bones, key=lambda pb: len(pb.parent_recursive))
for n, (now, bob) in enumerate(frames):
    for pb in ox.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    root.location = (0, 0, 0)
    bpy.context.view_layer.update()
    # The rise and fall, along the root's own length (it stands upright).
    root.location.y = bob * leg_ox / leg_bull
    bpy.context.view_layer.update()
    wanted = {}
    for key, (names, _) in CHAINS.items():
        ways, shares = rest_ox[key]
        was, is_ = along(rest_bull[key], shares), along(now[key], shares)
        for i, name in enumerate(names):
            turn = (was[i + 1] - was[i]).normalized().rotation_difference((is_[i + 1] - is_[i]).normalized())
            wanted[name] = turn @ ways[i]
    for pb in order:
        name = pb.name.split('::')[-1]
        if name not in wanted:
            continue
        head = pb.head.copy()
        turn = (pb.tail - pb.head).normalized().rotation_difference(wanted[name])
        pb.matrix = Matrix.Translation(head) @ turn.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
        bpy.context.view_layer.update()
    for pb in ox.pose.bones:
        pb.keyframe_insert('rotation_quaternion', frame=n)
        pb.keyframe_insert('location', frame=n)
act.frame_range = (0, len(frames) - 1)
act.use_fake_user = True
bpy.context.scene.render.fps = fps
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
print('WROTE', OUT, act.name, len(frames), 'frames at', fps)
