"""The ox cart made ready to be drawn rolling: Tripo's wheels taken off its body (the game draws wheels
of its own, src/three/cart.ts, that turn on their hubs), its pole drawn out and its yoke raised.

    Blender -b --python tools/blender/cart_wheels.py -- CART.glb OUT.glb [--pole 0.47] [--lift 0.17] [--bows 0.45]

CART is prepare_model.py's (one unit tall, its yoke toward +Y). Tripo made it all one piece, wheels,
bed and hide, so a wheel is taken by where it is: whatever stands out beyond the bed's sides (from
`SIDE` of its width; the hide never reaches past 0.237, and cutting from 0.235 took bits of it and made
the wheel too big), within its round about its hub (measured: `HUB` along and up, `RADIUS`, shares of
the cart's height, the same both sides). Its inner side, down to `INNER`, goes too, under the hide.

Its pole is drawn out (`--pole`, the yoke carried on with it) and its tip raised (`--lift`): as Tripo
made it two oxen under its yoke stood in its bed, the yoke below their necks. Its bows are shortened
(`--bows`, a share of how far they hung below its beam): they hung down among the oxen's forelegs. Measured for the ox drawn
72 beside the cart drawn 110.
"""
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
opts = dict(zip(args[2::2], args[3::2]))
SIDE, INNER, HIDE_FROM = 0.245, 0.2, 0.55
HUB, RADIUS = Vector((-0.322, 0.272)), 0.278
# Along the cart (+Y, toward the yoke): where its bed ends and its pole begins, and where the yoke begins.
BED_FRONT, YOKE_FROM = 0.38, 0.55
POLE, LIFT = float(opts.get('--pole', 0.47)), float(opts.get('--lift', 0.17))
BOWS = float(opts.get('--bows', 0.45))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
body = next(o for o in bpy.data.objects if o.type == 'MESH')
body.name = 'carreta'

mesh = bmesh.new()
mesh.from_mesh(body.data)


def wheel(v) -> bool:
    """Whether a corner is of a wheel: out past the bed, or within its round under the hide."""
    p = v.co
    near = (Vector((p.y, p.z)) - HUB).length <= RADIUS * 1.08
    return near and (abs(p.x) >= SIDE or (abs(p.x) >= INNER and p.z < HIDE_FROM))


gone = [f for f in mesh.faces if all(wheel(v) for v in f.verts)]
bmesh.ops.delete(mesh, geom=gone, context='FACES')
print('wheel faces taken off', len(gone))
# The yoke's bows drawn up toward its beam (its top), before anything is moved.
beam = max(v.co.z for v in mesh.verts if v.co.y > YOKE_FROM)
for v in mesh.verts:
    if v.co.y > YOKE_FROM:
        v.co.z = beam - (beam - v.co.z) * BOWS
# The pole drawn out between the bed and the yoke, the yoke carried along and raised.
for v in mesh.verts:
    if v.co.y <= BED_FRONT:
        continue
    k = min(1.0, (v.co.y - BED_FRONT) / (YOKE_FROM - BED_FRONT))
    v.co = Vector((v.co.x, v.co.y + POLE * k, v.co.z + LIFT * k))
mesh.to_mesh(body.data)
mesh.free()
bpy.ops.export_scene.gltf(filepath=args[1], export_format='GLB')
print('WROTE', args[1])
