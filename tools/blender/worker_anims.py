"""
Blender (4.x) build script for the construction-worker characters.

    blender -b --python tools/blender/worker_anims.py -- <in.gltf> <out.glb>

* Imports a Quaternius "Ultimate Modular" Worker (CC0).
* Keeps only the useful clips (Idle, Idle_Neutral, Walk, Run, Interact, Wave).
* Bakes new looping task clips on the same rig — Hammer, Shovel, Kneel,
  Trowel, Plaster, Paint, Drill, Survey, Point, Vibrate, Carry — by posing
  bones in armature space on top of a base clip and keyframing every frame.
* Models the hand tools and skins each one rigidly to the right wrist bone,
  so a tool always stays in the hand (one object per tool, named Tool_<kind>;
  the web app shows the one a worker needs).
* Exports a GLB with the armature, meshes, tools and all clips.
"""
import math
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
FPS = 30

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene
scene.render.fps = FPS

arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in list(bpy.data.objects):
    if o.type == 'MESH' and (o.parent is None or o.name.startswith('Icosphere')):  # stray helper sphere
        bpy.data.objects.remove(o)

KEEP = {'Idle', 'Idle_Neutral', 'Walk', 'Run', 'Interact', 'Wave'}
for a in list(bpy.data.actions):
    base = a.name.replace('_CharacterArmature', '')
    if base in KEEP:
        a.name = base
    else:
        bpy.data.actions.remove(a)

bpy.context.view_layer.objects.active = arm
if not arm.animation_data:
    arm.animation_data_create()
PB = arm.pose.bones
upd = bpy.context.view_layer.update


def apply_base(action, frame):
    # clear any pose left over from the previous frame (unkeyed channels persist)
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
    arm.animation_data.action = action
    scene.frame_set(int(frame))
    upd()


def rot(name, axis, angle):
    """Rotate a pose bone about an armature-space axis through its head."""
    if name not in PB or not angle:
        return
    pb = PB[name]
    m = pb.matrix.copy()
    head = m.translation.copy()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-head) @ m
    upd()


def lower_body(dz):
    pb = PB['Body'] if 'Body' in PB else PB['Hips']
    m = pb.matrix.copy()
    m.translation.z += dz
    pb.matrix = m
    upd()


def plant_feet(pitch_r=0.0):
    """Put the (Root-parented) feet back at the shin ends after the legs moved."""
    for side, pitch in (('L', 0.0), ('R', pitch_r)):
        foot, shin = PB.get('Foot.' + side), PB.get('LowerLeg.' + side)
        if not foot or not shin:
            continue
        m = foot.matrix.copy()
        r = Matrix.Rotation(pitch, 4, 'X') @ m.to_3x3().to_4x4()
        r.translation = shin.tail.copy()
        foot.matrix = r
        upd()


s = math.sin
TAU = math.pi * 2
G = 0.7  # same gain the old runtime layering used for upper-body motions


def pose_carry(u):
    for side in 'LR':
        rot('UpperArm.' + side, 'X', -1.0 * G)
        rot('LowerArm.' + side, 'X', -0.7 * G)


def pose_hammer(u):
    c = u % 1
    up = c / 0.65 if c < 0.65 else 1 - (c - 0.65) / 0.35
    rot('Abdomen', 'X', 0.35 * G)
    rot('UpperArm.R', 'X', (-0.8 - up * 1.7) * G)
    rot('LowerArm.R', 'X', (-0.5 - up * 0.6) * G)
    rot('UpperArm.L', 'X', -0.9 * G)
    rot('LowerArm.L', 'X', -0.6 * G)
    rot('Neck', 'X', 0.3 * G)


def pose_shovel(u):
    c = s(u * TAU)
    rot('Abdomen', 'X', (0.45 + c * 0.25) * G)
    rot('UpperArm.R', 'X', (-0.9 + c * 0.4) * G)
    rot('UpperArm.L', 'X', (-1.2 + c * 0.4) * G)
    rot('LowerArm.R', 'X', -0.4 * G)
    rot('LowerArm.L', 'X', -0.3 * G)
    rot('UpperLeg.L', 'X', -0.35 * G)
    rot('LowerLeg.L', 'X', 0.5 * G)
    rot('UpperLeg.R', 'X', 0.2 * G)
    plant_feet()


def pose_kneel(u):
    # right knee on the floor (shin flat behind), left foot planted forward,
    # torso leaning over the work, hands busy at ground level
    lower_body(-0.45)
    rot('UpperLeg.L', 'X', -1.3)   # thigh forward
    rot('LowerLeg.L', 'X', 1.35)   # shin back to vertical
    rot('UpperLeg.R', 'X', 0.05)   # thigh straight down to the knee
    rot('LowerLeg.R', 'X', 1.5)    # shin flat on the floor, behind
    plant_feet(pitch_r=1.3)
    rot('Abdomen', 'X', (0.5 + s(u * TAU) * 0.05) * G)
    rot('Torso', 'X', 0.2 * G)
    rot('Neck', 'X', 0.35 * G)
    rot('UpperArm.R', 'X', (-0.75 + s(u * TAU * 2) * 0.15) * G)
    rot('UpperArm.L', 'X', (-0.65 + s(u * TAU * 2 + 1.5) * 0.15) * G)
    rot('LowerArm.R', 'X', -0.6 * G)
    rot('LowerArm.L', 'X', -0.6 * G)


def pose_trowel(u):
    rot('Abdomen', 'X', 0.3 * G)
    rot('UpperArm.R', 'X', -1.2 * G)
    rot('UpperArm.R', 'Z', s(u * TAU) * 0.5 * G)
    rot('LowerArm.R', 'X', -0.4 * G)
    rot('UpperArm.L', 'X', -0.7 * G)
    rot('LowerArm.L', 'X', -0.8 * G)
    rot('Neck', 'X', 0.2 * G)


def pose_plaster(u):
    c = s(u * TAU)
    rot('UpperArm.R', 'X', (-1.6 - c * 0.6) * G)
    rot('LowerArm.R', 'X', -0.3 * G)
    rot('UpperArm.L', 'X', -1.0 * G)
    rot('LowerArm.L', 'X', -1.0 * G)
    rot('Neck', 'X', (-0.2 - c * 0.15) * G)


def pose_paint(u):
    c = s(u * TAU)
    rot('UpperArm.R', 'X', (-1.4 - c * 0.5) * G)
    rot('UpperArm.L', 'X', (-1.3 - c * 0.5) * G)
    rot('LowerArm.R', 'X', -0.6 * G)
    rot('LowerArm.L', 'X', -0.6 * G)
    rot('Neck', 'X', -0.35 * G)


def pose_drill(u):
    rot('UpperArm.R', 'X', (-1.45 + s(u * TAU * 8) * 0.015) * G)
    rot('LowerArm.R', 'X', -0.2 * G)
    rot('UpperArm.L', 'X', -1.35 * G)
    rot('LowerArm.L', 'X', -0.4 * G)


def pose_survey(u):
    rot('Abdomen', 'X', 0.25 * G)
    rot('Neck', 'X', 0.25 * G)
    for side in 'LR':
        rot('UpperArm.' + side, 'X', -1.0 * G)
        rot('LowerArm.' + side, 'X', -0.9 * G)


def pose_point(u):
    rot('UpperArm.R', 'X', (-1.5 + s(u * TAU) * 0.1) * G)
    rot('UpperArm.R', 'Z', 0.3 * G)
    rot('Neck', 'Z', s(u * TAU) * 0.4 * G)


def pose_vibrate(u):
    rot('Abdomen', 'X', 0.35 * G)
    rot('UpperArm.R', 'X', (-0.9 + s(u * TAU * 10) * 0.02) * G)
    rot('UpperArm.L', 'X', -1.0 * G)
    rot('LowerArm.R', 'X', -0.5 * G)
    rot('LowerArm.L', 'X', -0.5 * G)


ACTIONS = bpy.data.actions
CLIPS = {
    # name: (pose fn, base action, loop length in seconds)
    'Carry': (pose_carry, 'Walk', None),
    'Hammer': (pose_hammer, 'Idle_Neutral', 1 / 2.2 * 2),
    'Shovel': (pose_shovel, 'Idle_Neutral', TAU / 2.4),
    'Kneel': (pose_kneel, 'Idle_Neutral', TAU / 3),
    'Trowel': (pose_trowel, 'Idle_Neutral', TAU / 2.5),
    'Plaster': (pose_plaster, 'Idle_Neutral', TAU / 2),
    'Paint': (pose_paint, 'Idle_Neutral', TAU / 1.8),
    'Drill': (pose_drill, 'Idle_Neutral', 1.0),
    'Survey': (pose_survey, 'Idle_Neutral', 4.0),
    'Point': (pose_point, 'Idle_Neutral', TAU / 0.8),
    'Vibrate': (pose_vibrate, 'Idle_Neutral', 1.0),
}

CHANNELS = ('location', 'rotation_quaternion')


def bake(name, fn, base_name, seconds):
    base = ACTIONS[base_name]
    b0, b1 = base.frame_range
    if seconds is None:  # follow the base clip exactly (Carry = Walk + arms)
        n = int(round(b1 - b0))
    else:
        n = max(8, int(round(seconds * FPS)))
    frames = {}
    for f in range(n + 1):
        span = max(1, int(b1 - b0))
        apply_base(base, b0 + (f % span) if seconds is None else b0)
        arm.animation_data.action = None
        fn((f / n) % 1.0)
        frames[f] = {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()) for pb in PB}
    act = ACTIONS.new(name)
    for pb in PB:
        path = 'pose.bones["%s"].' % pb.name
        for ci, (ch, size) in enumerate((('location', 3), ('rotation_quaternion', 4), ('scale', 3))):
            for i in range(size):
                fc = act.fcurves.new(path + ch, index=i, action_group=pb.name)
                fc.keyframe_points.add(n + 1)
                for f in range(n + 1):
                    val = frames[f][pb.name][ci][i]
                    kp = fc.keyframe_points[f]
                    kp.co = (f, val)
                    kp.interpolation = 'LINEAR'
    act.use_fake_user = True
    act.id_root = 'OBJECT'
    # register on the armature (muted NLA strip) so the glTF exporter picks it up
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(act.frame_range[0]), act)
    track.mute = True
    print('baked', name, n, 'frames')


for name, (fn, base, secs) in CLIPS.items():
    bake(name, fn, base, secs)

# --------------------------------------------------------------------------
# Hand tools. Each tool is modelled in world space *in its working pose*
# (e.g. the roller pole upright while the Paint clip raises the arms), then
# mapped back to the rest pose through the inverse wrist deformation and
# skinned 100 % to the wrist bone — so during that clip it sits exactly as
# modelled, and it always stays in the hand.
# --------------------------------------------------------------------------
def mat(name, color, metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    return m


M_WOOD = mat('ToolWood', (0.45, 0.28, 0.14), 0, 0.7)
M_STEEL = mat('ToolSteel', (0.55, 0.57, 0.6), 1, 0.35)
M_YELLOW = mat('ToolYellow', (0.95, 0.68, 0.05), 0.2, 0.45)
M_BLACK = mat('ToolBlack', (0.05, 0.05, 0.05), 0, 0.6)
M_RED = mat('ToolRed', (0.8, 0.1, 0.08), 0, 0.5)
M_WHITE = mat('ToolWhite', (0.92, 0.9, 0.86), 0, 0.8)
M_BLOCK = mat('ToolBlock', (0.62, 0.6, 0.57), 0, 0.95)

# character frame in Blender: faces −Y, up +Z, its right hand on the −X side
F, U, R = Vector((0, -1, 0)), Vector((0, 0, 1)), Vector((-1, 0, 0))


def basis(z, x_hint):
    z = z.normalized()
    x = (x_hint - z * x_hint.dot(z)).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed()
    return m.to_4x4()


def add_obj(bm, material, parts):
    me = bpy.data.meshes.new('p')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('p', me)
    o.data.materials.append(material)
    bpy.context.collection.objects.link(o)
    parts.append(o)


def rod(parts, a, b, r, material, segs=12):
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=(b - a).length)
    m = Matrix.Translation((a + b) / 2) @ basis(b - a, R if abs((b - a).normalized().dot(R)) < 0.9 else F)
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    add_obj(bm, material, parts)


def slab(parts, centre, size, z_axis, x_axis, material):
    """Box of size (sx along x_axis, sy, sz along z_axis) centred at centre."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(centre)) @ basis(z_axis, x_axis), verts=bm.verts)
    add_obj(bm, material, parts)


def tool(kind, clip, frac, build):
    act = ACTIONS[clip]
    f0, f1 = act.frame_range
    arm.animation_data.action = act
    scene.frame_set(int(f0 + (f1 - f0) * frac))
    upd()
    pb, bone = PB['Wrist.R'], arm.data.bones['Wrist.R']
    deform = pb.matrix @ bone.matrix_local.inverted()  # rest → posed (armature space)
    d = (pb.tail - pb.head).normalized()
    grip = pb.tail + d * 0.05  # centre of the closed fist
    parts = []
    build(parts, grip, d)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    t = bpy.context.view_layer.objects.active
    t.name = t.data.name = 'Tool_' + kind
    t.data.transform(deform.inverted())  # back to the rest pose
    vg = t.vertex_groups.new(name='Wrist.R')
    vg.add([v.index for v in t.data.vertices], 1.0, 'REPLACE')
    t.parent = arm
    t.modifiers.new('Armature', 'ARMATURE').object = arm
    arm.animation_data.action = None
    upd()


def b_roller(p, g, d):  # pole up from the fist, roller across the top
    rod(p, g - U * 0.15, g + U * 0.95, 0.012, M_STEEL)
    rod(p, g + U * 0.95 + F * 0.0, g + U * 0.95 + F * 0.07, 0.01, M_STEEL)
    rod(p, g + U * 0.98 + F * 0.07 - R * 0.13, g + U * 0.98 + F * 0.07 + R * 0.13, 0.042, M_WHITE, 16)


def b_hammer(p, g, d):  # handle along the forearm, head across the end
    end = g + d * 0.26
    rod(p, g - d * 0.06, end, 0.014, M_WOOD)
    slab(p, end, (0.035, 0.035, 0.13), (U - F * 0.0), d, M_STEEL)


def b_shovel(p, g, d):  # shaft forward/down to the ground, blade on it
    tip = Vector((g.x - 0.05, g.y - 0.55, 0.05))
    rod(p, g + (g - tip).normalized() * 0.12, tip, 0.017, M_WOOD)
    slab(p, tip + (tip - g).normalized() * 0.1, (0.24, 0.02, 0.3), (tip - g), R, M_STEEL)


def b_trowel(p, g, d):  # handle in the fist, flat blade forward
    rod(p, g - d * 0.05, g + d * 0.06, 0.016, M_WOOD)
    slab(p, g + d * 0.16 - U * 0.02, (0.11, 0.2, 0.006), U, R, M_STEEL)


def b_drill(p, g, d):  # pistol grip in the fist, body above pointing forward
    slab(p, g, (0.05, 0.05, 0.12), U, R, M_BLACK)
    slab(p, g + U * 0.08 + F * 0.05, (0.07, 0.2, 0.08), U, R, M_YELLOW)
    slab(p, g - U * 0.08, (0.07, 0.08, 0.05), U, R, M_BLACK)
    rod(p, g + U * 0.08 + F * 0.15, g + U * 0.08 + F * 0.27, 0.006, M_STEEL, 8)


def b_vibrator(p, g, d):  # wand from the fist down into the concrete
    tip = Vector((g.x, g.y - 0.6, 0.05))
    rod(p, g + (g - tip).normalized() * 0.05, tip, 0.022, M_BLACK)


def b_block(p, g, d):  # concrete block held in front, between the hands
    slab(p, g + F * 0.05 - R * 0.17 + U * 0.03, (0.4, 0.2, 0.2), U, R, M_BLOCK)


def b_clipboard(p, g, d):
    slab(p, g + F * 0.04, (0.24, 0.012, 0.32), U, R, M_WOOD)
    slab(p, g + F * 0.048, (0.21, 0.004, 0.28), U, R, M_WHITE)


def b_prism(p, g, d):  # survey pole standing on the ground next to the worker
    base = Vector((g.x, g.y, 0.0))
    rod(p, base, base + U * 2.0, 0.012, M_RED)
    rod(p, base + U * 1.97, base + U * 2.05, 0.045, M_WHITE, 16)


tool('roller', 'Paint', 0.25, b_roller)
tool('hammer', 'Hammer', 0.0, b_hammer)
tool('shovel', 'Shovel', 0.5, b_shovel)
tool('trowel', 'Trowel', 0.0, b_trowel)
tool('drill', 'Drill', 0.0, b_drill)
tool('vibrator', 'Vibrate', 0.0, b_vibrator)
tool('block', 'Carry', 0.0, b_block)
tool('clipboard', 'Idle', 0.0, b_clipboard)
tool('prism', 'Idle', 0.0, b_prism)

arm.data.pose_position = 'POSE'
upd()


bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True,
    export_skins=True, export_apply=False, export_yup=True,
)
print('EXPORTED', OUT)
