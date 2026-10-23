"""The ox's skin bound to its bones again, by Blender's own weights, after Tripo's quadruped rig bound
it badly: the hips' bone held the whole of both thighs (the hind legs' own bones next to nothing, so
they did not bend), the hind right leg had no bone below its gaskin (its whole lower leg one rigid
piece), and the last bone of the head held the head and all the neck down to the chest (grazing, the
head went down whole and dragged the chest in). The missing bone is made, the hind left's mirrored;
every weight is taken off and the skin bound again with automatic weights (by heat, nearest bone).

    Blender -b --python tools/blender/reskin_quadruped.py -- RIG.glb OUT.glb

OUT is the rig to retarget clips onto (quadruped_retarget.py) and to give prepare_rigged.py.
"""
import sys

import bmesh
import bpy
from mathutils.kdtree import KDTree

args = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH' and len(o.vertex_groups))
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o is not body]:
    bpy.data.objects.remove(o)

# The hind right leg as the left: its gaskin to where the left's ends, mirrored, and a cannon bone below it.
bpy.context.view_layer.objects.active = armature
bpy.ops.object.mode_set(mode='EDIT')
edit = armature.data.edit_bones
name = lambda n: next(b.name for b in edit if b.name.endswith(n))
left1, left2, right1 = edit[name('1_Left_Limb_1')], edit[name('1_Left_Limb_2')], edit[name('1_Right_Limb_1')]
mirror = lambda v: v.__class__((v.x, -v.y, v.z))
right1.tail = mirror(left1.tail)
right2 = edit.new(right1.name.replace('1_Right_Limb_1', '1_Right_Limb_2'))
right2.head, right2.tail, right2.roll = mirror(left2.head), mirror(left2.tail), -left2.roll
right2.parent = right1
right2.use_connect = True
bpy.ops.object.mode_set(mode='OBJECT')

# Every weight off, and the skin bound again by Blender's. By heat, it found nothing on the ox as it is
# (0.7 across: too small for it), so it is found on a copy ten times the size, its doubled vertices
# merged (Tripo doubles them along its texture's seams: weighed apart, the skin cracked open there),
# and given back to each vertex from the copy's nearest. Small loose pieces (the horns, the eyes)
# take the weights of the nearest of the body whole, so they go with it (a horn's tip, weighed on its
# own, stayed up as the head went down).
for group in list(body.vertex_groups):
    body.vertex_groups.remove(group)
for modifier in [m for m in body.modifiers if m.type == 'ARMATURE']:
    modifier.object = armature
big_body, big_arm = body.copy(), armature.copy()
big_body.data, big_arm.data = body.data.copy(), armature.data.copy()
for o in (big_body, big_arm):
    bpy.context.collection.objects.link(o)
big_body.parent = None
big_body.modifiers.clear()
for o in (big_body, big_arm):
    o.matrix_world = o.matrix_world.copy()
bpy.ops.object.select_all(action='DESELECT')
for o in (big_body, big_arm):
    o.select_set(True)
bpy.context.view_layer.objects.active = big_arm
bpy.ops.transform.resize(value=(10, 10, 10), center_override=(0, 0, 0))
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
merged = bmesh.new()
merged.from_mesh(big_body.data)
bmesh.ops.remove_doubles(merged, verts=merged.verts, dist=0.004)
merged.to_mesh(big_body.data)
merged.free()
bpy.ops.object.select_all(action='DESELECT')
big_body.select_set(True)
big_arm.select_set(True)
bpy.context.view_layer.objects.active = big_arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# Each vertex of the ox: the weights of the copy's nearest (the copy is ten times as big).
tree = KDTree(len(big_body.data.vertices))
for v in big_body.data.vertices:
    tree.insert(big_body.matrix_world @ v.co, v.index)
tree.balance()
names = [g.name for g in big_body.vertex_groups]
weights_of = lambda v: {names[g.group]: g.weight for g in v.groups if g.weight > 0}
weights = {}
for v in body.data.vertices:
    _, i, _ = tree.find((body.matrix_world @ v.co) * 10)
    weights[v.index] = weights_of(big_body.data.vertices[i])
# Its loose pieces: the biggest is the body; any other small one takes the body's nearest, whole.
pieces = bmesh.new()
pieces.from_mesh(body.data)
pieces.verts.ensure_lookup_table()
seen, islands = set(), []
for start in pieces.verts:
    if start.index in seen:
        continue
    island, stack = [], [start]
    seen.add(start.index)
    while stack:
        v = stack.pop()
        island.append(v.index)
        for e in v.link_edges:
            w = e.other_vert(v)
            if w.index not in seen:
                seen.add(w.index)
                stack.append(w)
    islands.append(island)
pieces.free()
islands.sort(key=len, reverse=True)
whole = KDTree(len(islands[0]))
for i in islands[0]:
    whole.insert(body.matrix_world @ body.data.vertices[i].co, i)
whole.balance()
for island in islands[1:]:
    if len(island) > len(islands[0]) * 0.05:
        continue
    middle = sum((body.matrix_world @ body.data.vertices[i].co for i in island), body.matrix_world.to_translation() * 0) / len(island)
    _, nearest, _ = whole.find(middle)
    for i in island:
        weights[i] = dict(weights[nearest])
print('loose pieces', len(islands) - 1)
for name in names:
    body.vertex_groups.new(name=name)
for i, ws in weights.items():
    for name, w in ws.items():
        body.vertex_groups[name].add([i], w, 'REPLACE')
if not any(m.type == 'ARMATURE' for m in body.modifiers):
    body.modifiers.new('Armature', 'ARMATURE').object = armature
bpy.data.objects.remove(big_body)
bpy.data.objects.remove(big_arm)
held = {g.name: sum(1 for v in body.data.vertices if any(x.group == g.index and x.weight > 0.5 for x in v.groups)) for g in body.vertex_groups}
print('held', held)
bpy.ops.export_scene.gltf(filepath=args[1], export_format='GLB', export_animations=False)
print('WROTE', args[1])
