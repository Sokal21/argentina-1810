"""One of Quaternius's animated animals (CC0, quaternius.com: the Ultimate Animated Animal Pack's FBX)
made ready for the 3D game: its colours changed, material by material (it has no texture, a colour
each: the bull is black, `Main`, with a lighter `Main_Light`), turned to look along glTF's +Z by where
its head is, its feet at the origin and one unit tall, every clip kept by its own name.

    Blender -b --python tools/blender/quaternius.py -- IN.fbx OUT.glb [--colours Main=#8a4a26,Main_Light=#e8e0d0]
        [--white Head,FrontLowerLeg,BackLowerLeg --white-colour #e6dccb --belly yes] [--horns 3]

To make a draught ox of the bull: `--white` gives the faces those bones hold (most of each face's
weight, only where its material is `Main`) a white of their own, and `--belly yes` its underside too
(faces of the torso looking down): the 2D drawing's white face, socks and belly. `--horns` draws its
horns out from their roots so many times as long, tips raised a little: a bull's short horns, an ox's long.

The game's `model()` (src/three/figure.ts) takes a material's colour where it has no texture.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[0], args[1]
opts = dict(zip(args[2::2], args[3::2]))
colours = dict(pair.split('=') for pair in opts.get('--colours', '').split(',') if pair)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bodies = [o for o in bpy.data.objects if o.type == 'MESH']

for material in bpy.data.materials:
    if material.name not in colours:
        continue
    hexa = colours[material.name].lstrip('#')
    srgb = [int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # Blender's colours are linear.
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1]
    material.diffuse_color = linear
    node = material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
    if node:
        node.inputs['Base Color'].default_value = linear

# Patches of white: on the faces those bones hold, and its belly.
white_bones = [b for b in opts.get('--white', '').split(',') if b]
if white_bones or opts.get('--belly') == 'yes':
    hexa = opts.get('--white-colour', '#e6dccb').lstrip('#')
    srgb = [int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    white = bpy.data.materials.new('White')
    white.diffuse_color = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1]
    for body in bodies:
        mesh, groups = body.data, body.vertex_groups
        main = next((i for i, m in enumerate(mesh.materials) if m and m.name == 'Main'), None)
        if main is None:
            continue
        mesh.materials.append(white)
        index = len(mesh.materials) - 1
        torso = {g.index for g in groups if g.name.startswith('Torso')}
        def holder(v):
            best = max(v.groups, key=lambda g: g.weight, default=None)
            return groups[best.group].name if best else ''
        for face in mesh.polygons:
            if face.material_index != main:
                continue
            owners = [holder(mesh.vertices[i]) for i in face.vertices]
            held = any(sum(1 for o in owners if o.startswith(b)) * 2 > len(owners) for b in white_bones)
            belly = opts.get('--belly') == 'yes' and face.normal.z < -0.55 and any(g.group in torso for i in face.vertices for g in mesh.vertices[i].groups)
            if held or belly:
                face.material_index = index

# Longer horns: each drawn out from its root, along its own way out, tips raised.
if '--horns' in opts:
    longer = float(opts['--horns'])
    for body in bodies:
        mesh = body.data
        horn = next((i for i, m in enumerate(mesh.materials) if m and m.name == 'Horns'), None)
        if horn is None:
            continue
        verts = {i for f in mesh.polygons if f.material_index == horn for i in f.vertices}
        for side in (-1, 1):
            mine = [i for i in verts if mesh.vertices[i].co.x * side > 0]
            if not mine:
                continue
            root = min(abs(mesh.vertices[i].co.x) for i in mine)
            for i in mine:
                co = mesh.vertices[i].co
                out = abs(co.x) - root
                co.x = side * (root + out * longer)
                co.z += out * (longer - 1) * 0.35
        mesh.update()

# Each clip by its own name: Quaternius's come as "AnimalArmature|AnimalArmature|Walk". Only its
# bones' keys kept: each also keys the whole armature's place, turn and size (in the FBX's own units),
# which undid the turning and sizing below and stood the bull a hundred times too big.
for action in bpy.data.actions:
    action.name = action.name.split('|')[-1]
    action.use_fake_user = True
    bags = [bag for layer in action.layers for strip in layer.strips for bag in strip.channelbags]
    for bag in bags:
        for curve in [c for c in bag.fcurves if not c.data_path.startswith('pose.bones')]:
            bag.fcurves.remove(curve)
if armature.animation_data:
    armature.animation_data.action = None
for bone in armature.pose.bones:
    bone.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()

# Turned so its head is toward glTF's +Z (Blender's -Y), feet at the origin, one unit tall.
head = armature.matrix_world @ armature.data.bones['Head'].head_local
body = armature.matrix_world @ armature.data.bones['Body'].head_local
way = Vector((head.x - body.x, head.y - body.y))
turn = math.atan2(-1, 0) - math.atan2(way.y, way.x)
depsgraph = bpy.context.evaluated_depsgraph_get()
points = [o.matrix_world @ v.co for o in bodies for v in o.evaluated_get(depsgraph).to_mesh().vertices]
low = Vector([min(p[i] for p in points) for i in range(3)])
high = Vector([max(p[i] for p in points) for i in range(3)])
tall = high.z - low.z
centre = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
armature.matrix_world = Matrix.Rotation(turn, 4, 'Z') @ Matrix.Scale(1 / tall, 4) @ Matrix.Translation(-centre) @ armature.matrix_world
bpy.context.view_layer.update()

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True)
print('WROTE', dst, 'clips', [a.name for a in bpy.data.actions], f'{tall:.2f} tall before')
