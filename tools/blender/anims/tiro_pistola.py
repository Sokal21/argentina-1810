"""The captain's pistol shot, standing: Mixamo's Gunplay (a pistol fired one-handed from one knee)
from the waist up, on his legs as he stands (his breathing idle, held at one frame). Every frame his
hips and legs are the standing clip's, and his waist, spine, neck, head and arms the kneeling shot's
at that frame, so he raises the pistol, fires and lowers it without going down.

    Blender -b --python tools/blender/anims/tiro_pistola.py -- RIG.glb SHOT.glb STAND.glb OUT.glb [--stand 0] [--aim F]

SHOT and STAND are clips already on his rig (tools/blender/retarget_rot.py; SHOT with --twist 1).
With `--aim`, the frame he fires at (the capture's arm straight out at his shoulder: frames 11 to 17;
after it he draws the pistol in to his shoulder, its barrel level, which is not the shot):
- his upper body is stood up from the waist, as straight as he stands (the kneeling man leans
  forward over his knee, which standing read as a bow), by one turn kept every frame;
- his arm is lowered from the shoulder, by one turn kept every frame, so it is level there (kneeling,
  the man aimed up, 27 degrees, at one standing);
- his wrist is bent, by one turn kept every frame, so the barrel runs on along his arm there;
- his upper body is turned about the upright from the waist, so the barrel points straight before
  him there, as the game's ball goes.
Without it, how far his arm reaches and how the barrel points are printed for every frame.
"""
import math
import os
import sys

import bpy

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import props  # noqa: E402
from cape import off_limbs  # noqa: E402
from keyframes import Rig  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[4::2], args[5::2]))
STAND_AT = int(opts.get('--stand', 0))
AIM_AT = int(opts['--aim']) if '--aim' in opts else None
rig = Rig(args[0])
arm = rig.arm
bones = arm.pose.bones


def bring(path: str, name: str) -> bpy.types.Action:
    before, had = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    for o in set(bpy.data.objects) - before:
        bpy.data.objects.remove(o)
    found = next(a for a in bpy.data.actions if a not in had)
    found.name = name
    return found


# His cape off his hand first, as prepare_rigged.py --cape takes it: where the hand is found (and the
# pistol set in it) is from the vertices the hand holds, and the cape's threw it 40 degrees off.
off_limbs(arm, props.body_of(arm))
gun = props.pistol(arm)
shot = bring(args[1], 'disparo')
stand = bring(args[2], 'parado')
# From the standing: his hips (where they are and how they turn) and his legs.
LOWER = {b.name for b in arm.data.bones if b.name in ('Root', 'Hip', 'Pelvis') or any(k in b.name for k in ('Thigh', 'Calf', 'Foot', 'ToeBase'))}


def pose_of(act: bpy.types.Action, frame: int) -> dict:
    arm.animation_data_create()
    arm.animation_data.action = act
    if getattr(act, 'slots', None):
        arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {pb.name: pb.matrix_basis.copy() for pb in bones}


# Every pose read first, then the new clip keyed (Blender's action slots: see tiro_arrodillado.py).
down = pose_of(stand, STAND_AT)
first, last = (int(f) for f in shot.frame_range)
ups = [pose_of(shot, frame) for frame in range(first, last + 1)]
arm.animation_data.action = None
waist, wrist, shoulder = bones['Waist'], bones['R_Hand'], bones['R_Upperarm']
# Straight before him and level, on his rig (+X forward, +Z up).
AHEAD = Vector((1, 0, 0))


def pose(n: int, turn: Quaternion, bend: Quaternion = Quaternion(), lower: Quaternion = Quaternion()) -> None:
    for pb in bones:
        pb.matrix_basis = (down if pb.name in LOWER else ups[n])[pb.name]
    # Each turns its bone where it is, not where it sits on the one before.
    for bone, by in ((wrist, bend), (shoulder, lower)):
        at, rot, size = bone.matrix_basis.decompose()
        bone.matrix_basis = Matrix.LocRotScale(at, by @ rot, size)
    bpy.context.view_layer.update()
    head = waist.matrix.to_translation()
    waist.matrix = Matrix.Translation(head) @ turn.to_matrix().to_4x4() @ Matrix.Translation(-head) @ waist.matrix
    bpy.context.view_layer.update()


def barrel() -> Vector:
    return (arm.matrix_world.inverted().to_3x3() @ gun.matrix_world.to_3x3().col[0]).normalized()


def arm_way() -> Vector:
    """The way his right arm points, shoulder to wrist, on his rig."""
    return (wrist.head - shoulder.head).normalized()


def along_arm() -> Vector:
    """The way his right arm points, levelled."""
    way = arm_way()
    return Vector((way.x, way.y, 0)).normalized()


def in_frame(bone, world: Quaternion) -> Quaternion:
    """A turn on his rig, as one in the bone's own frame before its pose."""
    frame = (bone.matrix @ bone.matrix_basis.inverted()).to_quaternion()
    return frame.inverted() @ world @ frame


def spine() -> Vector:
    """The way his back goes up, waist to head, on his rig."""
    return (bones['Head'].head - waist.head).normalized()


turn = Quaternion()
if AIM_AT is None:
    for n in range(len(ups)):
        pose(n, turn)
        b = barrel()
        reach = (wrist.head - bones['R_Upperarm'].head).length
        print(f'frame {n:2d}: arm {reach:.3f} long, barrel {math.degrees(math.atan2(b.y, b.x)):6.1f} across, {math.degrees(math.asin(max(-1, min(1, b.z)))):6.1f} up')
    sys.exit(0)
# Stood up: his back at the shot as straight as it is standing.
for pb in bones:
    pb.matrix_basis = down[pb.name]
bpy.context.view_layer.update()
straight = spine()
for _ in range(3):
    pose(AIM_AT, turn)
    turn = spine().rotation_difference(straight) @ turn
upright = turn.copy()
# His arm levelled from the shoulder, then the wrist's bend, each found where he fires.
bend, lower = Quaternion(), Quaternion()
for _ in range(3):
    pose(AIM_AT, turn, bend, lower)
    lower = in_frame(shoulder, arm_way().rotation_difference(along_arm())) @ lower
for _ in range(3):
    pose(AIM_AT, turn, bend, lower)
    bend = in_frame(wrist, barrel().rotation_difference(along_arm())) @ bend
print('arm lowered', round(math.degrees(lower.angle)), 'degrees; wrist bent', round(math.degrees(bend.angle)))
# Turned about the upright only, so the barrel points ahead.
for _ in range(3):
    pose(AIM_AT, turn, bend, lower)
    b = barrel()
    turn = Quaternion(Vector((0, 0, 1)), -math.atan2(b.y, b.x)) @ turn
pose(AIM_AT, turn, bend, lower)
print('barrel at the shot', [round(v, 3) for v in barrel()])
act = rig.action(opts.get('--name', 'tiro'))
for n in range(len(ups)):
    pose(n, turn, bend, lower)
    for pb in bones:
        pb.keyframe_insert('rotation_quaternion', frame=n)
        pb.keyframe_insert('location', frame=n)
act.frame_range = (0, last - first)
for other in (shot, stand):
    bpy.data.actions.remove(other)
rig.export(args[3])
