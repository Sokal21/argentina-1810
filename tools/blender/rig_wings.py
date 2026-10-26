"""Bones for the chonchón's wings and hair, and its flight keyed on them.

    Blender -b --python tools/blender/rig_wings.py -- CHONCHON.glb OUT.glb
    Blender -b --python tools/blender/decimate.py -- OUT.glb OUT.glb --faces 2500

The model is Tripo's, one mesh and no rig (`prepare_model.py`: one unit tall, facing +Z in glTF,
-Y here). It is given a head bone, a jaw hinged on it, a chain of bones down its hair and another
down its tongue (hung from the jaw), and two bones in each wing, both from the shoulder (where the wing leaves the head behind the ear), as the ribs of a fan:
the arm, up its leading edge to the claw on top, and the finger, out to the wing's outer tip. The
membrane between is shared between them by its angle about the shoulder, all the arm's at the
leading edge and all the finger's at the outer tip and beyond. The hair below the head is shared
along the chain by where it lies along it, and with the head where it starts; so is the tongue,
found by its red before the mouth, with the jaw. The jaw is what lies under the mouth and before
its hinge, shading into the head at its edges.

The flap is keyed by hand, as a bird's seen from the front. The wings are first laid down level,
turned forward about the line from side to side through the shoulders till they stick out to the
sides flat (the user's drawing); then they beat about the line from front to back, their tips up
above level and down below, the downstroke the quicker. The finger comes a little late. The head
is on a spring the wings pull at: it rises with each downstroke a little after it, and nods, so it
does not move as stiffly as the wings. The hair sways from side to side and a little to and fro,
in a wave running down it, more toward its end, and is dragged after the head's rising and
falling. Its wave is as long as two flaps, so as not to keep time with them, and so is the clip.
The tongue wriggles from side to side, quicker, and flicks up and down after the head's nodding.
Tried and left: a bat's flap carried over (its wing is not shaped as this one: the membrane
crumpled and crossed the face); the wings beating about the line from front to back, stood up as
drawn (a sweep from side to side) or laid back (their tips closed in under the chin like a cape);
the wings beating about the line from side to side (a wheel turning forward, not a flap);
the head kicked by each downstroke, bouncing (worse than the head drawn smoothly after the wings).
"""
import math
import sys

import bpy
from mathutils import Euler, Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
MODEL, OUT = args[:2]
FPS = 24

# The chonchón's right wing (-X), measured on the model: the shoulder, the claw on top, and the
# outer tip. The left is the same mirrored.
SHOULDER, CLAW, TIP = Vector((-0.125, 0.03, 0.70)), Vector((-0.178, -0.03, 0.995)), Vector((-0.38, 0.05, 0.57))
HEAD = (Vector((0, 0, 0.35)), Vector((0, 0, 0.95)))
# Down the middle of the hair, measured on the model, from under the head to its end: it falls
# behind, swings to the left (+X) halfway and back.
DRAWN = [Vector(p) for p in [(0.0, 0.07, 0.52), (0.02, 0.08, 0.40), (0.10, 0.06, 0.30), (0.13, 0.06, 0.20), (0.08, 0.14, 0.11), (0.03, 0.16, 0.01)]]
# How many bones down it, of even length, so it can bend in an S.
BONES = 8
# Above this the head's alone; below ROOT, the hair's alone; between, shared.
CROWN, ROOT = 0.52, 0.44
# Down the tongue, measured on the model, from the mouth to its tip. It is what is red before the
# mouth (in front of FRONT, below MOUTH); the head's alone where it leaves the mouth, its own below
# LOLL.
TONGUE = [Vector(p) for p in [(0.0, -0.175, 0.645), (0.0, -0.19, 0.6), (0.0, -0.198, 0.555), (0.0, -0.2, 0.495)]]
FRONT, MOUTH, LOLL = -0.15, 0.68, 0.61
# The jaw, measured on the model: its hinge, before the ears at the height of the mouth, and its
# chin. It is what is under the mouth (LIPS), above BELOW, before BEHIND and within CHEEK of the
# middle; each edge shades into the head over EDGE.
HINGE, CHIN = Vector((0.0, -0.03, 0.655)), Vector((0.0, -0.13, 0.58))
LIPS, BELOW, BEHIND, CHEEK, EDGE = 0.645, 0.5, -0.03, 0.12, 0.015
# One flap, in frames (0.8 s, as the 2D one); the share of it the downstroke takes; how far forward
# the wings are turned from standing as drawn to lie level; how far above level their tips rise at
# the top of the stroke, and how far they turn from there to the bottom; how late the finger comes,
# at the stroke's quickest.
FLAP, DOWN = 19, 0.4
LAY, UP, BEAT, LAG = math.radians(70), math.radians(35), math.radians(75), math.radians(12)
# The head on a spring the wings pull toward how far down they are: how high it rises in all, of
# its height; how many times its spring would swing in one flap, and how soon it settles (1 at once,
# 0 never); how far it nods, at its quickest, about the middle of the head.
RISE, SPRING, SETTLE, NOD, PIVOT = 0.03, 1.6, 0.3, math.radians(7), Vector((0, 0, 0.7))
# Inside this, wholly the head; out past WING, wholly the wing; between, shared. Below LOW, hair.
INNER, WING, LOW = 0.125, 0.17, 0.22
# The hair's colours are all darker than this (of 1); the wings' violets are lighter, but their
# outlines and ribs are as dark as the hair. So hair is what is that dark where the hair hangs:
# under the head (below HANG) and near the middle (within REACH).
HAIR, HANG, REACH = 0.15, 0.6, 0.24
# How far each bone of the hair turns from the one above, at most, from top to end: from side to
# side, as a snake goes (the user's wish); to and fro; and dragged after the head. How far behind
# the one above each bone's wave is: a whole wave runs down a little more than the hair's length,
# so it bends in an S.
SWAY = [math.radians(a) for a in (5, 8, 10, 11, 12, 12, 12, 12)]
WAVE = [math.radians(a) for a in (1, 1, 2, 2, 2, 3, 3, 3)]
DRAG = [math.radians(a) for a in (1, 1, 2, 2, 3, 3, 4, 4)]
TRAVEL = 2 * math.pi / 7
# How far each bone of the tongue turns from the one above, at most: from side to side, how many
# times in the clip, and how far behind the one above; and up and down after the head's nodding.
WRIGGLE, WRIGGLES, LICK = [math.radians(a) for a in (10, 15, 20)], 5, 1.0
FLICK = [math.radians(a) for a in (6, 9, 12)]
# The dive's warning: as long as the brain's (WINDUP, 0.55 s); how high the wings lift, and how low
# their one hard beat goes; how far each bone of the tongue swings up to point ahead.
WARN, HIGH, LOW_BEAT = 13, math.radians(75), math.radians(-45)
AIM = [math.radians(a) for a in (-50, -15, -10)]
# The dive, a loop as long as STOOP: its wings, standing as drawn, swung back like doors about the
# upright till they lie along the head's sides, and leant back (their tops toward +Y); fluttering
# so much; each bone of the hair turned back to stream. (Laid back first and the finger swept to
# the arm, the membrane between, shared by two bones turned so differently, buckled out sideways.)
STOOP = 8
FOLD, SLANT, FLUTTER = math.radians(80), math.radians(-35), math.radians(4)
# The bite: so many frames (0.6 s, at the brain's pace), the jaws shut at SNAP (0.4 s); how wide the
# jaw opens and how far past drawn it shuts; how far back the head is drawn and thrust forward, how
# far its chin lifts as it draws back and dips as it bites; how far each bone of the tongue curls in.
BITE, SNAP = 15, 10
OPEN, SHUT = math.radians(28), math.radians(8)
PULL, THRUST, LIFT_CHIN, DIP = 0.05, 0.06, math.radians(12), math.radians(14)
CURL = [math.radians(a) for a in (70, 50, 40)]
STREAM = [math.radians(a) for a in (35, 10, 5, 5, 3, 3, 2, 2)]


def resampled(points: list[Vector], n: int) -> list[Vector]:
    """n + 1 points along a line through these, evenly spaced along it."""
    lengths = [(b - a).length for a, b in zip(points, points[1:])]
    out, i, gone = [points[0]], 0, 0.0
    for k in range(1, n):
        want = sum(lengths) * k / n
        while gone + lengths[i] < want:
            gone += lengths[i]
            i += 1
        out.append(points[i].lerp(points[i + 1], (want - gone) / lengths[i]))
    return out + [points[-1]]


LOCKS = resampled(DRAWN, BONES)
LICKS = range(len(TONGUE) - 1)


def side(p: Vector, s: str) -> Vector:
    return Vector((p.x if s == 'R' else -p.x, p.y, p.z))


# The chonchón, and its rig.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=MODEL)
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
held = mesh.matrix_world.copy()
mesh.parent = None
mesh.matrix_world = held
for o in list(bpy.data.objects):
    if o is not mesh: bpy.data.objects.remove(o)

rig = bpy.data.objects.new('chonchon', bpy.data.armatures.new('chonchon'))
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
head = rig.data.edit_bones.new('cabeza')
head.head, head.tail = HEAD
for s in 'RL':
    for rib, end in (('brazo', CLAW), ('dedo', TIP)):
        bone = rig.data.edit_bones.new(f'ala_{s}_{rib}')
        bone.head, bone.tail = side(SHOULDER, s), side(end, s)
        bone.parent = head
parent = head
for i in range(len(LOCKS) - 1):
    bone = rig.data.edit_bones.new(f'pelo_{i}')
    bone.head, bone.tail = LOCKS[i], LOCKS[i + 1]
    bone.parent = parent
    bone.use_connect = i > 0
    parent = bone
jaw = rig.data.edit_bones.new('mandibula')
jaw.head, jaw.tail = HINGE, CHIN
jaw.parent = head
parent = jaw
for i in LICKS:
    bone = rig.data.edit_bones.new(f'lengua_{i}')
    bone.head, bone.tail = TONGUE[i], TONGUE[i + 1]
    bone.parent = parent
    bone.use_connect = i > 0
    parent = bone
bpy.ops.object.mode_set(mode='OBJECT')


def angle(p: Vector) -> float:
    """Where a point of the right wing lies about the shoulder, seen from the front: 90 straight up,
    180 straight out, 270 straight down."""
    d = p - SHOULDER
    return math.degrees(math.atan2(d.z, d.x)) % 360


def along(p: Vector, chain: list[Vector]) -> float:
    """Where a point lies along a chain: 0 at its top, 1 at the end of the first bone, and so on, by
    the nearest point of the chain."""
    best = (9.0, 0.0)
    for i in range(len(chain) - 1):
        a, b = chain[i], chain[i + 1]
        t = max(0.0, min(1.0, (p - a).dot(b - a) / (b - a).length_squared))
        best = min(best, ((a + (b - a) * t - p).length, i + t))
    return best[1]


# The hair, black where the wings are violet, read off the texture: some of it falls behind the
# wings, and would go with them.
image = next(n.image for n in mesh.active_material.node_tree.nodes if n.type == 'TEX_IMAGE')
w, h = image.size
pixels = image.pixels[:]
uv = mesh.data.uv_layers.active.data
dark = {}
for loop in mesh.data.loops:
    u, t = uv[loop.index].uv
    i = (min(h - 1, int(t % 1 * h)) * w + min(w - 1, int(u % 1 * w))) * 4
    dark.setdefault(loop.vertex_index, []).append(max(pixels[i:i + 3]) < HAIR)
hair = {v for v, ds in dark.items() if sum(ds) > len(ds) / 2
        and (p := mesh.matrix_world @ mesh.data.vertices[v].co).z < HANG and abs(p.x) < REACH}
red = {}
for loop in mesh.data.loops:
    u, t = uv[loop.index].uv
    i = (min(h - 1, int(t % 1 * h)) * w + min(w - 1, int(u % 1 * w))) * 4
    r, g, b = pixels[i:i + 3]
    red.setdefault(loop.vertex_index, []).append(r > g * 1.6 and r > 0.18)
tongue = {v for v, rs in red.items() if sum(rs) > len(rs) / 2
          and (p := mesh.matrix_world @ mesh.data.vertices[v].co).y < FRONT and p.z < MOUTH}
print('TONGUE', len(tongue))
print('HAIR', len(hair), 'of', len(mesh.data.vertices))

# The weights.
LOCK = range(len(LOCKS) - 1)
groups = {n: mesh.vertex_groups.new(name=n) for n in ['cabeza'] + [f'ala_{s}_{r}' for s in 'RL' for r in ('brazo', 'dedo')]
          + [f'pelo_{i}' for i in LOCK] + [f'lengua_{i}' for i in LICKS] + ['mandibula']}
ARM, FINGER = angle(CLAW), angle(TIP)


def chained(v: int, p: Vector, chain: list[Vector], bones: range, name: str, own: float, rest: str = 'cabeza') -> None:
    """A point shared along a chain, each bone's share falling off from the middle of its stretch,
    and the rest of it the head's (or the jaw's)."""
    u = along(p, chain)
    near = {i: max(0.0, 1 - abs(u - (i + 0.5))) for i in bones}
    near[min(bones[-1], max(0, int(u)))] += 1e-3
    total = sum(near.values())
    for i, n in near.items():
        if n > 0: groups[f'{name}_{i}'].add([v], own * n / total, 'REPLACE')
    if own < 1: groups[rest].add([v], 1 - own, 'REPLACE')


def edge(inside: float) -> float:
    """How much is the jaw's, by how far within its edge a point is."""
    return min(1.0, max(0.0, inside / EDGE))


for v in mesh.data.vertices:
    p = mesh.matrix_world @ v.co
    if v.index in tongue:
        chained(v.index, p, TONGUE, LICKS, 'lengua', min(1.0, (MOUTH - p.z) / (MOUTH - LOLL)), 'mandibula')
        continue
    wing = 0.0 if p.z < LOW or v.index in hair else min(1.0, max(0.0, (abs(p.x) - INNER) / (WING - INNER)))
    chin = 0.0 if v.index in hair or wing > 0 else edge(LIPS - p.z) * edge(p.z - BELOW) * edge(BEHIND - p.y) * edge(CHEEK - abs(p.x))
    if chin > 0:
        groups['mandibula'].add([v.index], chin, 'REPLACE')
        if chin < 1: groups['cabeza'].add([v.index], 1 - chin, 'REPLACE')
        continue
    if wing <= 0 and p.z < CROWN:
        chained(v.index, p, LOCKS, LOCK, 'pelo', min(1.0, (CROWN - p.z) / (CROWN - ROOT)))
        continue
    if wing < 1: groups['cabeza'].add([v.index], 1 - wing, 'REPLACE')
    if wing <= 0: continue
    s = 'R' if p.x < 0 else 'L'
    out = min(1.0, max(0.0, (angle(side(p, s)) - ARM) / (FINGER - ARM)))
    if out < 1: groups[f'ala_{s}_brazo'].add([v.index], wing * (1 - out), 'REPLACE')
    if out > 0: groups[f'ala_{s}_dedo'].add([v.index], wing * out, 'REPLACE')
mesh.parent = rig
mod = mesh.modifiers.new('rig', 'ARMATURE')
mod.object = rig

def stroke(t: float) -> tuple[float, float]:
    """How far down the wing is (0 drawn, 1 the bottom) and how fast it goes down (+) or up (-)."""
    if t < DOWN:
        u = t / DOWN
        return (1 - math.cos(math.pi * u)) / 2, math.sin(math.pi * u)
    u = (t - DOWN) / (1 - DOWN)
    return (1 + math.cos(math.pi * u)) / 2, -math.sin(math.pi * u) * DOWN / (1 - DOWN)


def sprung() -> list[tuple[float, float]]:
    """The head's height and pace through one flap, from a spring pulled toward how far down the
    wings are: run for some flaps till it has settled into the same each time, and the last one
    kept, so the clip loops without a jump. Its height is scaled to RISE, its pace to 1 at most."""
    w = 2 * math.pi * SPRING / (FLAP / FPS)
    steps = 40
    dt = 1 / FPS / steps
    x = v = 0.0
    kept = []
    for flap in range(8):
        for k in range(FLAP):
            if flap == 7: kept.append((x, v))
            for _ in range(steps):
                down = stroke((k + _ / steps) / FLAP)[0]
                v += (w * w * (down - x) - 2 * SETTLE * w * v) * dt
                x += v * dt
    kept.append(kept[0])
    lo, hi = min(x for x, _ in kept), max(x for x, _ in kept)
    fast = max(abs(v) for _, v in kept)
    return [((x - lo) / (hi - lo) * RISE, v / fast) for x, v in kept]


def pose(k: int, height: float, nod: float, wings: tuple[float, float, float, float, float, float], hair: list[tuple[float, float]],
         tongue: list[tuple[float, float]], jaw: float = 0.0, back: float = 0.0) -> None:
    """Keys every bone at frame k: the head raised, drawn back (+Y) and nodded (chin down for
    more); the jaw opened (chin down for more); each wing laid forward (about X), its arm and finger
    each raised (about Y, mirrored on the left) and swept back (about Z, mirrored), and then the
    whole of it leant forward (about X again); each bone of the hair and the tongue turned to and
    fro and from side to side from the one above."""
    held = Matrix.Translation(Vector((0, back, height)) + PIVOT) @ Matrix.Rotation(-nod, 4, 'X') @ Matrix.Translation(-PIVOT)
    cab = rig.pose.bones['cabeza']
    cab.matrix = held @ rest['cabeza']
    bpy.context.view_layer.update()
    cab.keyframe_insert('location', frame=k)
    cab.keyframe_insert('rotation_quaternion', frame=k)
    mouth = rig.pose.bones['mandibula']
    mouth.matrix = held @ Matrix.Translation(HINGE) @ Matrix.Rotation(jaw, 4, 'X') @ Matrix.Translation(-HINGE) @ rest['mandibula']
    bpy.context.view_layer.update()
    mouth.keyframe_insert('rotation_quaternion', frame=k)
    mouth.keyframe_insert('location', frame=k)
    lay, arm, finger, arm_sweep, finger_sweep, slant = wings
    for s in 'RL':
        # Beating, this way lifts the right wing's tip (out at -X); sweeping, takes it back (+Y).
        way = 1 if s == 'R' else -1
        for rib, up, sweep in (('brazo', arm, arm_sweep), ('dedo', finger, finger_sweep)):
            pb = rig.pose.bones[f'ala_{s}_{rib}']
            at = rest[pb.name].translation
            turn = Matrix.Rotation(slant, 4, 'X') @ Matrix.Rotation(-way * sweep, 4, 'Z') @ Matrix.Rotation(way * up, 4, 'Y') @ Matrix.Rotation(lay, 4, 'X')
            pb.matrix = held @ Matrix.Translation(at) @ turn @ Matrix.Translation(-at) @ rest[pb.name]
            bpy.context.view_layer.update()
            pb.keyframe_insert('rotation_quaternion', frame=k)
            pb.keyframe_insert('location', frame=k)
    for name, turns in (('pelo', hair), ('lengua', tongue)):
        for i, (to_and_fro, aside) in enumerate(turns):
            pb = rig.pose.bones[f'{name}_{i}']
            pb.rotation_quaternion = Euler((to_and_fro, 0, aside)).to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=k)


def keyed(name: str, frames: int, at) -> None:
    """A clip of so many frames, each posed as `at` says."""
    rig.animation_data.action = bpy.data.actions.new(name)
    for k in range(frames + 1):
        scene.frame_set(k)
        pose(k, *at(k))
    print('CLIP', name, frames, 'frames')


def eased(u: float) -> float:
    return (1 - math.cos(math.pi * max(0.0, min(1.0, u)))) / 2


rig.animation_data_create()
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
scene = bpy.context.scene
head = sprung()
CLIP = 2 * FLAP


def hair_at(k: int, frames: int, drag: bool = True) -> list[tuple[float, float]]:
    """The hair's wave, running down it, and dragged after the head as the head went a frame earlier
    for each bone further down."""
    wave = 2 * math.pi * k / frames
    return [(WAVE[i] * math.sin(2 * wave - i * TRAVEL + 1) + (DRAG[i] * head[(k - i - 1) % FLAP][1] if drag else 0),
             SWAY[i] * math.sin(wave - i * TRAVEL)) for i in LOCK]


def flying(k: int):
    down, going = stroke(k % FLAP / FLAP)
    # The head up as high as its spring has it, and nodding as fast as it goes: chin down as it rises.
    height, pace = head[k % FLAP]
    wave = 2 * math.pi * k / CLIP
    tongue = [(FLICK[i] * head[(k - i - 1) % FLAP][1], WRIGGLE[i] * math.sin(WRIGGLES * wave - i * LICK)) for i in LICKS]
    return height, NOD * pace, (LAY, UP - BEAT * down, UP - BEAT * down + LAG * going, 0.0, 0.0, 0.0), hair_at(k, CLIP), tongue


def warning(k: int):
    """The warning before a dive, as long as the brain's: the wings lift high, beat down hard once
    and lift high again, held there; the tongue, wriggling quicker, swings up till it points ahead."""
    u = k / WARN
    if u < 0.35: arm = UP + (HIGH - UP) * eased(u / 0.35)
    elif u < 0.65: arm = HIGH - (HIGH - LOW_BEAT) * eased((u - 0.35) / 0.3)
    else: arm = LOW_BEAT + (HIGH - LOW_BEAT) * eased((u - 0.65) / 0.3)
    going = 1.0 if 0.35 <= u < 0.65 else -0.5 if u < 0.95 and u >= 0.65 else 0.0
    height = RISE * eased((u - 0.35) / 0.4)
    aim = eased(u / 0.8)
    tongue = [(aim * AIM[i], WRIGGLE[i] * 0.6 * math.sin(2 * math.pi * 3 * u - i * LICK)) for i in LICKS]
    return height, 0.0, (LAY, arm, arm + LAG * going, 0.0, 0.0, 0.0), hair_at(k, WARN, drag=False), tongue


def diving(k: int):
    """The dive, a short loop: the wings folded back along the head, fluttering a little; the hair
    streaming back; the tongue pointing ahead, quivering."""
    u = k / STOOP
    flutter = FLUTTER * math.sin(2 * math.pi * u)
    hair = [(STREAM[i] + 0.3 * SWAY[i] * math.sin(2 * math.pi * u * 2 - i * TRAVEL), 0.4 * SWAY[i] * math.sin(2 * math.pi * u - i * TRAVEL)) for i in LOCK]
    tongue = [(AIM[i], WRIGGLE[i] * 0.3 * math.sin(2 * math.pi * 2 * u - i * LICK)) for i in LICKS]
    return 0.0, 0.0, (0.0, flutter, flutter * 1.5, FOLD, FOLD, SLANT), hair, tongue


keyed('vuelo', CLIP, flying)
keyed('picada_aviso', WARN, warning)
keyed('picada', STOOP, diving)


def biting(k: int):
    """The bite, as long as the brain's (BITE_TIME, 0.6 s), its jaws shutting at SNAP (BITE_SNAP,
    0.4 s): it draws its head back and up, opens wide, lifts its wings tense and curls its tongue in;
    then thrusts, shuts its jaw hard past where it is drawn and a little back, and beats its wings
    down; and lets go, as it is drawn and flying again."""
    charge = eased(k / (SNAP - 2))
    after = eased((k - SNAP) / (BITE - SNAP))
    if k <= SNAP - 2: jaw, back, nod, arm = OPEN * charge, PULL * charge, -LIFT_CHIN * charge, UP + (HIGH - UP) * charge
    elif k < SNAP: jaw, back, nod, arm = OPEN * 0.35, (PULL - THRUST) / 2, 0.0, (HIGH + LOW_BEAT) / 2
    elif k == SNAP: jaw, back, nod, arm = -SHUT, -THRUST, DIP, LOW_BEAT
    else: jaw, back, nod, arm = -SHUT * 0.5 * (1 - after), -THRUST * (1 - after), DIP * (1 - after), LOW_BEAT + (UP - LOW_BEAT) * after
    going = 1.0 if SNAP - 2 < k <= SNAP else 0.0
    curl = eased(k / (SNAP - 2)) * (1 - eased((k - SNAP - 1) / (BITE - SNAP - 1)))
    tongue = [(CURL[i] * curl, WRIGGLE[i] * 0.3 * math.sin(2 * math.pi * 2 * k / BITE - i * LICK)) for i in LICKS]
    return 0.0, nod, (LAY, arm, arm + LAG * going, 0.0, 0.0, 0.0), hair_at(k, BITE, drag=False), tongue, jaw, back


keyed('mordida', BITE, biting)
bpy.ops.object.mode_set(mode='OBJECT')
# Only these clips go out.
for a in list(bpy.data.actions):
    if a.name not in ('vuelo', 'picada_aviso', 'picada', 'mordida'): bpy.data.actions.remove(a)
print('SKIN', len(mesh.vertex_groups), sum(len(v.groups) for v in mesh.data.vertices), [m.type for m in mesh.modifiers], mesh.parent)
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 0, CLIP
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_force_sampling=True)
print('WROTE', OUT)
