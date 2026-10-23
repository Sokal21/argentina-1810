"""A capture played with what he holds in his right hand (a pistol, a sabre) pointing straight before
him and level at one frame: where the game's ball goes, or where his thrust lands. The captain's
pistol shot (Mixamo's Gunplay, fired one-handed from one knee) and his thrust (Mixamo's Stabbing, a
knife held point up).

    Blender -b --python tools/blender/anims/al_frente.py -- RIG.glb CLIP.glb OUT.glb --prop pistol --aim F
        [--name tiro] [--stand STAND.glb] [--stand-at 0] [--level-arm yes]

CLIP (and STAND) are clips already on his rig (tools/blender/retarget_rot.py). `--prop` is the
props.py maker of what he holds, its length along its +X, with its arguments after '@' as
prepare_rigged.py's --carries (sabre@R_Hand@little); give prepare_rigged.py the same. At frame `--aim`:
- with `--stand`, his hips and legs are that clip's, held at `--stand-at`, every frame, and his upper
  body the capture's, stood up from the waist as straight as he stands (the pistol's man kneels,
  leaning over his knee, which standing read as a bow);
- with `--level-arm yes`, his arm is lowered (or raised) from the shoulder so it is level there
  (kneeling, the pistol's man aimed up 27 degrees at one standing);
- his wrist is bent so what he holds runs on along his arm there, levelled (the knife's point up
  stood the sabre on end);
- his upper body is turned about the upright from the waist so it points straight before him there.
Each of these is one turn, kept every frame. Without `--aim`, how far his arm reaches and how what he
holds points are printed for every frame, to choose that frame by.
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
opts = dict(zip(args[3::2], args[4::2]))
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


# His cape off his hand first, as prepare_rigged.py --cape takes it: where the hand is found (and what
# it holds set in it) is from the vertices the hand holds, and the cape's threw the pistol 40 degrees off.
off_limbs(arm, props.body_of(arm))
# Its arguments after '@', as prepare_rigged.py's --carries: sabre@R_Hand@little.
maker, *given = opts['--prop'].split('@')
held = getattr(props, maker)(arm, *given)
clip = bring(args[1], 'captura')
stand = bring(opts['--stand'], 'parado') if '--stand' in opts else None
# From the standing: his hips (where they are and how they turn) and his legs.
LOWER = {b.name for b in arm.data.bones if b.name in ('Root', 'Hip', 'Pelvis') or any(k in b.name for k in ('Thigh', 'Calf', 'Foot', 'ToeBase'))} if stand else set()


def pose_of(act: bpy.types.Action, frame: int) -> dict:
    arm.animation_data_create()
    arm.animation_data.action = act
    if getattr(act, 'slots', None):
        arm.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {pb.name: pb.matrix_basis.copy() for pb in bones}


# Every pose read first, then the new clip keyed: an action switched to again after another was keyed
# was no longer played (Blender's action slots).
down = pose_of(stand, int(opts.get('--stand-at', 0))) if stand else {}
first, last = (int(f) for f in clip.frame_range)
ups = [pose_of(clip, frame) for frame in range(first, last + 1)]
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


def pointing() -> Vector:
    """The way what he holds points, on his rig."""
    return (arm.matrix_world.inverted().to_3x3() @ held.matrix_world.to_3x3().col[0]).normalized()


def arm_way() -> Vector:
    """The way his right arm points, shoulder to wrist, on his rig."""
    return (wrist.head - shoulder.head).normalized()


def along_arm() -> Vector:
    """The way his right arm points, levelled."""
    way = arm_way()
    return Vector((way.x, way.y, 0)).normalized()


def spine() -> Vector:
    """The way his back goes up, waist to head, on his rig."""
    return (bones['Head'].head - waist.head).normalized()


def in_frame(bone, world: Quaternion) -> Quaternion:
    """A turn on his rig, as one in the bone's own frame before its pose."""
    frame = (bone.matrix @ bone.matrix_basis.inverted()).to_quaternion()
    return frame.inverted() @ world @ frame


turn = Quaternion()
if AIM_AT is None:
    for n in range(len(ups)):
        pose(n, turn)
        p = pointing()
        reach = (wrist.head - shoulder.head).length
        print(f'frame {n:2d}: arm {reach:.3f} long, held {math.degrees(math.atan2(p.y, p.x)):6.1f} across, {math.degrees(math.asin(max(-1, min(1, p.z)))):6.1f} up')
    sys.exit(0)
if stand:
    for pb in bones:
        pb.matrix_basis = down[pb.name]
    bpy.context.view_layer.update()
    straight = spine()
    for _ in range(3):
        pose(AIM_AT, turn)
        turn = spine().rotation_difference(straight) @ turn
bend, lower = Quaternion(), Quaternion()
if opts.get('--level-arm') == 'yes':
    for _ in range(3):
        pose(AIM_AT, turn, bend, lower)
        lower = in_frame(shoulder, arm_way().rotation_difference(along_arm())) @ lower
for _ in range(3):
    pose(AIM_AT, turn, bend, lower)
    bend = in_frame(wrist, pointing().rotation_difference(along_arm())) @ bend
print('arm lowered', round(math.degrees(lower.angle)), 'degrees; wrist bent', round(math.degrees(bend.angle)))
# Turned about the upright only, so it points ahead.
for _ in range(3):
    pose(AIM_AT, turn, bend, lower)
    p = pointing()
    turn = Quaternion(Vector((0, 0, 1)), -math.atan2(p.y, p.x)) @ turn
pose(AIM_AT, turn, bend, lower)
print('held at the frame', [round(v, 3) for v in pointing()])
act = rig.action(opts.get('--name', 'tiro'))
for n in range(len(ups)):
    pose(n, turn, bend, lower)
    for pb in bones:
        pb.keyframe_insert('rotation_quaternion', frame=n)
        pb.keyframe_insert('location', frame=n)
act.frame_range = (0, last - first)
for other in filter(None, (clip, stand)):
    bpy.data.actions.remove(other)
rig.export(args[2])
