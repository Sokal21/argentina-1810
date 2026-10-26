"""Takes the glass and the liquid painted on a model's flasks out of it, keeping what is round them (an
iron cage, the stones under them, the neck and its cork), so a glass of the game's own, with liquid
that rises and falls, can be set in their place (Cabral's 3D HUD, src/three/hud3d.ts).

    Blender -b --python tools/blender/hollow_glass.py -- IN.glb OUT.glb --sphere X,Y,Z,R [--sphere ...] [--dark 0.13]

Each --sphere is a flask's round body, in glTF's axes (Y up, Z toward the front), in the model's
units. Its liquid, a bright and strong colour on the texture, is taken out wherever it is painted
within a little more than the sphere (it was painted a little past it); its glass, any colour but
the iron's (darker than --dark), only within it and neither low in it (the stones it stands on:
under three quarters of its radius below its middle) nor high (where its neck begins: over nine
tenths of its radius above it).
"""
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[0], args[1]
spheres, DARK = [], 0.13
for key, value in zip(args[2::2], args[3::2]):
    if key == '--sphere':
        x, y, z, r = map(float, value.split(','))
        # glTF to Blender: X stays, glTF's Y is Blender's Z, glTF's Z is Blender's -Y.
        spheres.append((Vector((x, -z, y)), r))
    elif key == '--dark':
        DARK = float(value)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
taken = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    mesh = o.data
    image = next((n.image for m in mesh.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
    pixels = list(image.pixels) if image else None
    w, h = image.size if image else (0, 0)
    uv = mesh.uv_layers.active.data if mesh.uv_layers.active else None

    def colour(poly) -> tuple:
        """The face's colour on its texture, at its middle."""
        if not pixels or uv is None:
            return (1.0, 1.0, 1.0)
        u = sum(uv[i].uv.x for i in poly.loop_indices) / poly.loop_total
        v = sum(uv[i].uv.y for i in poly.loop_indices) / poly.loop_total
        px, py = min(w - 1, max(0, int(u % 1 * w))), min(h - 1, max(0, int(v % 1 * h)))
        at = (py * w + px) * 4
        return (pixels[at], pixels[at + 1], pixels[at + 2])

    out = []
    for poly in mesh.polygons:
        middle = o.matrix_world @ poly.center
        for centre, r in spheres:
            off = middle - centre
            if off.length > r * 1.15:
                continue
            c = colour(poly)
            light, most, least = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], max(c), min(c)
            liquid = most > 0.3 and (most - least) / most > 0.45
            glass = light >= DARK and off.length <= r and -0.75 * r <= off.z <= 0.9 * r
            if liquid or glass:
                out.append(poly.index)
                break
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for i in out:
        mesh.polygons[i].select = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.delete(type='FACE')
    bpy.ops.object.mode_set(mode='OBJECT')
    taken += len(out)

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True)
print(f'WROTE {dst}: {taken} faces of glass taken out of {len(spheres)} flasks')
