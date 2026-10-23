"""Cut one piece out of a model of several (a cot from a room's furniture) as a model of its own.

    Blender -b --python tools/blender/cut_piece.py -- IN.glb OUT.glb X0 X1 Z0 Z1 FLOOR

Keeps the faces whose middle is within X0..X1 along the model's x and Z0..Z1 along its glTF z (out
of its front), and above FLOOR (its slab's top, in the model's own height), all in its own units;
sets what is kept on the origin, its foot at 0, in the same units, so it is grown as the whole was.
"""
import sys

import bpy
import bmesh
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
x0, x1, z0, z1, floor = (float(a) for a in args[2:7])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
kept = []
for o in meshes:
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.transform(o.matrix_world)
    # glTF's z out of the front is Blender's -y.
    gone = [f for f in bm.faces if not (x0 <= f.calc_center_median().x <= x1 and z0 <= -f.calc_center_median().y <= z1
                                         and max(v.co.z for v in f.verts) > floor)]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    bm.to_mesh(o.data)
    bm.free()
    o.matrix_world = o.matrix_world.Identity(4)
    if o.data.vertices:
        kept.append(o)
pts = [v.co for o in kept for v in o.data.vertices]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
shift = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for o in kept:
    for v in o.data.vertices:
        v.co -= shift
print(f'KEPT {len(pts)} points; long {hi.x - lo.x:.3f} deep {hi.y - lo.y:.3f} tall {hi.z - lo.z:.3f}')
for o in bpy.data.objects:
    o.select_set(o in kept)
bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_format='GLB')
