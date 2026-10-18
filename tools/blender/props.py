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


def curved_blade(length: float = 0.31, sections: int = 8) -> bpy.types.Object:
    """A blade along +X from just past the guard: its flat face upright, curving down toward the
    point and narrowing to it, as one smooth piece."""
    verts, faces = [], []
    for i in range(sections + 1):
        k = i / sections
        x = 0.03 + length * k
        mid = -0.035 * k * k
        # Broad and thick for a blade: in the game Cabral is ~80 pixels tall, and a true blade's
        # breadth is under a pixel, read as a broken line of dots that came and went.
        half = 0.016 * (1 - 0.6 * k)
        for y in (-0.006, 0.006):
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


def body_of(armature: bpy.types.Object) -> bpy.types.Object:
    return next(o for o in bpy.data.objects if o.type == 'MESH' and o.parent == armature and o.vertex_groups)


def hand(armature: bpy.types.Object, bone: str) -> tuple:
    """Where a hand is in the rest pose, from its own vertices: the wrist, the way the fingers
    point, how long it is, the way its palm faces (toward the body), and its vertices with how
    much the hand bone holds each."""
    body = body_of(armature)
    group = body.vertex_groups[bone].index
    held = []
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == group), 0)
        if w > 0.05:
            held.append((v, w))
    wrist = armature.matrix_world @ armature.data.bones[bone].head_local
    middle = sum((body.matrix_world @ v.co for v, w in held if w > 0.5), Vector()) / max(1, sum(1 for _, w in held if w > 0.5))
    way = (middle - wrist).normalized()
    length = max((body.matrix_world @ v.co - wrist).dot(way) for v, _ in held)
    # The palm faces the body: toward the middle line, across.
    inward = Vector((0, -1 if wrist.y > 0 else 1, 0))
    palm = (inward - way * inward.dot(way)).normalized()
    return wrist, way, length, palm, held, body


def fist(armature: bpy.types.Object, bone: str = 'R_Hand') -> None:
    """Closes a hand's mesh into a fist, in the rest pose: the rig has no finger bones, so the
    fingers are bent toward the palm in the mesh itself, at the knuckles and again halfway down
    them, a vertex moving as much as the hand bone holds it."""
    wrist, way, length, palm, held, body = hand(armature, bone)
    axis = way.cross(palm).normalized()   # turning the fingers about this brings them to the palm
    inverse = body.matrix_world.inverted()
    for joint, angle in ((0.72, 80), (0.45, 85)):
        pivot = wrist + way * length * joint
        turn = Matrix.Rotation(math.radians(angle), 4, axis)
        for v, w in held:
            p = body.matrix_world @ v.co
            along = (p - wrist).dot(way)
            if along <= length * joint:
                continue
            # Eased in just past the joint, so the skin folds rather than tears.
            k = min(1.0, (along - length * joint) / (length * 0.12)) * min(1.0, w * 1.5)
            bent = pivot + (turn @ (p - pivot))
            v.co = inverse @ p.lerp(bent, k)
    body.data.update()


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

    # The hand closed round it, and the grip inside the fist: across the palm, a little way in
    # from the wrist, the blade out past the thumb along the way the fist faces.
    wrist, way, length, palm, _, _ = hand(armature, bone)
    fist(armature, bone)
    grip = wrist + way * length * 0.42 + palm * length * 0.18
    across = way.cross(palm).normalized()      # the way out of the fist past the thumb
    forward = (across if across.x > 0 else -across)
    # The blade's breadth lies along the fingers, its edge toward the knuckles, as in a hammer grip.
    breadth = (way - forward * way.dot(forward)).normalized()
    frame = Matrix((forward, breadth.cross(forward), breadth)).transposed().to_4x4()
    blade.matrix_world = Matrix.Translation(grip) @ frame
    world = blade.matrix_world.copy()
    blade.parent = armature
    blade.parent_type = 'BONE'
    blade.parent_bone = bone
    blade.matrix_world = world
    return blade


# In Blender's linear colour: a dark walnut stock, a blackened barrel.
WOOD, IRON = (0.16, 0.075, 0.03, 1), (0.08, 0.085, 0.09, 1)


def musket(armature: bpy.types.Object, bone: str = 'Spine02') -> bpy.types.Object:
    """A musket of plain shapes, 0.62 long (about a metre and a half), slung across his back by the
    chest's bone: from behind his right shoulder, muzzle up, down to his left hip, butt down.
    Its length runs along its +X, from the butt (0) to the muzzle, so it can be aimed like the sabre."""
    parts = []
    length = 0.62
    # The stock: the butt, broad and flat, narrowing into the fore-end under the barrel.
    parts.append(box('culata', (0.13, 0.022, 0.05), (0.065, 0, -0.006), WOOD, 'madera'))
    parts.append(box('caja', (0.36, 0.018, 0.026), (0.3, 0, 0.004), WOOD, 'madera'))
    # The barrel, the length of it, on top; the lock by the wrist of the stock.
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0075, depth=length - 0.12, location=(0.12 + (length - 0.12) / 2, 0, 0.02), rotation=(0, math.pi / 2, 0))
    barrel = bpy.context.active_object
    barrel.name = 'cano'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    barrel.data.materials.append(material('hierro', IRON))
    parts.append(barrel)
    parts.append(box('llave', (0.04, 0.026, 0.02), (0.15, 0, 0.012), IRON, 'hierro'))
    # Brass bands round barrel and fore-end.
    for x in (0.3, 0.42):
        parts.append(box(f'abrazadera_{x}', (0.01, 0.024, 0.04), (x, 0, 0.01), BRASS, 'bronce'))
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    gun = bpy.context.active_object
    gun.name = 'mosquete'

    # Slung: on his back, a hand's breadth behind the chest's bone, slanting from the left hip up
    # past the right shoulder (the rig's +X is forward, +Y his left).
    pb = armature.pose.bones[bone]
    chest = armature.matrix_world @ pb.head
    butt = chest + Vector((-0.075, 0.13, -0.2))
    muzzle = chest + Vector((-0.075, -0.17, 0.33))
    along = (muzzle - butt).normalized()
    side = Vector((-1, 0, 0))                     # the stock's flat lies against his back
    up = along.cross(side).normalized()
    side = up.cross(along).normalized()
    gun.matrix_world = Matrix.Translation(butt) @ Matrix((along, side, up)).transposed().to_4x4()
    world = gun.matrix_world.copy()
    gun.parent = armature
    gun.parent_type = 'BONE'
    gun.parent_bone = bone
    gun.matrix_world = world
    return gun


def musket_in_hand(armature: bpy.types.Object, action: str = 'mosquete_apuntar', frame: int = 0) -> bpy.types.Object:
    """A second musket, held in the right hand: set along the line of the shot as the rig stands
    in `action` at `frame` (the aiming pose), its butt at the shoulder, and kept there by the hand.
    The game shows it, and hides the one on his back, while he has it up."""
    before = armature.animation_data.action if armature.animation_data else None
    armature.animation_data_create()
    act = bpy.data.actions[action]
    armature.animation_data.action = act
    # An action brought in from another file is bound to its own skeleton's slot; without binding
    # it to this one it is not played, and the musket was set by the rest pose, arms down.
    slots = getattr(act, 'slots', None)
    if slots:
        armature.animation_data.action_slot = slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    right = armature.matrix_world @ armature.pose.bones['R_Hand'].head
    print('HAND MUSKET from', action, 'right hand at', tuple(round(v, 3) for v in right))
    left = armature.matrix_world @ armature.pose.bones['L_Hand'].head
    along = (left - right).normalized()
    gun = musket(armature)
    gun.name = 'mosquete_mano'
    gun.parent = None
    # Level across, its top up: the stock against the shoulder, a hand's breadth behind the right hand.
    side = along.cross(Vector((0, 0, 1))).normalized()
    up = side.cross(along).normalized()
    butt = right - along * 0.12 + up * 0.012
    gun.matrix_world = Matrix.Translation(butt) @ Matrix((along, -side, up)).transposed().to_4x4()
    world = gun.matrix_world.copy()
    gun.parent = armature
    gun.parent_type = 'BONE'
    gun.parent_bone = 'R_Hand'
    gun.matrix_world = world
    armature.animation_data.action = before
    for pb in armature.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    return gun
