"""Cut away a rigged model's body below one of its bones: the Wekufe kept to his torso and a little under
it, his legs (his tail of smoke) left to the game's smoke and fire (src/three/wekufe.ts), which still
follow the leg bones as they move.

    Blender -b --python tools/blender/cut_below.py -- IN.glb OUT.glb [--bone Waist] [--by -0.06]

IN is a finished animated model (after prepare_rigged.py and decimate.py; before glow.py), one unit
tall. Every face lying wholly lower than the bone's head, at rest, moved --by (in the model's units,
below it if less than 0), is taken out, but for what the arms move (his claws hang lower than his
waist): a face any of whose corners is weighted to an arm's bone at least --arm (0.2) is kept. Its rig
and clips are kept as they are.
"""
import sys

import bmesh
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[0], args[1]
opts = dict(zip(args[2::2], args[3::2]))
BONE = opts.get('--bone', 'Waist')
BY = float(opts.get('--by', -0.06))
ARM = float(opts.get('--arm', 0.2))
ARMS = ('Clavicle', 'Upperarm', 'Forearm', 'Hand')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
below = (armature.matrix_world @ armature.data.bones[BONE].head_local).z + BY

gone = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    M = o.matrix_world
    groups = {g.index for g in o.vertex_groups if any(a in g.name for a in ARMS)}
    armed = {v.index for v in o.data.vertices if any(g.group in groups and g.weight >= ARM for g in v.groups)}
    mesh = bmesh.new()
    mesh.from_mesh(o.data)
    doomed = [f for f in mesh.faces
              if max((M @ v.co).z for v in f.verts) < below and not any(v.index in armed for v in f.verts)]
    gone += len(doomed)
    bmesh.ops.delete(mesh, geom=doomed, context='FACES')
    loose = [v for v in mesh.verts if not v.link_faces]
    bmesh.ops.delete(mesh, geom=loose, context='VERTS')
    mesh.to_mesh(o.data)
    mesh.free()

# Each clip exported as one of its own, as prepare_rigged.py exports them.
for o in bpy.data.objects:
    if o is not armature and o.animation_data:
        o.animation_data_clear()
armature.animation_data_clear()
armature.animation_data_create()
for action in bpy.data.actions:
    action.use_fake_user = True
    track = armature.animation_data.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, int(action.frame_range[0]), action)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True,
                          export_animation_mode='NLA_TRACKS', export_apply=False)
print(f'WROTE {dst}: {gone} faces under {below:.3f} ({BONE} {BY:+}) taken out, clips {[a.name for a in bpy.data.actions]}')
