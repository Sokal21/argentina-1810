"""Take a floor out of a building's model: whatever lies low down within its walls, top and underside. A model
that came with a floor of its own over the ground (La capilla's, a few units up) hid the feet of
whoever walked in it; the room has a floor of its own (src/three/house.ts) at the ground.

    Blender -b --python tools/blender/cut_floor.py -- IN.glb OUT.glb HALF_X HALF_Y BELOW

The model is as prepare_model.py leaves it (one unit tall); HALF_X and HALF_Y are how far the walls'
inside reaches from its middle, across and along (Blender's y), and BELOW the height under which a
face is floor.
"""
import sys

import bmesh
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
src, dst, hx, hy, below = args[0], args[1], float(args[2]), float(args[3]), float(args[4])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
gone = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    M = o.matrix_world
    mesh = bmesh.new()
    mesh.from_mesh(o.data)
    doomed = []
    for f in mesh.faces:
        corners = [M @ v.co for v in f.verts]
        # Its top, its underside and its edges: the room's walls are drawn from both sides, and the
        # underside of a slab whose top was gone still hid the feet.
        if max(c.z for c in corners) < below and all(abs(c.x) < hx and abs(c.y) < hy for c in corners):
            doomed.append(f)
    gone += len(doomed)
    bmesh.ops.delete(mesh, geom=doomed, context='FACES')
    mesh.to_mesh(o.data)
    mesh.free()
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True)
print('WROTE', dst, gone, 'floor faces taken out')
