"""Turn the greens of a model's texture to ash: black and greys by how light each was (Tripo
painted the burnt rancho's floor green).

    Blender -b --python tools/blender/recolor_green.py -- IN.glb OUT.glb
"""
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
changed = 0
for image in bpy.data.images:
    if not image.pixels:
        continue
    px = list(image.pixels)
    for i in range(0, len(px), 4):
        r, g, b = px[i], px[i + 1], px[i + 2]
        # Green: more of it than of red and of blue, by a margin.
        if g > r * 1.08 and g > b * 1.08:
            # Ash: as dark as it was, a little darker, no colour.
            v = min(0.42, (0.3 * r + 0.59 * g + 0.11 * b) * 0.7)
            px[i] = px[i + 1] = px[i + 2] = v
            changed += 1
    image.pixels[:] = px
    image.pack()
print('GREENS', changed)
bpy.ops.export_scene.gltf(filepath=args[1], export_format='GLB')
