"""Model a pixel-art emblem (the title's name, its sun) as a solid with smooth outlines, the drawing
as its guide: its whole outline (the dark rim and shadow) a slab at the back, and its gold standing
forward of that, bevelled. Each outline is traced into curves by potrace, from the drawing enlarged,
so the steps of its pixels become smooth lines. The faces looking out are coloured by the drawing,
laid straight on (its shading, its lines); the sides are plain gold, or the rim's dark red.

    Blender -b --python tools/blender/model_emblem.py -- IN.png OUT.glb [--back 5] [--front 6] [--bevel 1.2] [--soften 0]

One unit to a pixel of the drawing, its middle at the origin, facing glTF's +Z, its back at z = 0.
A pixel is gold where it is light enough (green above GOLD), part of the outline where opaque.
--soften blurs each outline over that many passes before it is traced, for thin lines drawn in
steps (the sun's rays) to come out straight; a lettering's sharp serifs want none.
Needs potrace (brew install potrace).
"""
import os
import subprocess
import sys
import tempfile

import bmesh
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[0], args[1]
opts = dict(zip(args[2::2], args[3::2]))
BACK, FRONT, BEVEL = float(opts.get('--back', 5)), float(opts.get('--front', 6)), float(opts.get('--bevel', 1.2))
SOFTEN = int(opts.get('--soften', 0))
GOLD, ENLARGE = 0.35, 6
SIDE_GOLD, SIDE_RIM = (0.78, 0.5, 0.16, 1), (0.28, 0.06, 0.05, 1)

bpy.ops.wm.read_factory_settings(use_empty=True)
image = bpy.data.images.load(src)
W, H = image.size
px = list(image.pixels)


def pixel(x, y):
    """The pixel x across, y down from the top."""
    i = ((H - 1 - y) * W + x) * 4
    return px[i:i + 4]


def trace(keep, name):
    """The pixels `keep` holds, traced into curves: a curve object, in the drawing's pixels."""
    work = tempfile.mkdtemp()
    pbm, svg = os.path.join(work, name + '.pbm'), os.path.join(work, name + '.svg')
    w, h = W * ENLARGE, H * ENLARGE
    # Enlarged smoothly, not pixel for pixel: what it holds is weighed between pixel middles and
    # kept where it outweighs what it does not, so a diagonal of steps becomes a straight edge.
    held = [[1.0 if 0 <= x < W and 0 <= y < H and keep(x, y) else 0.0 for x in range(-1, W + 1)] for y in range(-1, H + 1)]
    for _ in range(SOFTEN):
        # Each pixel a quarter each of its neighbours either side and half itself, across then down.
        held = [[row[x] if x in (0, len(row) - 1) else (row[x - 1] + 2 * row[x] + row[x + 1]) / 4 for x in range(len(row))] for row in held]
        held = [[held[y][x] if y in (0, len(held) - 1) else (held[y - 1][x] + 2 * held[y][x] + held[y + 1][x]) / 4 for x in range(len(held[0]))] for y in range(len(held))]

    def weighed(sx, sy):
        fx, fy = sx / ENLARGE - 0.5 + 1, sy / ENLARGE - 0.5 + 1
        x0, y0 = int(fx), int(fy)
        tx, ty = fx - x0, fy - y0
        top_ = held[y0][x0] * (1 - tx) + held[y0][x0 + 1] * tx
        low_ = held[y0 + 1][x0] * (1 - tx) + held[y0 + 1][x0 + 1] * tx
        return top_ * (1 - ty) + low_ * ty

    rows = []
    for y in range(h):
        bits = [1 if weighed(x + 0.5, y + 0.5) > (0.4 if SOFTEN else 0.5) else 0 for x in range(w)]
        rows.append(bytes(int(''.join(map(str, bits[i:i + 8])).ljust(8, '0'), 2) for i in range(0, w, 8)))
    with open(pbm, 'wb') as f:
        f.write(b'P4\n%d %d\n' % (w, h) + b''.join(rows))
    # Smooth corners, but not so smooth a serif's point is lost.
    subprocess.run(['potrace', pbm, '-s', '-o', svg, '--alphamax', '1.1', '--opttolerance', '0.4', '-t', '4'], check=True)
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=svg)
    curves = [o for o in bpy.data.objects if o not in before and o.type == 'CURVE']
    bpy.ops.object.select_all(action='DESELECT')
    for o in curves:
        o.select_set(True)
    bpy.context.view_layer.objects.active = curves[0]
    if len(curves) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    return obj


def opaque(x, y):
    return pixel(x, y)[3] > 0.5


def gold(x, y):
    r, g, b, a = pixel(x, y)
    return a > 0.5 and g > GOLD


back, front = trace(opaque, 'rim'), trace(gold, 'gold')
# SVG's units to the drawing's pixels: the outline's box is the opaque pixels' box.
xs = [x for y in range(H) for x in range(W) if opaque(x, y)]
ys = [y for y in range(H) for x in range(W) if opaque(x, y)]
left, right, top, bottom = min(xs), max(xs) + 1, min(ys), max(ys) + 1
bpy.context.view_layer.update()
corners = [back.matrix_world @ p.co.xyz for s in back.data.splines for p in (s.bezier_points or s.points)]
bx0, bx1 = min(c.x for c in corners), max(c.x for c in corners)
by0, by1 = min(c.y for c in corners), max(c.y for c in corners)
k = (right - left) / (bx1 - bx0)
for o, depth, bevel in ((back, BACK, 0), (front, FRONT, BEVEL)):
    o.data.dimensions = '2D'
    o.data.fill_mode = 'BOTH'
    o.data.extrude = depth / 2 / k
    o.data.bevel_depth = bevel / k
    o.data.bevel_resolution = 1
    o.data.resolution_u = 3

# As meshes, placed in pixels: x across from the drawing's middle, y up, z out of it.
meshes = []
for o in (back, front):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.view_layer.objects.active
    o.data.transform(o.matrix_world)
    o.matrix_world.identity()
    meshes.append(o)
back, front = meshes
for o, base in ((back, 0.0), (front, BACK)):
    m = o.data
    for v in m.vertices:
        # Back to the drawing's pixels: from the SVG's box to the opaque box, y measured down.
        px_x = left + (v.co.x - bx0) * k
        px_y = top + (by1 - v.co.y) * k
        z = v.co.z * k
        v.co = (px_x - W / 2, -(px_y - H / 2), base + z + (BACK / 2 if o is back else FRONT / 2 + BEVEL))

# The drawing laid straight onto whatever looks out; the sides plain.
face_mat = bpy.data.materials.new('drawing')
face_mat.use_nodes = True
tex = face_mat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = image
tex.interpolation = 'Closest'
bsdf = face_mat.node_tree.nodes['Principled BSDF']
face_mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Metallic'].default_value = 0.5
bsdf.inputs['Roughness'].default_value = 0.35


def plain(name, colour, metal):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = colour
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = 0.35
    return m


for o, side in ((back, plain('rim side', SIDE_RIM, 0.1)), (front, plain('gold side', SIDE_GOLD, 0.7))):
    m = o.data
    # Whatever the SVG brought (its fill) goes.
    m.materials.clear()
    m.materials.append(face_mat)
    m.materials.append(side)
    bm = bmesh.new()
    bm.from_mesh(m)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        f.material_index = 0 if f.normal.z > 0.3 else 1
        for loop in f.loops:
            x, y, _ = loop.vert.co
            loop[uv].uv = ((x + W / 2) / W, (y + H / 2) / H)
    bm.to_mesh(m)
    bm.free()

bpy.ops.object.select_all(action='DESELECT')
for o in (back, front):
    o.select_set(True)
bpy.context.view_layer.objects.active = back
bpy.ops.object.join()
emblem = bpy.context.view_layer.objects.active
# glTF's +Z (out of the drawing) is Blender's -Y, its up Blender's Z.
emblem.rotation_euler = (1.5707963, 0, 0)
bpy.ops.object.shade_auto_smooth(angle=0.6)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True, export_apply=True)
print('WROTE', dst, len(emblem.data.polygons), 'faces')
