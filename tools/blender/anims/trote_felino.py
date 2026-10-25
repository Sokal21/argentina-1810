"""A cat's trot keyed by hand on a quadruped skeleton of Quaternius's kind (fit_to_bull.py's: Body,
Torso…, Neck1…3, Head, FrontUpperLeg/FrontLowerLeg, BackLeg/BackUpperLeg/BackLowerLeg .L/.R), for the
nahuel: carried over from the wolf, its clips tore the puma's skin (its legs and neck are far longer).

    Blender -b --python tools/blender/anims/trote_felino.py -- RIG.glb OUT.glb [--frames 24] [--name trote] [--still yes | --gait gallop | --gait swipe]

Diagonal pairs (front left with hind right, front right with hind left) half a stride apart; each leg
swung from its top about the way across the body, its lower joints bent as it is carried forward and
straight as it bears; the body rising and falling twice a stride, the head held steadier against it.
Every turn is made about the armature's left-right axis through the bone's head, on its parent as
posed, so each joint swings in the body's own plane whatever its bone's own axes are. The animal looks
along -Y with its left at +X: a turn of +a about +X carries a hanging foot back.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[2::2], args[3::2]))
FRAMES = int(opts.get('--frames', 24))
NAME = opts.get('--name', 'trote')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
arm.animation_data_create()
pb = {b.name: b for b in arm.pose.bones}
for b in arm.pose.bones:
    b.rotation_mode = 'QUATERNION'
    b.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
rest = {b.name: b.bone.matrix_local.copy() for b in arm.pose.bones}
X = Vector((1, 0, 0))
legs_h = rest['FrontUpperLeg.L'].to_translation().z  # how high the shoulder stands, to size the bob

# How much each joint swings, in degrees: the top of each leg back and forth; its lower joints' bend
# while it is carried (front: knee folds the foot back; hind: hock lifts the foot forward).
SWING = {'front': 24, 'hind': 22}
BEND = {'front': (0, 55, 35), 'hind': (-15, 50, -45)}
CHAINS = {
    ('front', 'L'): ['FrontUpperLeg.L', 'FrontLowerLeg.L'],
    ('front', 'R'): ['FrontUpperLeg.R', 'FrontLowerLeg.R'],
    ('hind', 'L'): ['BackLeg.L', 'BackUpperLeg.L', 'BackLowerLeg.L'],
    ('hind', 'R'): ['BackLeg.R', 'BackUpperLeg.R', 'BackLowerLeg.R'],
}
# Half a stride apart: front left with hind right.
PHASE = {('front', 'L'): 0.0, ('hind', 'R'): 0.0, ('front', 'R'): 0.5, ('hind', 'L'): 0.5}


def turn(name: str, degrees: float) -> None:
    """Turns a bone about the body's left-right axis through its head, on its parent as now posed."""
    b = pb[name]
    parent = b.parent
    on = (parent.matrix @ rest[parent.name].inverted() @ rest[name]) if parent else rest[name]
    head = on.to_translation()
    b.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(degrees), 4, X) @ Matrix.Translation(-head) @ on
    bpy.context.view_layer.update()


STILL = opts.get('--still') == 'yes'
GAIT = opts.get('--gait', 'trot')
if GAIT == 'gallop':
    # A bound: each pair nearly together (a little apart, left then right), the hind pair half a stride
    # after the front; long swings, deep folds; the back gathering and stretching once a stride.
    # (Folded deeper, the skin tore at the belly and the legs crossed.)
    SWING = {'front': 34, 'hind': 30}
    BEND = {'front': (0, 45, 30), 'hind': (-10, 38, -35)}
    PHASE = {('front', 'L'): 0.0, ('front', 'R'): 0.08, ('hind', 'L'): 0.5, ('hind', 'R'): 0.58}
if STILL:
    # Standing instead: legs bearing, the body breathing, the head turning a little, the tail-end still.
    SWING = {'front': 0, 'hind': 0}
    BEND = {'front': (0, 0, 0), 'hind': (0, 0, 0)}
act = bpy.data.actions.new(NAME)
arm.animation_data.action = act
order = sorted(arm.pose.bones, key=lambda b: len(b.parent_recursive))
for f in range(FRAMES):
    t = f / FRAMES
    for b in arm.pose.bones:
        b.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    # The body rises and falls twice a stride, and pitches a little with the bearing pair.
    body = pb.get('Body')
    if body:
        body.location = (0, 0, 0)
        bpy.context.view_layer.update()
        lift = (math.sin(t * math.tau) * 0.008 if STILL else math.sin(t * math.tau) * 0.07 if GAIT == 'gallop' else math.sin(t * math.tau * 2) * 0.025) * legs_h
        body.matrix = Matrix.Translation((0, 0, lift)) @ body.matrix
        bpy.context.view_layer.update()
    if GAIT == 'swipe':
        # Crouched back (0 to 0.35), the right forepaw raised high and forward; struck down (0.35 to 0.5);
        # held, then back to standing (to 1). `k` how far into the crouch, `up` how high the paw.
        k = min(1, t / 0.35) if t < 0.5 else max(0, 1 - (t - 0.5) / 0.5)
        up = min(1, t / 0.35) if t < 0.35 else max(0, 1 - (t - 0.35) / 0.12) if t < 0.47 else 0
        strike = 0 if t < 0.35 else min(1, (t - 0.35) / 0.12) * max(0, 1 - (t - 0.6) / 0.4) if t > 0.6 else min(1, (t - 0.35) / 0.12)
        if body:
            body.matrix = Matrix.Translation((0, legs_h * 0.06 * k, -legs_h * 0.08 * k)) @ body.matrix
            bpy.context.view_layer.update()
        for name, angle in (('BackLeg.L', -18 * k), ('BackLeg.R', -18 * k), ('BackUpperLeg.L', 30 * k), ('BackUpperLeg.R', 30 * k),
                            ('BackLowerLeg.L', -25 * k), ('BackLowerLeg.R', -25 * k), ('FrontUpperLeg.L', 12 * k), ('FrontLowerLeg.L', 20 * k),
                            ('FrontUpperLeg.R', -140 * up - 40 * strike), ('FrontLowerLeg.R', 70 * up - 30 * strike),
                            ('Neck1', -12 * k), ('Head', 18 * k)):
            if name in pb:
                turn(name, angle)
        for b in order:
            b.keyframe_insert('rotation_quaternion', frame=f)
            b.keyframe_insert('location', frame=f)
        continue
    for (kind, side), chain in CHAINS.items():
        a = (t + PHASE[(kind, side)]) * math.tau
        # Forward (negative) while carried, back (positive) while bearing.
        swing = SWING[kind] * math.cos(a)
        carried = max(0.0, math.sin(a))
        for name, bend in zip(chain, BEND[kind]):
            angle = (swing if name == chain[0] else 0) + bend * carried
            if name in pb:
                turn(name, angle)
    # The neck against the bob, so the head stays steadier; the spine a touch.
    if GAIT == 'gallop':
        # The back gathers as the hind legs come under, and stretches as they push off.
        for name, k in (('Torso', 10.0), ('Torso2', 8.0), ('Torso3', 6.0), ('Neck1', -8.0), ('Head', 10.0)):
            if name in pb:
                turn(name, k * math.sin(t * math.tau))
    else:
        for name, k in ((('Neck1', 1.5), ('Head', -2.0), ('Torso2', 1.0)) if STILL else (('Neck1', -2.0), ('Head', 3.0), ('Torso2', 1.5))):
            if name in pb:
                turn(name, k * math.sin(t * math.tau * (1 if STILL else 2)))
    for b in order:
        b.keyframe_insert('rotation_quaternion', frame=f)
        b.keyframe_insert('location', frame=f)
act.frame_range = (0, FRAMES - 1)
act.use_fake_user = True
# A loop: its last key the same as its first.
bpy.ops.export_scene.gltf(filepath=args[1], export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
print('WROTE', args[1], NAME, FRAMES)
