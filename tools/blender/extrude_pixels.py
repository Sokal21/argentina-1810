"""Raise a pixel-art picture into a solid: every pixel a block standing out of the picture's plane,
the lighter the higher (the gold of a lettering stands out of its dark rim, and its own shading
becomes relief), its face and sides coloured by the picture itself, read pixel for pixel.

    Blender -b --python tools/blender/extrude_pixels.py -- IN.png OUT.glb [--steps 4] [--rise 1] [--base 1]

One unit to a pixel, the picture's middle at the origin, standing upright and facing glTF's +Z;
the back of it flat at z = 0. A pixel of the picture is solid when it is mostly opaque. --steps is
how many heights there are above the lowest (--base), --rise how much each one adds.
"""
import sys

import bpy
import bmesh

args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[0], args[1]
opts = dict(zip(args[2::2], args[3::2]))
STEPS, RISE, BASE = int(opts.get('--steps', 4)), float(opts.get('--rise', 1)), float(opts.get('--base', 1))

bpy.ops.wm.read_factory_settings(use_empty=True)
image = bpy.data.images.load(src)
W, H = image.size
px = list(image.pixels)  # bottom row first, RGBA floats


def at(x, y):
    """The pixel at x across, y down from the top."""
    i = ((H - 1 - y) * W + x) * 4
    return px[i:i + 4]


solid, height = {}, {}
for y in range(H):
    for x in range(W):
        r, g, b, a = at(x, y)
        if a < 0.5:
            continue
        light = 0.3 * r + 0.55 * g + 0.15 * b
        solid[x, y] = True
        height[x, y] = BASE + RISE * round(min(1.0, light / 0.8) * STEPS)

mesh = bmesh.new()
uvs = mesh.loops.layers.uv.new('UVMap')
verts = {}


def vert(x, y, z):
    # Picture x right, y down; the solid's x right, y up, z out.
    key = (x, y, z)
    if key not in verts:
        verts[key] = mesh.verts.new((x - W / 2, -(y - H / 2), z))
    return verts[key]


def face(corners, uv):
    f = mesh.faces.new([vert(*c) for c in corners])
    for loop, (u, v) in zip(f.loops, uv):
        loop[uvs].uv = (u / W, 1 - v / H)


def runs(cells):
    """Cells (line, at) grouped into runs of consecutive `at` on the same line: (line, first, last)."""
    out, cells = [], sorted(cells)
    for line, a in cells:
        if out and out[-1][0] == line and out[-1][2] == a - 1:
            out[-1][2] = a
        else:
            out.append([line, a, a])
    return out


# Faces and backs, a run of pixels of one height across a row at a time, each corner coloured from
# where it lies on the picture (read pixel by pixel, it colours each pixel of the run its own).
by_height = {}
for (x, y), z in height.items():
    by_height.setdefault(z, []).append((y, x))
for z, cells in by_height.items():
    for y, x0, x1 in runs(cells):
        face([(x0, y + 1, z), (x1 + 1, y + 1, z), (x1 + 1, y, z), (x0, y, z)],
             [(x0, y + 1), (x1 + 1, y + 1), (x1 + 1, y), (x0, y)])
for y, x0, x1 in runs([(y, x) for (x, y) in height]):
    face([(x0, y, 0), (x1 + 1, y, 0), (x1 + 1, y + 1, 0), (x0, y + 1, 0)],
         [(x0, y), (x1 + 1, y), (x1 + 1, y + 1), (x0, y + 1)])

# Sides wherever a neighbour stands lower, from its top (or the back) up to this one's: runs along a
# column (the left and right sides) or a row (the top and bottom), coloured by the pixels they edge,
# their colour read a little within each pixel.
sides = {}
for (x, y), z in height.items():
    for d, (dx, dy) in enumerate(((-1, 0), (1, 0), (0, -1), (0, 1))):
        low = height.get((x + dx, y + dy), 0)
        if low < z:
            line, a = (x, y) if d < 2 else (y, x)
            sides.setdefault((d, low, z), []).append((line, a))
IN = 0.25
for (d, low, z), cells in sides.items():
    for line, a0, a1 in runs(cells):
        if d == 0:    # left: x = line, y from a0 to a1 + 1
            c, u = [(line, a1 + 1), (line, a0)], line + IN
            face([(*c[0], low), (*c[1], low), (*c[1], z), (*c[0], z)], [(u, a1 + 1), (u, a0), (u, a0), (u, a1 + 1)])
        elif d == 1:  # right
            c, u = [(line + 1, a0), (line + 1, a1 + 1)], line + 1 - IN
            face([(*c[0], low), (*c[1], low), (*c[1], z), (*c[0], z)], [(u, a0), (u, a1 + 1), (u, a1 + 1), (u, a0)])
        elif d == 2:  # top
            c, v = [(a0, line), (a1 + 1, line)], line + IN
            face([(*c[0], low), (*c[1], low), (*c[1], z), (*c[0], z)], [(a0, v), (a1 + 1, v), (a1 + 1, v), (a0, v)])
        else:         # bottom
            c, v = [(a1 + 1, line + 1), (a0, line + 1)], line + 1 - IN
            face([(*c[0], low), (*c[1], low), (*c[1], z), (*c[0], z)], [(a1 + 1, v), (a0, v), (a0, v), (a1 + 1, v)])

bmesh.ops.remove_doubles(mesh, verts=mesh.verts, dist=1e-4)
data = bpy.data.meshes.new('pixels')
mesh.to_mesh(data)
mesh.free()
obj = bpy.data.objects.new('pixels', data)
bpy.context.scene.collection.objects.link(obj)
# glTF's +Z (out of the picture) is Blender's -Y, its up Blender's Z.
obj.rotation_euler = (1.5707963, 0, 0)

material = bpy.data.materials.new('picture')
material.use_nodes = True
nodes = material.node_tree.nodes
texture = nodes.new('ShaderNodeTexImage')
texture.image = image
texture.interpolation = 'Closest'
material.node_tree.links.new(texture.outputs['Color'], nodes['Principled BSDF'].inputs['Base Color'])
data.materials.append(material)

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True, export_apply=True)
print('WROTE', dst, len(solid), 'pixels', len(data.polygons), 'faces')
