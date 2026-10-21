"""Take a door out of a building's model, leaving the doorway open: the faces of its front wall
within a rectangle are deleted. The model is as prepare_model.py leaves it (one unit tall, its
front looking along glTF's +Z, Blender's -Y); the rectangle is given in those units, across (x) and
up (z), as measured on the door's dark wood.

    Blender -b --python tools/blender/cut_door.py -- IN.glb OUT.glb X0 X1 TOP
"""
import sys

import bpy
import bmesh

args = sys.argv[sys.argv.index('--') + 1:]
src, dst, x0, x1, top = args[0], args[1], float(args[2]), float(args[3]), float(args[4])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
gone = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    M = o.matrix_world
    mesh = bmesh.new()
    mesh.from_mesh(o.data)
    # Of the front wall (facing out, at its front), whatever lies within the doorway.
    doomed = [f for f in mesh.faces
              if (M.to_3x3() @ f.normal).normalized().y < -0.5 and (M @ f.calc_center_median()).y < -0.45
              and x0 <= (M @ f.calc_center_median()).x <= x1 and (M @ f.calc_center_median()).z <= top]
    gone += len(doomed)
    bmesh.ops.delete(mesh, geom=doomed, context='FACES')
    mesh.to_mesh(o.data)
    mesh.free()
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True)
print('WROTE', dst, gone, 'faces taken out')
