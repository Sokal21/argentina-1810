"""Bones for the chonchón's wings, and a bat's flapping carried onto them.

    Blender -b --python tools/blender/rig_wings.py -- CHONCHON.glb BAT.fbx OUT.glb [--name vuelo]

The model is Tripo's, one mesh and no rig (`prepare_model.py`: one unit tall, facing +Z in glTF,
-Y here). It is given a head bone, which carries the head and its hair, and a chain of four
bones down the leading edge of each wing (shoulder, arm, forearm out to the claw on top, and the
finger from the claw down to the wing's outer tip). The wing's weights are by nearness to those
bones; the head and hair are wholly the head's.

The bat (a low poly bat from Maya, its wings a chain of four: shoulder, wing, joint19/20,
joint21/22) faces -Y with its right at -X, as the chonchón. It is not its turns that are carried
over but ways, as in quadruped_retarget.py: for each frame, each stretch of the bat's wing is
compared with where it lies at a frame of reference, the one whose wings lie most as the
chonchón's are drawn, and the chonchón's matching bone is turned from its rest by that much. So
the chonchón keeps the look it was drawn with at that point of the stroke. The bat's body rises
and falls as it flaps: so does the head, by the same share of the wings' length.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
MODEL, BAT, OUT = args[:3]
opts = dict(zip(args[3::2], args[4::2]))
NAME = opts.get('--name', 'vuelo')
FPS = 24

# The chonchón's right wing (-X), along its leading edge, measured on the model: where it leaves
# the head behind the ear, the elbow, the claw on top, and the outer tip the finger runs down to.
# The left is the same mirrored.
EDGE = [Vector(p) for p in [(-0.125, 0.03, 0.70), (-0.155, 0.02, 0.80), (-0.17, 0.0, 0.90), (-0.178, -0.03, 0.995), (-0.38, 0.05, 0.57)]]
HEAD = (Vector((0, 0, 0.35)), Vector((0, 0, 0.95)))
# Each side's chain on the bat: its bones' heads, in order, and the last bone's tail.
BAT_CHAINS = {
    'R': ['rechterSchouder', 'rechterVleugel', 'joint19', 'joint21'],
    'L': ['linkerSchouder', 'linkerVleugel', 'joint20', 'joint22'],
}
# Inside this, wholly the head; out past WING, wholly the wing; between, shared. Below LOW, hair.
INNER, WING, LOW = 0.125, 0.17, 0.22
# The hair's colours are all darker than this (of 1); the wings' violets are lighter, but their
# outlines and ribs are as dark as the hair. So hair is what is that dark where the hair hangs:
# under the head (below HANG) and near the middle (within REACH).
HAIR, HANG, REACH = 0.15, 0.6, 0.24


def side(p: Vector, s: str) -> Vector:
    return Vector((p.x if s == 'R' else -p.x, p.y, p.z))


# The chonchón, and its rig.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=MODEL)
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
held = mesh.matrix_world.copy()
mesh.parent = None
mesh.matrix_world = held
for o in list(bpy.data.objects):
    if o is not mesh: bpy.data.objects.remove(o)

rig = bpy.data.objects.new('chonchon', bpy.data.armatures.new('chonchon'))
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
head = rig.data.edit_bones.new('cabeza')
head.head, head.tail = HEAD
for s in 'RL':
    parent = head
    for i in range(4):
        b = rig.data.edit_bones.new(f'ala_{s}_{i}')
        b.head, b.tail = side(EDGE[i], s), side(EDGE[i + 1], s)
        b.parent = parent
        b.use_connect = i > 0
        parent = b
bpy.ops.object.mode_set(mode='OBJECT')


def nearness(p: Vector, a: Vector, b: Vector) -> float:
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


# The hair, black where the wings are violet, read off the texture: some of it falls behind the
# wings, and would go with them.
image = next(n.image for n in mesh.active_material.node_tree.nodes if n.type == 'TEX_IMAGE')
w, h = image.size
pixels = image.pixels[:]
uv = mesh.data.uv_layers.active.data
dark = {}
for loop in mesh.data.loops:
    u, t = uv[loop.index].uv
    i = (min(h - 1, int(t % 1 * h)) * w + min(w - 1, int(u % 1 * w))) * 4
    dark.setdefault(loop.vertex_index, []).append(max(pixels[i:i + 3]) < HAIR)
hair = {v for v, ds in dark.items() if sum(ds) > len(ds) / 2
        and (p := mesh.matrix_world @ mesh.data.vertices[v].co).z < HANG and abs(p.x) < REACH}
print('HAIR', len(hair), 'of', len(mesh.data.vertices))

# The weights.
groups = {n: mesh.vertex_groups.new(name=n) for n in ['cabeza'] + [f'ala_{s}_{i}' for s in 'RL' for i in range(4)]}
for v in mesh.data.vertices:
    p = mesh.matrix_world @ v.co
    wing = 0.0 if p.z < LOW or v.index in hair else min(1.0, max(0.0, (abs(p.x) - INNER) / (WING - INNER)))
    if wing < 1: groups['cabeza'].add([v.index], 1 - wing, 'REPLACE')
    if wing <= 0: continue
    s = 'R' if p.x < 0 else 'L'
    near = [1 / max(nearness(p, side(EDGE[i], s), side(EDGE[i + 1], s)), 0.01) ** 2 for i in range(4)]
    for i, n in enumerate(near):
        groups[f'ala_{s}_{i}'].add([v.index], wing * n / sum(near), 'REPLACE')
mesh.parent = rig
mod = mesh.modifiers.new('rig', 'ARMATURE')
mod.object = rig

# The bat, its stretches' ways in every frame.
bpy.ops.import_scene.fbx(filepath=BAT)
bat = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o is not rig)
scene = bpy.context.scene
action = next(a for a in bpy.data.actions if a.name.startswith('Armature'))
first, last = int(action.frame_range[0]), int(action.frame_range[1])


def bat_points(s: str) -> list[Vector]:
    pose = bat.pose.bones
    names = BAT_CHAINS[s]
    return [bat.matrix_world @ pose[n].head for n in names] + [bat.matrix_world @ pose[names[-1]].tail]


ways, rise = {}, {}
for f in range(first, last + 1):
    scene.frame_set(f)
    ways[f] = {s: [(q[i + 1] - q[i]).normalized() for i in range(4)] for s in 'RL' for q in [bat_points(s)]}
    rise[f] = (bat.matrix_world @ bat.pose.bones['hip'].head).z
bat_span = sum((bat_points('R')[i + 1] - bat_points('R')[i]).length for i in range(4))

# One flap: the frame after the first that comes back nearest to it.
def apart(f: int, g: int) -> float:
    return sum((ways[f][s][i] - ways[g][s][i]).length for s in 'RL' for i in range(4))


period = min(range(first + 8, last + 1), key=lambda g: apart(first, g)) - first
# The frame of reference: the one whose wing, shoulder to claw, lies most as the chonchón's.
drawn = (EDGE[3] - EDGE[0]).normalized()
reach = {f: (sum((ways[f]['R'][i] for i in range(3)), Vector())).normalized() for f in range(first, first + period)}
ref = max(reach, key=lambda f: reach[f].dot(drawn))
print('FLAP', period, 'frames from', first, '; reference frame', ref)

# The chonchón's bones turned, frame by frame.
for o in list(bpy.data.objects):
    if o is not rig and o is not mesh: bpy.data.objects.remove(o)
span = sum((EDGE[i + 1] - EDGE[i]).length for i in range(4))
rig.animation_data_create()
rig.animation_data.action = bpy.data.actions.new(NAME)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
for k, f in enumerate(range(first, first + period + 1)):
    scene.frame_set(k)
    cab = rig.pose.bones['cabeza']
    cab.location = Vector((0, (rise[f] - rise[ref]) / bat_span * span, 0))
    cab.keyframe_insert('location', frame=k)
    bpy.context.view_layer.update()
    for s in 'RL':
        for i in range(4):
            pb = rig.pose.bones[f'ala_{s}_{i}']
            turn = ways[ref][s][i].rotation_difference(ways[f][s][i]).to_matrix().to_4x4()
            at = rig.pose.bones[f'ala_{s}_{i - 1}'].tail if i else rest[pb.name].translation + cab.location.y * Vector((0, 0, 1))
            pb.matrix = Matrix.Translation(at) @ turn @ Matrix.Translation(-rest[pb.name].translation) @ rest[pb.name]
            bpy.context.view_layer.update()
            pb.keyframe_insert('rotation_quaternion', frame=k)
            if i == 0: pb.keyframe_insert('location', frame=k)
bpy.ops.object.mode_set(mode='OBJECT')
# Only the flap goes out: the bat's own clips stay behind.
for a in list(bpy.data.actions):
    if a.name != NAME: bpy.data.actions.remove(a)
print('SKIN', len(mesh.vertex_groups), sum(len(v.groups) for v in mesh.data.vertices), [m.type for m in mesh.modifiers], mesh.parent)
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 0, period
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_force_sampling=True)
print('WROTE', OUT, NAME, period, 'frames')
