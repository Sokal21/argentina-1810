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


def held_at(armature: bpy.types.Object, bone: str) -> Vector:
    """Where in a closed fist a thing is held, as the fist is posed now: across the palm, a little way
    in from the wrist (where the sabre's grip and the halberd's shaft go), from the open hand's measure;
    in the armature's space."""
    wrist, way, length, palm = OPEN_HANDS[(armature.name, bone)]
    rest = armature.matrix_world.inverted() @ (wrist + way * length * 0.42 + palm * length * 0.18)
    pb = armature.pose.bones[bone]
    # In the armature's own space, as its bones' matrices are.
    return pb.matrix @ pb.bone.matrix_local.inverted() @ rest


def fist(armature: bpy.types.Object, bone: str = 'R_Hand') -> None:
    """Closes a hand's mesh into a fist, in the rest pose: the rig has no finger bones, so the
    fingers are bent toward the palm in the mesh itself, at the knuckles and again halfway down
    them, a vertex moving as much as the hand bone holds it. Once: a hand holding two things (the
    halberd standing and the halberd swung) is closed only the once."""
    if armature.get(f'fist {bone}'):
        return
    armature[f'fist {bone}'] = True
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


def sabre(armature: bpy.types.Object, bone: str = 'R_Hand', out: str = 'thumb') -> bpy.types.Object:
    """A light cavalry sabre, slightly curved, its blade 0.3 long, held in a fist by the hand bone:
    in the rest pose the blade runs forward from the hand and a little down. `out`: the side of the
    fist the blade leaves by, the thumb's, or the little finger's for a capture whose hand holds a
    knife point down (Mixamo's Stabbing, the captain's thrust)."""
    parts = [curved_blade()]
    parts.append(box('guarda', (0.012, 0.01, 0.05), (0.024, 0, -0.012), BRASS, 'bronce'))
    parts.append(box('puño', (0.04, 0.012, 0.014), (0, 0, 0), GRIP, 'puño'))
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    blade = bpy.context.active_object
    # Held by the little finger's side it is another of his, shown only while he thrusts.
    blade.name = 'sable' if out == 'thumb' else 'sable_estocada'

    # The hand closed round it, and the grip inside the fist: across the palm, a little way in
    # from the wrist, the blade out past the thumb along the way the fist faces.
    wrist, way, length, palm, _, _ = hand(armature, bone)
    fist(armature, bone)
    grip = wrist + way * length * 0.42 + palm * length * 0.18
    across = way.cross(palm).normalized()      # the way out of the fist past the thumb
    forward = (across if across.x > 0 else -across) * (1 if out == 'thumb' else -1)
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


def pistol(armature: bpy.types.Object, bone: str = 'R_Hand') -> bpy.types.Object:
    """An officer's flintlock pistol, its barrel 0.14 long, held in a fist by the hand bone: the barrel
    along the hand (the way the open fingers point) over the thumb, its butt down through the fist.
    Its length runs along its +X, from the grip in the fist (0) to the muzzle (PISTOL_MUZZLE), its
    top along +Z, so it is aimed as the musket is (the game finds it by its name, `pistola`)."""
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.006, depth=0.15, location=(0.055, 0, 0.032), rotation=(0, math.pi / 2, 0))
    barrel = bpy.context.active_object
    barrel.name = 'cano_pistola'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    barrel.data.materials.append(material('hierro', IRON))
    parts.append(barrel)
    parts.append(box('caja_pistola', (0.12, 0.014, 0.014), (0.035, 0, 0.022), WOOD, 'madera'))
    parts.append(box('llave_pistola', (0.026, 0.018, 0.016), (0.0, 0, 0.03), IRON, 'hierro'))
    # The butt, down through the fist and a little back, capped in brass.
    parts.append(box('culata_pistola', (0.024, 0.016, 0.07), (-0.008, 0, -0.004), WOOD, 'madera', turn=-0.3))
    parts.append(box('casquillo', (0.03, 0.02, 0.012), (-0.02, 0, -0.04), BRASS, 'bronce', turn=-0.3))
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    gun = bpy.context.active_object
    gun.name = 'pistola'
    wrist, way, length, palm, _, _ = hand(armature, bone)
    fist(armature, bone)
    grip = wrist + way * length * 0.42 + palm * length * 0.18
    across = way.cross(palm).normalized()
    thumb = across if across.x > 0 else -across
    gun.matrix_world = Matrix.Translation(grip) @ Matrix((way, thumb.cross(way), thumb)).transposed().to_4x4()
    world = gun.matrix_world.copy()
    gun.parent = armature
    gun.parent_type = 'BONE'
    gun.parent_bone = bone
    gun.matrix_world = world
    return gun


# How far along a pistol its muzzle is, and how high over its middle line (pistol's own units).
PISTOL_MUZZLE = (0.13, 0.032)


# In Blender's linear colour: a dark walnut stock, a blackened barrel.
WOOD, IRON = (0.16, 0.075, 0.03, 1), (0.08, 0.085, 0.09, 1)
STEEL = (0.42, 0.44, 0.47, 1)
# Whether the muskets made from here on have a bayonet fixed, and how long its blade is (about 45 cm).
BAYONET = {'fixed': False, 'long': 0.18}


def bayonet(armature: bpy.types.Object) -> None:
    """Fixes a bayonet on every musket made after it: put before the muskets among what is carried."""
    BAYONET['fixed'] = True


def musket(armature: bpy.types.Object, bone: str = 'Spine02') -> bpy.types.Object:
    """A musket of plain shapes, 0.62 long (about a metre and a half), slung across his back by the
    chest's bone: from behind his right shoulder, butt up, down to his left hip, muzzle down (where
    his hand takes it by the stock, over his shoulder; muzzle up, he took it by the barrel).
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
    # A bayonet fixed (the frontier soldier's): a socket round the muzzle and a long three-edged blade
    # past it, a little under and beside the barrel, as one is worn.
    if BAYONET['fixed']:
        parts.append(box('cubo', (0.035, 0.02, 0.02), (length - 0.01, 0.006, 0.012), STEEL, 'acero'))
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.007, radius2=0.0008, depth=BAYONET['long'],
                                        location=(length + BAYONET['long'] / 2, 0.008, 0.008), rotation=(0, math.pi / 2, 0))
        blade = bpy.context.active_object
        blade.name = 'bayoneta'
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        blade.data.materials.append(material('acero', STEEL))
        parts.append(blade)
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
    butt = chest + Vector((-0.075, -0.17, 0.33))
    muzzle = chest + Vector((-0.075, 0.13, -0.2))
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


def musket_carried(armature: bpy.types.Object, action: str, spans: str) -> None:
    """Moves the musket in his hand (musket_in_hand, made first) through a clip in which he takes it
    from his back or puts it back there, so that it never jumps from one place to the other: the
    game shows it all through the clip and hides the one on his back.

    `spans` says where it is, in the clip's frames: 'back.0.18+barrel.18.36+stock.45.53' is on his
    back until 18 (where the one on his back is), then in his hand as it was when he took it until
    36, then held by the stock as he aims from 45; between spans it slides through his hand. A
    barrel span takes its grip from the back span beside it.

    The musket is hung on a bone of its own, 'Mosquete', under the right hand where the hand
    stands at rest; keyed only in these clips, it stays at rest (held by the stock) in the others."""
    gun, back = bpy.data.objects['mosquete_mano'], bpy.data.objects['mosquete']
    armature.animation_data_create()
    bones = armature.data
    if 'Mosquete' not in bones.bones:
        armature.animation_data.action = None
        for pb in armature.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        world = gun.matrix_world.copy()
        bpy.context.view_layer.objects.active = armature
        bpy.ops.object.mode_set(mode='EDIT')
        hand = bones.edit_bones['R_Hand']
        bone = bones.edit_bones.new('Mosquete')
        bone.head, bone.tail, bone.roll = hand.head.copy(), hand.tail.copy(), hand.roll
        bone.parent = hand
        bone.use_deform = False
        bpy.ops.object.mode_set(mode='OBJECT')
        armature.pose.bones['Mosquete'].rotation_mode = 'QUATERNION'
        gun.parent = armature
        gun.parent_type = 'BONE'
        gun.parent_bone = 'Mosquete'
        gun.matrix_world = world
        bpy.context.view_layer.update()
    rest = armature.data.bones['Mosquete'].matrix_local
    # The musket as the bone holds it at rest: by the stock.
    held = rest.inverted() @ armature.matrix_world.inverted() @ gun.matrix_world

    act = bpy.data.actions[action]
    armature.animation_data.action = act
    slots = getattr(act, 'slots', None)
    if slots:
        armature.animation_data.action_slot = slots[0]
    hand, bone = armature.pose.bones['R_Hand'], armature.pose.bones['Mosquete']

    def at(frame: int) -> Matrix:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        return armature.matrix_world @ hand.matrix

    def on_back(frame: int) -> Matrix:
        """Where the musket on his back is, from his hand, at a frame."""
        h = at(frame)
        return h.inverted() @ back.matrix_world @ held.inverted()

    parts = [(kind, int(a), int(b)) for kind, a, b in (s.split('.') for s in spans.split('+'))]
    # A grip by the barrel is the grip he took it with from his back, or will hang it there with.
    grips = {}
    for i, (kind, a, b) in enumerate(parts):
        if kind == 'barrel':
            before = parts[i - 1] if i > 0 and parts[i - 1][0] == 'back' else None
            grips[i] = on_back(before[2]) if before else on_back(parts[i + 1][1])
    by_stock = Matrix.Identity(4)
    chest = armature.pose.bones['Spine02']
    chest_rest = armature.data.bones['Spine02'].matrix_local.to_3x3()
    # Held up by the stock, turned as his chest is: muzzle to the sky ('up'), or laid back over his
    # shoulder ('behind'). He passes it through these between his hands and his back: turned the
    # short way from one to the other, its barrel went through him.
    WAYS = {'up': (Vector((0.15, -0.25, 1)), Vector((1, 0, 0))),
            'behind': (Vector((-1, -0.35, 0.6)), Vector((0, 0, 1)))}

    def standing(kind: str, frame: int) -> Matrix:
        h = at(frame)
        turned = (armature.matrix_world.to_3x3() @ chest.matrix.to_3x3() @ chest_rest.inverted())
        along, top = (turned @ w.normalized() for w in WAYS[kind])
        side = top.cross(along).normalized()
        top = along.cross(side).normalized()
        grip = h.to_translation()
        butt = grip - along * HELD_AT
        world = Matrix.Translation(butt) @ Matrix((along, side, top)).transposed().to_4x4()
        return h.inverted() @ world @ held.inverted()

    def offset(i: int, frame: int) -> Matrix:
        kind = parts[i][0]
        if kind in WAYS:
            return standing(kind, frame)
        return on_back(frame) if kind == 'back' else grips[i] if kind == 'barrel' else by_stock

    start, end = map(int, act.frame_range)
    was = None
    for frame in range(start, end + 1):
        i = next((i for i, (_, a, b) in enumerate(parts) if a <= frame <= b), None)
        if i is not None:
            o = offset(i, frame)
        else:
            # Between two spans: slid from the one to the other, eased.
            j = next(j for j, (_, a, _) in enumerate(parts) if a > frame)
            a, b = parts[j - 1][2], parts[j][1]
            u = (1 - math.cos(math.pi * (frame - a) / (b - a))) / 2
            o1, o2 = offset(j - 1, a), offset(j, b)
            l1, q1, _ = o1.decompose()
            l2, q2, _ = o2.decompose()
            if q1.dot(q2) < 0:
                q2 = -q2
            o = Matrix.Translation(l1.lerp(l2, u)) @ q1.slerp(q2, u).to_matrix().to_4x4()
        h = at(frame)
        # The bone set so that the musket it holds lies at the hand's offset `o` from the hand
        # (offsets are the bone's own: at rest it lies as the hand does).
        bone.matrix = armature.matrix_world.inverted() @ h @ o
        bpy.context.view_layer.update()
        q = bone.rotation_quaternion
        if was is not None and q.dot(was) < 0:
            bone.rotation_quaternion = -q
        was = bone.rotation_quaternion.copy()
        bone.keyframe_insert('rotation_quaternion', frame=frame)
        bone.keyframe_insert('location', frame=frame)
    armature.animation_data.action = None
    for pb in armature.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


# A black iron ball and a fuse of tow: dark grey against his coat, a pale fuse to catch the eye.
BALL, FUSE = (0.035, 0.035, 0.04, 1), (0.8, 0.62, 0.35, 1)


def grenade(armature: bpy.types.Object, bone: str = 'R_Hand') -> bpy.types.Object:
    """A grenade held in the right fist, its fuse up out of it: a ball 0.05 across (about 12 cm,
    a little big, to be seen at 80 pixels). The game shows it from when he takes it until it
    leaves his hand."""
    radius = 0.025
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=radius)
    ball = bpy.context.active_object
    ball.data.materials.append(material('hierro_granada', BALL))
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.005, depth=0.02, location=(0, 0, radius + 0.008))
    fuse = bpy.context.active_object
    fuse.data.materials.append(material('mecha', FUSE))
    for p in (ball, fuse):
        p.select_set(True)
    bpy.context.view_layer.objects.active = ball
    bpy.ops.object.join()
    bomb = bpy.context.active_object
    bomb.name = 'granada'
    # In the palm of the closed fist, a little out of it toward the fingers' side, fuse up.
    wrist, way, length, palm, _, _ = hand(armature, bone)
    bomb.matrix_world = Matrix.Translation(wrist + way * length * 0.55 + palm * (length * 0.2 + radius * 0.6))
    world = bomb.matrix_world.copy()
    bomb.parent = armature
    bomb.parent_type = 'BONE'
    bomb.parent_bone = bone
    bomb.matrix_world = world
    return bomb


def halberd_in_hands(armature: bpy.types.Object, bone: str = 'R_Hand') -> bpy.types.Object:
    """The halberd as he swings it in both hands: the same, gripped by the right hand a share SWUNG up
    from its butt. Its lie in the hand matters little: the blow's script turns the hand every frame
    to lay it along the line between his two hands (tools/blender/anims/golpe_pesado.py)."""
    pole = halberd(armature, held=SWUNG, name='alabarda_mano')
    # His left hand closed too: it holds the shaft below the right.
    if (armature.name, 'L_Hand') not in OPEN_HANDS:
        OPEN_HANDS[(armature.name, 'L_Hand')] = hand(armature, 'L_Hand')[:4]
    fist(armature, 'L_Hand')
    pole.parent = None
    key = (armature.name, bone)
    wrist, way, hand_len, palm = OPEN_HANDS[key]
    grip = wrist + way * hand_len * 0.42 + palm * hand_len * 0.18
    # Its head out the back of his hand (away from the palm), its shaft down through the fist: of the
    # hand's ways, the one that, as a captured axe blow turns his wrist, goes up, back over his
    # shoulder and down before him (measured; head past the thumb, it swung down behind him).
    forward = -palm
    breadth = (way - forward * way.dot(forward)).normalized()
    side = -breadth                                  # the blade's edge the way his fingers point
    up = forward.cross(side).normalized()
    length = (pole.dimensions.x if pole.dimensions.x > 0.1 else 1.15)
    frame = Matrix((forward, side, up)).transposed().to_4x4()
    pole.matrix_world = Matrix.Translation(grip) @ frame @ Matrix.Translation((-length * SWUNG, 0, 0))
    world = pole.matrix_world.copy()
    pole.parent = armature
    pole.parent_type = 'BONE'
    pole.parent_bone = bone
    pole.matrix_world = world
    return pole


# Where up the halberd's shaft the right hand holds it to swing it, as a share of its length.
SWUNG = 0.22
# Each hand as it was open, measured the first time something is set in it.
OPEN_HANDS: dict = {}


def halberd(armature: bpy.types.Object, bone: str = 'R_Hand', action: str = 'reposo_mixamo', frame: int = 0,
            held: float = None, name: str = 'alabarda') -> bpy.types.Object:
    """The sergeant's halberd: a wooden shaft a little taller than he is, and at its top a spike, an
    axe blade turned out from him and a hook behind, of steel over an iron socket. Held in his right
    fist, upright, its butt by his foot, as he stands in `action` at `frame` (standing about, the way
    the 2D drawing has it); the hand bone keeps it there through every animation."""
    body = body_of(armature)
    heights = [(body.matrix_world @ v.co).z for v in body.data.vertices]
    floor, tall = min(heights), max(heights) - min(heights)
    length = tall * 1.15
    shaft_r = tall * 0.011
    # Built lying along +X from its butt at the origin (as the sabre and the musket, so that it can
    # be aimed like them), the blade toward -Y (his right, outward), its flats facing up and down.
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=shaft_r, depth=length * 0.94, location=(length * 0.47, 0, 0), rotation=(0, math.pi / 2, 0))
    shaft = bpy.context.active_object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    shaft.data.materials.append(material('madera', WOOD))
    parts = [shaft]
    parts.append(box('cubo', (length * 0.08, shaft_r * 2.6, shaft_r * 2.6), (length * 0.9, 0, 0), IRON, 'hierro'))
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=shaft_r * 1.6, radius2=0, depth=length * 0.13, location=(length * 1.0, 0, 0), rotation=(0, math.pi / 2, 0))
    spike = bpy.context.active_object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    spike.data.materials.append(material('acero', STEEL))
    parts.append(spike)
    # The axe: broad and flat, out from the shaft toward his right; its edge a little longer.
    parts.append(box('hacha', (length * 0.08, length * 0.065, shaft_r * 1.2), (length * 0.9, -length * 0.045, 0), STEEL, 'acero'))
    parts.append(box('filo', (length * 0.11, length * 0.02, shaft_r * 1.2), (length * 0.895, -length * 0.085, 0), STEEL, 'acero'))
    # The hook behind it, toward his left.
    parts.append(box('gancho', (length * 0.02, length * 0.05, shaft_r * 1.2), (length * 0.91, length * 0.035, 0), STEEL, 'acero'))
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    pole = bpy.context.active_object
    pole.name = name
    # Its origin at its butt (the joined pieces kept the shaft's, half way along it).
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # The fist closed round it (in the rest pose, as the sabre's), and where the grip is in it:
    # measured on the open hand, once, so that a second thing held is set as the first was.
    key = (armature.name, bone)
    if key not in OPEN_HANDS:
        OPEN_HANDS[key] = hand(armature, bone)[:4]
    wrist, way, hand_len, palm = OPEN_HANDS[key]
    fist(armature, bone)
    grip_rest = wrist + way * hand_len * 0.42 + palm * hand_len * 0.18
    # Where that grip is as he stands about: the hand bone's rest frame to its posed one.
    before = armature.animation_data.action if armature.animation_data else None
    armature.animation_data_create()
    act = bpy.data.actions[action]
    armature.animation_data.action = act
    slots = getattr(act, 'slots', None)
    if slots:
        armature.animation_data.action_slot = slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    pb = armature.pose.bones[bone]
    posed = armature.matrix_world @ pb.matrix @ armature.data.bones[bone].matrix_local.inverted() @ armature.matrix_world.inverted()
    grip = posed @ grip_rest
    # Upright through the grip, its butt on the ground; the blade out to his right as he stands.
    # Its length (+X) turned up, its blade still toward his right: its butt by his foot, or (held
    # near its end) as far below his hand as that.
    butt = floor + tall * 0.005 if held is None else grip.z - length * held
    pole.matrix_world = Matrix.Translation(Vector((grip.x, grip.y, butt))) @ Matrix.Rotation(-math.pi / 2, 4, 'Y')
    world = pole.matrix_world.copy()
    pole.parent = armature
    pole.parent_type = 'BONE'
    pole.parent_bone = bone
    pole.matrix_world = world
    print('HALBERD', name, round(length, 3), 'long, held at', tuple(round(v, 3) for v in grip))
    armature.animation_data.action = before
    for p in armature.pose.bones:
        p.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    return pole


def musket_in_fists(armature: bpy.types.Object, bone: str = 'R_Hand', name: str = 'mosquete_mano') -> bpy.types.Object:
    """A musket held in both fists, its stock in the right a little way up from the butt: set by the
    rest pose alone (so whoever sets it again sets it the same), and laid every frame by the clip's
    script along the line from the right fist through the left (tools/blender/anims/tiro_arrodillado.py).
    The game shows it, and hides the one on his back, while he is down to shoot."""
    for side in ('R_Hand', 'L_Hand'):
        if (armature.name, side) not in OPEN_HANDS:
            OPEN_HANDS[(armature.name, side)] = hand(armature, side)[:4]
        fist(armature, side)
    gun = musket(armature)
    # Named apart where he also has one held in the right hand alone (the frontier soldier: aimed, and in both fists for his bayonet).
    gun.name = name
    gun.parent = None
    wrist, way, length, palm = OPEN_HANDS[(armature.name, bone)]
    grip = wrist + way * length * 0.42 + palm * length * 0.18
    along = way.cross(palm).normalized()
    up = palm.cross(along).normalized()
    gun.matrix_world = Matrix.Translation(grip - along * HELD_AT) @ Matrix((along, up.cross(along), up)).transposed().to_4x4()
    world = gun.matrix_world.copy()
    gun.parent = armature
    gun.parent_type = 'BONE'
    gun.parent_bone = bone
    gun.matrix_world = world
    return gun


def lay_in_fists(armature: bpy.types.Object, gun: bpy.types.Object, up: Vector = Vector((0, 0, 1))) -> None:
    """Lays a musket in the fists (musket_in_fists) as the arms stand now: along the line from the
    right fist through the left, its top towards `up`, by turning the right hand about its wrist.
    Called on every frame, before it is keyed."""
    hand_bone = armature.pose.bones['R_Hand']
    local = armature.matrix_world.inverted()
    for _ in range(4):
        right, left = held_at(armature, 'R_Hand'), held_at(armature, 'L_Hand')
        x = (left - right).normalized()
        z = (up - x * x.dot(up)).normalized()
        target = Matrix((x, z.cross(x), z)).transposed()
        now = (local.to_3x3() @ gun.matrix_world.to_3x3()).normalized()
        q = (target @ now.inverted()).to_quaternion()
        head = hand_bone.matrix.to_translation()
        hand_bone.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ hand_bone.matrix
        bpy.context.view_layer.update()


def _loaded(path: str, name: str) -> bpy.types.Object:
    """A model made ready by prepare_model.py, its meshes joined into one object, its turn and size applied."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    for o in new:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.parent = None
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    thing = bpy.context.active_object
    thing.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return thing


def _held(armature: bpy.types.Object, thing: bpy.types.Object, bone: str, frame: Matrix) -> bpy.types.Object:
    """Something set in a hand, its matrix in the world given, kept on the hand's bone."""
    thing.matrix_world = frame
    world = thing.matrix_world.copy()
    thing.parent = armature
    thing.parent_type = 'BONE'
    thing.parent_bone = bone
    thing.matrix_world = world
    return thing


# Inti's things, Tripo's from concepts (assets/machi/3d/objetos): how long the branch, how wide the drum,
# as shares of her height (her height is one unit here, as the rig is before prepare_rigged scales it).
CANELO = 'assets/machi/3d/objetos/rama.glb'
KULTRUN = 'assets/machi/3d/objetos/kultrun.glb'
CANELO_LONG, KULTRUN_WIDE = 0.34, 0.17


def canelo(armature: bpy.types.Object, bone: str = 'R_Hand') -> bpy.types.Object:
    """Inti's canelo branch in her fist, held by its thick end, its leafy tip out past her thumb (as the
    sabre's blade): laid along its own longest way, the end with fewer corners (no leaves) in the fist."""
    import os
    branch = _loaded(os.path.join(os.path.dirname(__file__), '..', '..', CANELO), 'rama')
    # Its own long way, from its corners (Tripo laid it slantwise in its box: the box's longest side
    # was not the branch, and its butt stood off the fist): the covariance's strongest way.
    verts = [v.co.copy() for v in branch.data.vertices]
    mid = sum(verts, Vector()) / len(verts)
    cov = [[sum((p[a] - mid[a]) * (p[b] - mid[b]) for p in verts) for b in range(3)] for a in range(3)]
    axis = Vector((1, 1, 1)).normalized()
    for _ in range(50):
        axis = Vector([sum(cov[a][b] * axis[b] for b in range(3)) for a in range(3)]).normalized()
    along = [(p - mid).dot(axis) for p in verts]
    lo, hi = min(along), max(along)
    span = hi - lo
    # The butt: the end with fewer corners (no leaves), and on it the corner furthest out.
    if sum(1 for a in along if a < lo + span * 0.2) > sum(1 for a in along if a > hi - span * 0.2):
        axis, along, lo, hi = -axis, [-a for a in along], -hi, -lo
    butt = verts[min(range(len(verts)), key=lambda n: along[n])]
    side = axis.orthogonal().normalized()
    other = axis.cross(side)
    k = CANELO_LONG / span
    # Its butt at the origin, its length along +X, as long as asked.
    for v in branch.data.vertices:
        d = v.co - butt
        v.co = Vector((d.dot(axis) * k, d.dot(side) * k, d.dot(other) * k))
    branch.data.update()
    wrist, way, length, palm, _, _ = hand(armature, bone)
    fist(armature, bone)
    grip = wrist + way * length * 0.42 + palm * length * 0.18
    across = way.cross(palm).normalized()
    forward = across if across.x > 0 else -across
    up = (way - forward * way.dot(forward)).normalized()
    # A little of its butt below the fist.
    frame = Matrix.Translation(grip - forward * CANELO_LONG * 0.08) @ Matrix((forward, up.cross(forward), up)).transposed().to_4x4()
    return _held(armature, branch, bone, frame)


def kultrun(armature: bpy.types.Object, bone: str = 'L_Hand') -> bpy.types.Object:
    """Inti's kultrún held in her hand by its rim, its back against her palm and its painted head out
    from her: its thinnest way (the drum's) along her palm's, its middle a half-width out from the hand."""
    import os
    drum = _loaded(os.path.join(os.path.dirname(__file__), '..', '..', KULTRUN), 'kultrun')
    verts = [v.co.copy() for v in drum.data.vertices]
    lo = Vector([min(p[i] for p in verts) for i in range(3)])
    hi = Vector([max(p[i] for p in verts) for i in range(3)])
    size = hi - lo
    thin = min(range(3), key=lambda i: size[i])
    wide = max(size[i] for i in range(3) if i != thin)
    k = KULTRUN_WIDE / wide
    mid = (lo + hi) / 2
    # Its middle at the origin, its head toward +Z (whichever end of its thin way is the flatter), as wide as asked.
    others = [i for i in range(3) if i != thin]
    for v in drum.data.vertices:
        d = v.co - mid
        v.co = Vector((d[others[0]] * k, d[others[1]] * k, d[thin] * k))
    drum.data.update()
    wrist, way, length, palm, _, _ = hand(armature, bone)
    fist(armature, bone)
    grip = wrist + way * length * 0.42 + palm * length * 0.18
    out = -palm
    side = way.cross(out).normalized()
    centre = grip + way * KULTRUN_WIDE * 0.45 + out * size[thin] * k * 0.5
    frame = Matrix.Translation(centre) @ Matrix((side, way, out)).transposed().to_4x4()
    return _held(armature, drum, bone, frame)


# How far up a musket from its butt the right fist holds it (the wrist of the stock).
HELD_AT = 0.13
