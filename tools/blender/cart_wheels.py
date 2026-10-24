"""The ox cart's two wheels taken off its body, each a piece of its own turning about its hub, so the
game can roll them as the cart goes.

    Blender -b --python tools/blender/cart_wheels.py -- CART.glb OUT.glb [--pole 0.47] [--lift 0.13]

Its pole is drawn out first (`--pole`, shares of its height, the yoke carried on with it) and its tip
raised (`--lift`): as Tripo made it two oxen under its yoke stood in its bed, the yoke below their
necks. Measured for the ox drawn 72 beside the cart drawn 110 (src/three/cart.ts).

CART is prepare_model.py's (one unit tall). A wheel is what stands out beyond the bed's sides (from
`SIDE` of the cart's width out), round its hub: the hub's place is the middle of all that, on its own
side, short of the pole and yoke (`AXLE_SPAN` along the cart). Each faces whole are taken whose every
corner is so. They are named `rueda_izquierda` and `rueda_derecha`, their origin at their hub (so a
turn about their own X rolls them), the body `carreta`.
"""
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[2::2], args[3::2]))
SIDE, AXLE_SPAN = 0.235, (-0.72, 0.32)
# From here out, what is left within a wheel's round is taken off the body.
INNER = 0.21
# Along the cart (+Y, toward the yoke): where its bed ends and its pole begins, and where the yoke begins.
BED_FRONT, YOKE_FROM = 0.38, 0.55
POLE, LIFT = float(opts.get('--pole', 0.47)), float(opts.get('--lift', 0.13))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
body = next(o for o in bpy.data.objects if o.type == 'MESH')
body.name = 'carreta'
mw = body.matrix_world
# The pole drawn out between the bed and the yoke, the yoke carried along and raised.
inv = mw.inverted()
for v in body.data.vertices:
    p = mw @ v.co
    if p.y <= BED_FRONT:
        continue
    k = min(1.0, (p.y - BED_FRONT) / (YOKE_FROM - BED_FRONT))
    v.co = inv @ Vector((p.x, p.y + POLE * k, p.z + LIFT * k))
body.data.update()
world = [mw @ v.co for v in body.data.vertices]


def wheel_of(side: int):
    """The hub's middle and the wheel's reach, on one side."""
    out = [p for p in world if p.x * side >= SIDE and AXLE_SPAN[0] < p.y < AXLE_SPAN[1]]
    lo = Vector([min(p[i] for p in out) for i in range(3)])
    hi = Vector([max(p[i] for p in out) for i in range(3)])
    hub = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2))
    reach = max(hi.y - lo.y, hi.z - lo.z) / 2
    return hub, reach


# Measured on whichever side gives the bigger wheel (on the other, something of the bed came into
# it and made it small), mirrored to the other: the cart is the same both sides.
sides = {side: wheel_of(side) for side in (1, -1)}
best = max(sides, key=lambda k: sides[k][1])
hub0, reach0 = sides[best]
for side, name in ((1, 'rueda_izquierda'), (-1, 'rueda_derecha')):
    hub, reach = Vector((abs(hub0.x) * side, hub0.y, hub0.z)), reach0
    print(name, 'hub', [round(v, 3) for v in hub], 'radius', round(reach, 3))
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    keep = lambda v: (mw @ v.co).x * side >= SIDE * 0.97 and ((mw @ v.co).yz - hub.yz).length <= reach * 1.06
    faces = [f for f in mesh.faces if all(keep(v) for v in f.verts)]
    # The wheel alone in a mesh of its own, and taken out of the body's.
    wheel = bmesh.new()
    wheel.from_mesh(body.data)
    bmesh.ops.delete(wheel, geom=[f for f in wheel.faces if not all(keep(v) for v in f.verts)], context='FACES')
    data = body.data.copy()
    wheel.to_mesh(data)
    wheel.free()
    # And whatever of its inner side is left on the body, between it and the bed: hidden behind the wheel,
    # it stood still as the wheel turned, splinters on the ground.
    inner = lambda v: (mw @ v.co).x * side >= INNER and ((mw @ v.co).yz - hub.yz).length <= reach * 1.06
    faces += [f for f in mesh.faces if f not in faces and all(inner(v) for v in f.verts)]
    bmesh.ops.delete(mesh, geom=faces, context='FACES')
    mesh.to_mesh(body.data)
    mesh.free()
    piece = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(piece)
    piece.matrix_world = mw.copy()
    # Its origin at its hub.
    local = mw.inverted() @ hub
    for v in piece.data.vertices:
        v.co -= local
    piece.location = hub
    print(name, len(piece.data.vertices), 'vertices')
bpy.ops.export_scene.gltf(filepath=args[1], export_format='GLB')
print('WROTE', args[1])
