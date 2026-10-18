"""What a rig carries, made in Blender from plain shapes and held by a bone, so that every animation
moves it and it is exported with the model.

    from props import sabre
    sabre(armature)      # Cabral's sabre, in his right hand

Sizes are in the rig's units as Tripo gives it: Cabral is ~0.75 tall, so a metre is ~0.42.
Placed in the rig's own axes (+X forward, +Y his left, +Z up) in its rest pose.
"""
import math

import bpy
from mathutils import Matrix, Vector

STEEL, BRASS, GRIP = (0.78, 0.8, 0.82, 1), (0.69, 0.54, 0.23, 1), (0.23, 0.16, 0.12, 1)


def material(name: str, colour: tuple) -> bpy.types.Material:
    found = bpy.data.materials.get(name)
    if found:
        return found
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = colour
    bsdf.inputs['Roughness'].default_value = 1
    m.diffuse_color = colour
    # Drawn from both sides: a blade is thin enough to be seen edge on from either.
    m.use_backface_culling = False
    return m


def box(name: str, size: tuple, at: tuple, colour: tuple, mat: str, turn: float = 0) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    o.location = at
    o.rotation_euler = (0, turn, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.append(material(mat, colour))
    return o


def curved_blade(length: float = 0.30, sections: int = 8) -> bpy.types.Object:
    """A blade along +X from just past the guard: its flat face upright, curving down toward the
    point and narrowing to it, as one smooth piece."""
    verts, faces = [], []
    for i in range(sections + 1):
        k = i / sections
        x = 0.03 + length * k
        mid = -0.035 * k * k
        half = 0.007 * (1 - 0.7 * k)
        for y in (-0.002, 0.002):
            verts += [(x, y, mid - half), (x, y, mid + half)]
    for i in range(sections):
        a, b = i * 4, (i + 1) * 4
        # Two faces, two edges, each a quad from this section to the next.
        for p, q in ((0, 1), (2, 3), (0, 2), (1, 3)):
            faces.append((a + p, a + q, b + q, b + p))
    faces += [(0, 1, 3, 2), (sections * 4, sections * 4 + 2, sections * 4 + 3, sections * 4 + 1)]
    mesh = bpy.data.meshes.new('hoja')
    mesh.from_pydata(verts, [], faces)
    # Every face turned outward: one turned in is not drawn from the side it faces, and the blade
    # was seen through from his left.
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material('acero', STEEL))
    o = bpy.data.objects.new('hoja', mesh)
    bpy.context.scene.collection.objects.link(o)
    return o


def sabre(armature: bpy.types.Object, bone: str = 'R_Hand') -> bpy.types.Object:
    """A light cavalry sabre, slightly curved, its blade 0.3 long, held in a fist by the hand bone:
    in the rest pose the blade runs forward from the hand and a little down."""
    parts = [curved_blade()]
    parts.append(box('guarda', (0.012, 0.01, 0.05), (0.024, 0, -0.012), BRASS, 'bronce'))
    parts.append(box('puño', (0.04, 0.012, 0.014), (0, 0, 0), GRIP, 'puño'))
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    blade = bpy.context.active_object
    blade.name = 'sable'

    # Held: the grip in the hand's fist, the blade forward and 20° down, a little inward.
    pb = armature.pose.bones[bone]
    grip = armature.matrix_world @ (pb.head + (pb.tail - pb.head) * 0.6)
    aim = Matrix.Rotation(math.radians(20), 4, 'Y') @ Matrix.Rotation(math.radians(-8), 4, 'Z')
    blade.matrix_world = Matrix.Translation(grip) @ aim
    world = blade.matrix_world.copy()
    blade.parent = armature
    blade.parent_type = 'BONE'
    blade.parent_bone = bone
    blade.matrix_world = world
    return blade
