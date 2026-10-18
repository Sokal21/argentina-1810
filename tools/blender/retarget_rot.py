"""Put motion capture onto a Tripo rig by its bones' turns, twist and all: for a roll, a fall, a
blow, where copying only which way each bone points (tools/blender/retarget_bvh.py) loses the
twisting that makes it look alive.

    Blender -b --python tools/blender/retarget_rot.py -- RIG.glb CLIP.(fbx|bvh) OUT.glb --name rodada [--frames 10:40] [--ground]

Reads Mixamo's FBX (mixamorig:Hips...) or CMU's BVH (Hips, LeftUpLeg...).

How: both skeletons are brought to one pose of reference first, the captured one's own rest (a T
for both Mixamo and CMU), the rig's by turning each of its bones to point the way the captured
one's does at rest (its arms go up from Tripo's A). Then for every frame each captured bone's turn
from its rest is given to the matching bone of the rig, from its reference; the hips also rise and
fall, scaled to the rig's legs. Played in place: what the capture travels, the game does. With
--ground the body is rested on the ground every frame, its lowest point touching it.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.dirname(__file__))
from keyframes import Rig  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
rig_path, clip, out = args[0], args[1], args[2]
opts = {k: v for k, v in zip(args[3:], args[4:] + ['']) if k.startswith('--')}
NAME = opts.get('--name', 'captura')
FPS = 24

# The rig's bones, and the captured ones they are given the turns of.
PARTS = {
    'Hip': 'Hips', 'Spine01': 'Spine', 'Spine02': 'Spine1', 'NeckTwist01': 'Neck', 'Head': 'Head',
    'L_Clavicle': 'LeftShoulder', 'L_Upperarm': 'LeftArm', 'L_Forearm': 'LeftForeArm',
    'R_Clavicle': 'RightShoulder', 'R_Upperarm': 'RightArm', 'R_Forearm': 'RightForeArm',
    'L_Thigh': 'LeftUpLeg', 'L_Calf': 'LeftLeg', 'L_Foot': 'LeftFoot', 'L_ToeBase': 'LeftToeBase',
    'R_Thigh': 'RightUpLeg', 'R_Calf': 'RightLeg', 'R_Foot': 'RightFoot', 'R_ToeBase': 'RightToeBase',
}
# The hands are left to follow the forearms: a hand has no joint beyond it to know its rest by,
# and given its turns it came out flat and turned through a right angle.
# Where a captured bone's length runs to, to know which way it points: the next joint along.
NEXT = {
    'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Neck', 'Neck': 'Head',
    'LeftShoulder': 'LeftArm', 'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand',
    'RightShoulder': 'RightArm', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand',
    'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase',
    'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase',
}

rig = Rig(rig_path, FPS)
before = set(bpy.data.objects)
if clip.lower().endswith('.fbx'):
    bpy.ops.import_scene.fbx(filepath=clip, automatic_bone_orientation=False)
else:
    bpy.ops.import_anim.bvh(filepath=clip, update_scene_fps=False, update_scene_duration=False)
src = next(o for o in set(bpy.data.objects) - before if o.type == 'ARMATURE')
action = src.animation_data.action
SOURCE_FPS = 30 if clip.lower().endswith('.fbx') else 120
first, last = (int(v) for v in action.frame_range)
if '--frames' in opts:
    first, last = (int(v) for v in opts['--frames'].split(':'))


def named(name: str) -> str:
    """The captured bone of that name, whatever its prefix (Mixamo's mixamorig:...)."""
    return next(b.name for b in src.data.bones if b.name.split(':')[-1] == name)


SRC = {ours: named(theirs) for ours, theirs in PARTS.items() if any(b.name.split(':')[-1] == theirs for b in src.data.bones)}
SRC_NEXT = {named(a): named(b) for a, b in NEXT.items() if any(x.name.split(':')[-1] == a for x in src.data.bones)}

# The captured skeleton's axes at rest, from its hips and spine, against the rig's (+X forward,
# +Y left, +Z up): the turn that lays one onto the other.
rest = {b.name: src.matrix_world @ b.matrix_local for b in src.data.bones}
hips_l, hips_r = rest[named('LeftUpLeg')].to_translation(), rest[named('RightUpLeg')].to_translation()
spine_up = rest[named('Spine')].to_translation() - rest[named('Hips')].to_translation()
left = (hips_l - hips_r).normalized()
forward = left.cross(spine_up).normalized()
up = forward.cross(left).normalized()
ONTO = Matrix((forward, left, up)).to_3x3()   # rows: captured axes; takes captured into the rig's

# Ahead, while he moves, is the way he travels over the stretch taken, not the way the capture's
# rest pose faces: an actor running and rolling some other way came out rolling sideways.
scene = bpy.context.scene


def hips_at(frame: float) -> Vector:
    scene.frame_set(int(frame), subframe=frame - int(frame))
    return (src.matrix_world @ src.pose.bones[named('Hips')].matrix).to_translation()


travel = hips_at(last) - hips_at(first)
travel.z = 0
if travel.length > 1e-3:
    t_forward = travel.normalized()
    t_left = Vector((0, 0, 1)).cross(t_forward)
    ALONG = Matrix((t_forward, t_left, Vector((0, 0, 1)))).to_3x3()
else:
    ALONG = ONTO


def direction(world: dict, bone: str) -> Vector:
    nxt = SRC_NEXT.get(bone)
    if nxt:
        return (world[nxt].to_translation() - world[bone].to_translation()).normalized()
    return (world[bone].to_3x3() @ Vector((0, 1, 0))).normalized()


# The rig in the captured rest pose: each bone turned to point as its captured one does at rest.
arm = rig.arm
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
reference = {}
for name in rig.order:
    if name not in SRC:
        continue
    pb = arm.pose.bones[name]
    if name != 'Hip':
        want = ONTO @ direction(rest, SRC[name])
        rig.turn_to(pb, want)
    reference[name] = pb.matrix.to_3x3().normalized()
src_rest_turn = {SRC[n]: rest[SRC[n]].to_3x3().normalized() for n in SRC}

# The captured legs against the rig's, to scale heights.
leg_src = (rest[named('LeftUpLeg')].to_translation() - rest[named('LeftFoot')].to_translation()).length
leg_rig = (arm.data.bones['L_Thigh'].head_local - arm.data.bones['L_Foot'].head_local).length
scale = leg_rig / leg_src
REST_HIP = arm.data.bones['Hip'].head_local.z
ONTO4 = ONTO.to_4x4()

act = rig.action(NAME)
length = max(2, round((last - first) / SOURCE_FPS * FPS))


def heading(frame: float) -> float:
    """Which way round the captured pelvis faces, seen along his travel (radians about up)."""
    scene.frame_set(int(frame), subframe=frame - int(frame))
    w = {pb.name: src.matrix_world @ pb.matrix for pb in src.pose.bones}
    left_ = ALONG @ (w[named('LeftUpLeg')].to_translation() - w[named('RightUpLeg')].to_translation())
    return math.atan2(-left_.x, left_.y)


# He ends facing the way he started: whatever the actor turned through by the end is taken back
# a little each frame. (He came out of a roll turned a quarter round, and snapped back when he
# walked on.)
UNTURN = heading(first) - heading(last)
UNTURN = (UNTURN + math.pi) % (2 * math.pi) - math.pi
# And he starts facing the way he goes: an actor standing a little askew is set square to it.
SQUARE = -heading(first)
for frame in range(length + 1):
    at = first + (last - first) * frame / length
    scene.frame_set(int(at), subframe=at - int(at))
    world = {pb.name: src.matrix_world @ pb.matrix for pb in src.pose.bones}
    # The hips' height over the ground (the capture's ground is z = 0), as the rig's legs make it.
    hip_height = world[named('Hips')].to_translation().z * scale - REST_HIP

    def posed(lift: float) -> None:
        for pb in arm.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        for name in rig.order:
            if name not in SRC:
                continue
            pb = arm.pose.bones[name]
            theirs = SRC[name]
            # The captured bone's turn from its rest, laid into the rig's axes, after the rig's
            # bone's reference turn.
            # Posed as the capture is, seen along the way he travels; from its rest, seen as it faces.
            turned = ALONG @ world[theirs].to_3x3().normalized() @ src_rest_turn[theirs].inverted() @ ONTO.inverted()
            turned = Matrix.Rotation(SQUARE + UNTURN * frame / length, 3, 'Z') @ turned
            head = pb.matrix.to_translation()
            if name == 'Hip':
                head = head + Vector((0, 0, lift))
            pb.matrix = Matrix.Translation(head) @ (turned @ reference[name]).to_4x4()
            bpy.context.view_layer.update()

    # Posed with no action on it: with one, every update laid back what was keyed on the frames
    # before, and the hips rose a little more each frame.
    arm.animation_data.action = None
    lift = hip_height
    posed(lift)
    if '--ground' in opts:
        for _ in range(3):
            low = rig.lowest()
            if abs(low) < 0.002:
                break
            lift -= low
            posed(lift)
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.keyframe_insert('rotation_quaternion', frame=frame)
        pb.keyframe_insert('location', frame=frame)

bpy.data.objects.remove(src)
for a in [a for a in bpy.data.actions if a is not act]:
    bpy.data.actions.remove(a)
rig.export(out)
