"""Cabral aiming the musket, posed from the game's mosquete_apuntar, on a round base, for 3D printing.
Only the figure is changed here, never the game's model: the hands are turned onto the musket, the
musket laid in them, and fingers wrapped round the wood, since the rig has no finger bones.

    blender -b --python build.py -- cabral_animado.glb OUTDIR HEIGHT_MM
"""
import bmesh, bpy, math, sys, os
import numpy as np
from mathutils import Vector, Matrix

src, out, height = sys.argv[-3], sys.argv[-2], float(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
rig = bpy.data.objects['Armature']
body = bpy.data.objects['tripo_node_1055043b-0dbc-4ca1-bd88-0bfe24cfdfa6']
gun = bpy.data.objects['mosquete_mano']
rig.animation_data_create()
act = bpy.data.actions['mosquete_apuntar']
rig.animation_data.action = act
if getattr(act, 'slots', None):
    rig.animation_data.action_slot = act.slots[0]
bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()

# Freeze the pose and let go of the action, so changes to the hands are not played over.
basis = {pb.name: pb.matrix_basis.copy() for pb in rig.pose.bones}
gun_was = gun.matrix_world.copy()
gun.parent = None
gun.matrix_world = gun_was
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.matrix_basis = basis[pb.name]
bpy.context.view_layer.update()

M = rig.matrix_world
M3 = M.to_3x3().normalized()
Z = Vector((0, 0, 1))


def world(v):
    return M @ v


def hand_points(side):
    """The hand's skin as it stands now, in world space, with the hand bone's frame."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(body.evaluated_get(dg), depsgraph=dg)
    me.transform(body.matrix_world)
    g = body.vertex_groups[side + '_Hand'].index
    pts = np.array([tuple(me.vertices[v.index].co) for v in body.data.vertices
                    for e in v.groups if e.group == g and e.weight > 0.6])
    bpy.data.meshes.remove(me)
    return pts


def palm_rest(side):
    """The palm's normal in the hand bone's own axes: in the rig's A pose the palms face the thighs,
    so it is the inward direction made square to the bone."""
    b = rig.data.bones[side + '_Hand']
    along = (M3 @ (b.tail_local - b.head_local)).normalized()
    inward = Vector((1 if side == 'R' else -1, 0, 0))
    n = (inward - inward.dot(along) * along).normalized()
    local = b.matrix_local.to_3x3().inverted() @ (M3.inverted() @ n)
    return local.normalized()


def turn_hand(side, fingers, palm):
    """Set the hand bone so its fingers point along `fingers` and its palm faces `palm` (world)."""
    pb = rig.pose.bones[side + '_Hand']
    b = pb.bone
    yl = Vector((0, 1, 0))
    nl = palm_rest(side)
    nl = (nl - nl.dot(yl) * yl).normalized()
    F = fingers.normalized()
    N = (palm - palm.dot(F) * F).normalized()
    local = Matrix((yl, nl, yl.cross(nl))).transposed()
    target = Matrix((F, N, F.cross(N))).transposed()
    rot_world = target @ local.inverted()
    rot_arm = M3.inverted() @ rot_world
    head = pb.head.copy()
    pb.matrix = Matrix.Translation(head) @ rot_arm.to_4x4()
    bpy.context.view_layer.update()


def up_of(axis):
    return (Z - Z.dot(axis) * axis).normalized()


# The line of the shot as the game has it, and which side of it his body is.
A = gun_was.to_3x3().col[0].normalized()
butt = gun_was.translation.copy()
torso = world(rig.pose.bones['Spine02'].head)
to_body = torso - butt
to_body -= to_body.dot(A) * A
to_body.z = 0
S = to_body.normalized()
print('GUN axis', tuple(round(v, 3) for v in A), 'body side', tuple(round(v, 3) for v in S))

STOCK_HALF = 0.009     # half the breadth and the depth below centre of the stock (props.musket)
PALM_HALF = 0.011      # half the thickness of his (mitten) hand


def on_line(p):
    return butt + A * (p - butt).dot(A)


def aim_bone(name, direction):
    """Turn a bone about its head, the least it takes, to point along `direction` (world)."""
    pb = rig.pose.bones[name]
    now = world(pb.tail) - world(pb.head)
    q = M3.inverted() @ now.rotation_difference(direction).to_matrix() @ M3
    head = pb.head.copy()
    pb.matrix = Matrix.Translation(head) @ (q @ pb.matrix.to_3x3()).to_4x4()
    bpy.context.view_layer.update()


def reach(side, target):
    """Bring the wrist to `target` by turning upper arm and forearm, the elbow kept bent the way
    the game bends it."""
    up, fore = rig.pose.bones[side + '_Upperarm'], rig.pose.bones[side + '_Forearm']
    sh, el, wr = world(up.head), world(fore.head), world(fore.tail)
    l1, l2 = (el - sh).length, (wr - el).length
    to = target - sh
    d = min(to.length, (l1 + l2) * 0.995)
    k = to.normalized()
    bend = (el - sh) - (el - sh).dot(k) * k
    bend.normalize()
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(l1 * l1 - a * a, 0))
    elbow = sh + k * a + bend * h
    aim_bone(side + '_Upperarm', elbow - sh)
    aim_bone(side + '_Forearm', sh + k * d - world(fore.head))
    print('REACH', side, 'wrist moved', round((world(fore.tail) - wr).length, 3), 'off target', round((world(fore.tail) - target).length, 3))


def palm_offset(side):
    """How far the middle of the palm is from the wrist, in the rest pose."""
    b = rig.data.bones[side + '_Hand']
    g = body.vertex_groups[side + '_Hand'].index
    pts = [body.matrix_world @ v.co for v in body.data.vertices for e in v.groups if e.group == g and e.weight > 0.6]
    c = sum(pts, Vector()) / len(pts)
    return (c - world(b.head_local)).length


# The musket stays where the game holds it. Right hand at the wrist of the stock: palm against its
# outer side, away from him, wrist and thumb in line with the barrel. Left hand under the fore-end: palm up, fingers across
# to the far side.
P_R = on_line(world(rig.pose.bones['R_Hand'].head))
print('GRIP R along the musket from the butt', round((P_R - butt).dot(A), 3))
# Low on the stock, just ahead of the step where the butt (0.13 long, props.musket) meets the
# narrower fore-stock: the trigger, so he reads as holding it.
GRIP_AT, GRIP_DOWN = 0.145, 0.012
P_R = butt + A * GRIP_AT - up_of(A) * GRIP_DOWN
P_L = on_line(world(rig.pose.bones['L_Hand'].head))
F_R, N_R = (A - 0.3 * Z).normalized(), S
F_L, N_L = (-S + 0.25 * Z).normalized(), Z
for side, P, F, N in (('R', P_R, F_R, N_R), ('L', P_L, F_L, N_L)):
    reach(side, P - F * palm_offset(side) - N * (STOCK_HALF + PALM_HALF))
    turn_hand(side, fingers=F, palm=N)
    print('GAP', side, round((Vector(hand_points(side).mean(0)) - P).length, 3))
A2 = A

SKIN = (0.16, 0.075, 0.04, 1)
skin = bpy.data.materials.new('piel_dedos')
skin.use_nodes = True
skin.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = SKIN
skin.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.7


def wrap(name, centre, axis, side_u, a0, a1, width, r0, r1, lift=0.0):
    """Fingers as a curled band round the wood: an arc of a thick tube about the musket's axis, from
    angle a0 to a1 (degrees, 0 toward side_u, 90 straight down), `width` along the axis."""
    v = (Z - Z.dot(axis) * axis).normalized()
    u = (side_u - side_u.dot(axis) * axis - side_u.dot(v) * v).normalized()
    c = centre + v * lift
    bm = bmesh.new()
    steps = 14
    rings = []
    for i in range(steps + 1):
        t = math.radians(a0 + (a1 - a0) * i / steps)
        d = u * math.cos(t) - v * math.sin(t)
        ring = []
        for w in (-width / 2, width / 2):
            for r in (r0, r1):
                ring.append(bm.verts.new(c + axis * w + d * r))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        # inner, outer, and the two sides
        for i, j in ((0, 2), (1, 3), (0, 1), (2, 3)):
            q = [a[i], a[j], b[j], b[i]]
            bm.faces.new(q if i in (0, 2) and j != 3 or (i, j) == (0, 1) else q)
    for ring in (rings[0], rings[-1]):
        bm.faces.new([ring[0], ring[1], ring[3], ring[2]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(skin)
    # rounded a little, so they read as fingers rather than a ring
    sub = o.modifiers.new('sub', 'SUBSURF')
    sub.levels = 2
    return o


fingers = [
    # right: from the palm on the outer side, under the stock and up his side
    wrap('dedos_d', P_R, A2, -S, 5, 215, 0.03, 0.011, 0.019),
    # left: thumb up his side, palm under, fingers up the far side of the fore-end
    wrap('dedos_i', P_L, A2, S, 25, 225, 0.034, 0.011, 0.019, lift=0.004),
]

# Everything posed, in world space.
dg = bpy.context.evaluated_depsgraph_get()
parts = []
for o in [body, gun] + fingers:
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    me.transform(o.matrix_world)
    p = bpy.data.objects.new(o.name + '_pose', me)
    bpy.context.scene.collection.objects.link(p)
    parts.append(p)
for o in list(bpy.data.objects):
    if o not in parts:
        bpy.data.objects.remove(o)

# Join, put feet at z=0 and scale to the height asked (millimetres).
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
fig = bpy.context.active_object
fig.name = 'cabral'
vs = [v.co for v in fig.data.vertices]
zmin = min(v.z for v in vs); zmax = max(v.z for v in vs)
s = height / (zmax - zmin)
feet = [v for v in vs if v.z < zmin + 0.02 * (zmax - zmin)]
cx = sum(v.x for v in feet) / len(feet); cy = sum(v.y for v in feet) / len(feet)
T = Matrix.Scale(s, 4) @ Matrix.Translation((-cx, -cy, -zmin))
fig.data.transform(T)
print('HANDS AT', tuple(round(v, 1) for v in T @ P_R), tuple(round(v, 1) for v in T @ P_L))

# The base: a round plinth, bevelled, the figure sunk a little into it so they are one piece.
R, H, SINK = height * 0.32, height * 0.06, 0.8
off = Vector((height * 0.05, -height * 0.02, 0))
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=96, radius1=R, radius2=R * 0.94, depth=H)
bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((off.x, off.y, -H / 2 + SINK)))
me = bpy.data.meshes.new('base'); bm.to_mesh(me); bm.free()
base = bpy.data.objects.new('base', me); bpy.context.scene.collection.objects.link(base)
mat = bpy.data.materials.new('peana'); mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.09, 0.06, 0.045, 1)
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
me.materials.append(mat)

# Coloured preview, as it stands, in millimetres.
bpy.ops.object.select_all(action='DESELECT')
for o in (fig, base):
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'cabral_figura.glb'), use_selection=True,
                          export_apply=True, export_yup=True)

# The printable solid: everything melted into one closed skin.
bpy.context.view_layer.objects.active = fig
bpy.ops.object.join()
solid = bpy.context.active_object
r = solid.modifiers.new('remesh', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = 0.22; r.adaptivity = 0
bpy.ops.object.modifier_apply(modifier='remesh')
# (decimating after it opened a few edges; a coarser voxel keeps it closed)
bm = bmesh.new(); bm.from_mesh(solid.data)
print('SOLID tris', sum(len(f.verts) - 2 for f in bm.faces),
      'non-manifold edges', len([e for e in bm.edges if not e.is_manifold]),
      'dims mm', tuple(round(x, 1) for x in solid.dimensions))
bm.free()
bpy.ops.wm.stl_export(filepath=os.path.join(out, 'cabral_figura.stl'), export_selected_objects=True, ascii_format=False)
