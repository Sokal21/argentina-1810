"""Keying a Tripo rig by hand, in plain terms: point this bone that way, turn that one so far.

Everything is said in the rig's own axes as Tripo gives it, before tools/blender/prepare_rigged.py
turns it: **+X forward** (the way the feet point), **+Y his left**, **+Z up**. A pose names only the
bones that move; each of the others keeps its rest place relative to its parent, so turning the
spine carries the head and arms with it.

    from keyframes import Rig, ahead, turn
    rig = Rig('rig.glb')
    act = rig.action('reposo')
    rig.key(act, 0, {'L_Upperarm': ahead(0.05, 0.2, -1), 'Spine02': turn('y', 2)})
    rig.export('reposo.glb')

- `ahead(x, y, z)`: point the bone along that direction (it is normalised).
- `turn(axis, degrees)`: turn it about one of the rig's axes ('x' forward: he leans to his
  right; 'y' left: he leans forward; 'z' up: he looks to his left), on top of its parent.
- `Hip` may also be given a `'move'`: how far the whole body is shifted, in the rig's units.
- A thigh may be given `plant(x, y, z)` instead: where its foot stands, in the rig's units. The
  thigh and calf are then turned (two-bone IK, the knee bending forward) so the foot is there,
  wherever the hips have gone: a foot that is planted stays put, and one stepped puts down where
  it is told. Use it whenever the hips move or turn with the feet on the ground.
- What the rig carries (`carries=('sabre',)`) may be given an `ahead(...)` under its own name:
  the bone holding it turns so that the thing's length (its +X) points that way. Aim the blade
  this way rather than turning the hand, whose axis is made up.

Bones are keyed in the order of the skeleton, parents first; between keys Blender eases.
"""
import math

import bpy
from mathutils import Matrix, Quaternion, Vector

AXES = {'x': Vector((1, 0, 0)), 'y': Vector((0, 1, 0)), 'z': Vector((0, 0, 1))}


def ahead(x: float, y: float, z: float) -> tuple:
    return ('ahead', Vector((x, y, z)).normalized())


def plant(x: float, y: float, z: float, knee: tuple = (1, 0, 0)) -> tuple:
    return ('plant', Vector((x, y, z)), Vector(knee).normalized())


def turn(axis: str, degrees: float) -> tuple:
    return ('turn', Quaternion(AXES[axis], math.radians(degrees)))


class Rig:
    def __init__(self, path: str, fps: int = 24, carries: tuple = ()):
        """`carries` names what the rig holds, from props.py ('sabre'), so the strips show it."""
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
        self.arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
        for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.parent != self.arm]:
            bpy.data.objects.remove(o)
        bpy.context.scene.render.fps = fps
        self.fps = fps
        # Parents before children.
        self.order = []
        def walk(bone):
            self.order.append(bone.name)
            for child in bone.children:
                walk(child)
        for bone in self.arm.data.bones:
            if bone.parent is None:
                walk(bone)
        for pb in self.arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
        import props
        self.held = {prop: getattr(props, prop)(self.arm) for prop in carries}

    def turn_to(self, pb: bpy.types.PoseBone, way: Vector) -> None:
        """Turns a bone about its joint so it points `way`."""
        q = self.pointing(pb).rotation_difference(way.normalized())
        head = pb.matrix.to_translation()
        pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
        bpy.context.view_layer.update()

    def reach(self, thigh: bpy.types.PoseBone, foot: Vector, knee: Vector) -> None:
        """Turns a thigh and its calf so the ankle is at `foot`, the knee bending toward `knee`."""
        calf = next(c for c in thigh.children if 'Twist' not in c.name)
        ankle = next(c for c in calf.children if 'Twist' not in c.name)
        upper = (calf.bone.head_local - thigh.bone.head_local).length
        lower = (ankle.bone.head_local - calf.bone.head_local).length
        hip = thigh.matrix.to_translation()
        to = foot - hip
        far = min(to.length, (upper + lower) * 0.999)
        along = to.normalized()
        # How far along the line from hip to foot the knee comes, and how far out from it.
        a = (upper * upper - lower * lower + far * far) / (2 * far)
        out = math.sqrt(max(0.0, upper * upper - a * a))
        side = (knee - along * knee.dot(along)).normalized()
        bend = hip + along * a + side * out
        self.turn_to(thigh, bend - hip)
        self.turn_to(calf, hip + along * far - bend)

    def pointing(self, pb: bpy.types.PoseBone) -> Vector:
        """Which way a bone points now: from its joint to the next joint along the limb.

        Not the bone's own axis: glTF has no bone ends, and the ones Blender makes up on import
        point elsewhere (a forearm's toward nothing in particular), so aiming the axis left the
        arms bent forward. The next joint is its child that is not a twist bone. A bone without one
        (a hand) falls back on its axis, which is not where the hand points: do not aim hands,
        turn them a little or leave them to follow the forearm."""
        ends = [c for c in pb.children if 'Twist' not in c.name and (c.head - pb.head).length > 1e-4]
        if not ends:
            return (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
        end = min(ends, key=lambda c: (c.bone.head_local - pb.bone.head_local).length)
        return (end.matrix.to_translation() - pb.matrix.to_translation()).normalized()

    def action(self, name: str) -> bpy.types.Action:
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        self.arm.animation_data_create()
        self.arm.animation_data.action = act
        return act

    def pose(self, spec: dict) -> None:
        """Puts the rig in a pose, without keying it."""
        for pb in self.arm.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        for name in self.order:
            pb = self.arm.pose.bones[name]
            moves = spec.get(name)
            if moves is None:
                continue
            if not isinstance(moves, list):
                moves = [moves]
            for move in moves:
                if move[0] == 'move':
                    offset = Vector(move[1])
                    pb.matrix = Matrix.Translation(offset) @ pb.matrix
                    bpy.context.view_layer.update()
                    continue
                if move[0] == 'plant':
                    self.reach(pb, move[1], move[2])
                    continue
                head = pb.matrix.to_translation()
                if move[0] == 'ahead':
                    q = self.pointing(pb).rotation_difference(move[1])
                else:
                    q = move[1]
                pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
                bpy.context.view_layer.update()
        # What is carried, pointed by turning the bone that holds it. The turn's twist about the
        # forearm is shared out along it, as a forearm turns: a third by the elbow's twist bone,
        # two thirds by the wrist's, all of it by the hand; held in the wrist alone, it looked
        # wrenched and nailed on.
        for name, thing in getattr(self, 'held', {}).items():
            move = spec.get(name)
            if not move:
                continue
            pb = self.arm.pose.bones[thing.parent_bone]
            now = (thing.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
            q = now.rotation_difference(move[1])
            forearm = pb.parent
            axis = self.pointing(forearm)
            twist = Quaternion((q.w, *(axis * Vector(q[1:4]).dot(axis)))).normalized()
            angle = twist.angle if Vector(twist[1:4]).dot(axis) >= 0 else -twist.angle
            for child in forearm.children:
                if 'Twist01' in child.name:
                    self.spin(child, axis, angle / 3)
                    for grand in child.children:
                        if 'Twist02' in grand.name:
                            self.spin(grand, axis, angle / 3)
            head = pb.matrix.to_translation()
            pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
            bpy.context.view_layer.update()

    def spin(self, pb: bpy.types.PoseBone, axis: Vector, angle: float) -> None:
        """Turns a bone about an axis through its joint."""
        head = pb.matrix.to_translation()
        q = Quaternion(axis, angle)
        pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
        bpy.context.view_layer.update()

    def key(self, act: bpy.types.Action, frame: int, spec: dict) -> None:
        """Poses the rig and keys every bone at a frame."""
        self.arm.animation_data.action = act
        bpy.context.scene.frame_set(frame)
        self.pose(spec)
        for pb in self.arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=frame)
            pb.keyframe_insert('location', frame=frame)

    def export(self, path: str) -> None:
        """The rig with every action made, each its own clip."""
        arm = self.arm
        arm.animation_data.action = None
        for act in bpy.data.actions:
            track = arm.animation_data.nla_tracks.new()
            track.name = act.name
            track.strips.new(act.name, int(act.frame_range[0]), act)
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True,
                                  export_animation_mode='NLA_TRACKS')
        print('WROTE', path, [a.name for a in bpy.data.actions])
