"""Build the lightweight semester aircraft used by the browser visualization.

Run with:
  blender --background --python scripts/build-course-aircraft.py

The exported aircraft uses the course frame: +x forward, +y right, +z up.
Parts stay separately named so instructor-owned visual lessons can address them.
"""

from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = ROOT / "assets" / "blender" / "course-aircraft.blend"
GLB_PATH = ROOT / "public" / "models" / "course-aircraft.glb"


def material(name, color, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (*color, 1.0)
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    return mat


def smooth(object_):
    for polygon in object_.data.polygons:
        polygon.use_smooth = True
    bevel = object_.modifiers.new("Edge softness", "BEVEL")
    bevel.width = 0.008
    bevel.segments = 2


def uv_shape(name, location, scale, mat, segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def mesh_object(name, vertices, faces, mat, bevel=0.006):
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Edge softness", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def trapezoid_surface(name, x_root_front, x_root_back, x_tip_front, x_tip_back, y_root, y_tip, z, thickness, mat):
    top = z + thickness / 2
    bottom = z - thickness / 2
    vertices = [
        (x_root_front, y_root, top), (x_root_back, y_root, top),
        (x_tip_back, y_tip, top), (x_tip_front, y_tip, top),
        (x_root_front, y_root, bottom), (x_root_back, y_root, bottom),
        (x_tip_back, y_tip, bottom), (x_tip_front, y_tip, bottom),
    ]
    faces = [
        (0, 1, 2, 3), (7, 6, 5, 4),
        (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0),
    ]
    return mesh_object(name, vertices, faces, mat)


def vertical_surface(name, x_front_base, x_back_base, x_front_tip, x_back_tip, z_base, z_tip, thickness, mat):
    half = thickness / 2
    vertices = [
        (x_front_base, -half, z_base), (x_back_base, -half, z_base),
        (x_back_tip, -half, z_tip), (x_front_tip, -half, z_tip),
        (x_front_base, half, z_base), (x_back_base, half, z_base),
        (x_back_tip, half, z_tip), (x_front_tip, half, z_tip),
    ]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (3, 7, 6, 2), (1, 2, 6, 5), (0, 4, 7, 3)]
    return mesh_object(name, vertices, faces, mat)


def cylinder_between(name, start, end, radius, mat, vertices=12):
    midpoint = (Vector(start) + Vector(end)) / 2
    direction = Vector(end) - Vector(start)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    obj.data.materials.append(mat)
    return obj


def add_text_marker(name, location, radius, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=radius * 0.16, major_segments=20, minor_segments=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (math.pi / 2, 0, 0)
    obj.data.materials.append(mat)
    return obj


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)

    ivory = material("Warm Ivory", (0.78, 0.82, 0.78), metallic=0.12, roughness=0.34)
    orange = material("Course Orange", (0.96, 0.19, 0.07), metallic=0.05, roughness=0.38)
    deep_green = material("Deep Green", (0.025, 0.16, 0.13), metallic=0.08, roughness=0.42)
    canopy = material("Canopy Blue", (0.035, 0.19, 0.24), metallic=0.5, roughness=0.2)
    charcoal = material("Landing Gear", (0.035, 0.045, 0.043), metallic=0.4, roughness=0.48)
    lime = material("Teaching Marker", (0.69, 0.83, 0.30), metallic=0.0, roughness=0.45)

    # A compact, single-engine course aircraft: clean enough to read on an iPad,
    # detailed enough that students can identify the major lifting/control parts.
    uv_shape("Fuselage", (0.03, 0, 0.05), (0.59, 0.105, 0.115), ivory)
    uv_shape("Nose_Cowling", (0.57, 0, 0.045), (0.20, 0.11, 0.11), orange, 20, 10)
    uv_shape("Canopy", (-0.06, 0, 0.145), (0.22, 0.082, 0.065), canopy, 20, 10)
    uv_shape("Spinner", (0.755, 0, 0.045), (0.075, 0.055, 0.055), deep_green, 18, 8)

    # Wings: baseline span 1.60 m and mean chord approximately 0.32 m.
    trapezoid_surface("Wing_Right", 0.22, -0.14, 0.12, -0.12, 0.04, 0.80, 0.055, 0.026, orange)
    trapezoid_surface("Wing_Left", 0.22, -0.14, 0.12, -0.12, -0.04, -0.80, 0.055, 0.026, orange)
    trapezoid_surface("Aileron_Right", -0.08, -0.15, -0.08, -0.13, 0.34, 0.74, 0.052, 0.018, deep_green)
    trapezoid_surface("Aileron_Left", -0.08, -0.15, -0.08, -0.13, -0.34, -0.74, 0.052, 0.018, deep_green)

    trapezoid_surface("HorizontalTail_Right", -0.39, -0.58, -0.42, -0.57, 0.02, 0.30, 0.075, 0.018, deep_green)
    trapezoid_surface("HorizontalTail_Left", -0.39, -0.58, -0.42, -0.57, -0.02, -0.30, 0.075, 0.018, deep_green)
    trapezoid_surface("Elevator_Right", -0.52, -0.61, -0.52, -0.60, 0.03, 0.285, 0.074, 0.014, orange)
    trapezoid_surface("Elevator_Left", -0.52, -0.61, -0.52, -0.60, -0.03, -0.285, 0.074, 0.014, orange)
    vertical_surface("VerticalTail", -0.45, -0.60, -0.49, -0.57, 0.07, 0.34, 0.022, deep_green)
    vertical_surface("Rudder", -0.55, -0.62, -0.55, -0.60, 0.09, 0.31, 0.016, orange)

    # Propeller and simple fixed landing gear add readable aircraft character.
    cylinder_between("Propeller_Hub", (0.76, 0, 0.045), (0.81, 0, 0.045), 0.028, charcoal, 16)
    cylinder_between("Propeller_Blade_Top", (0.81, 0, 0.045), (0.81, 0.015, 0.235), 0.018, deep_green, 10)
    cylinder_between("Propeller_Blade_Bottom", (0.81, 0, 0.045), (0.81, -0.015, -0.145), 0.018, deep_green, 10)
    for side in (-1, 1):
        cylinder_between(f"Main_Gear_{'Left' if side < 0 else 'Right'}", (0.12, side * 0.08, 0.00), (0.04, side * 0.22, -0.16), 0.012, charcoal, 10)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.043, minor_radius=0.014, major_segments=16, minor_segments=8, location=(0.04, side * 0.22, -0.19), rotation=(math.pi / 2, 0, 0))
        wheel = bpy.context.object
        wheel.name = f"Main_Wheel_{'Left' if side < 0 else 'Right'}"
        wheel.data.materials.append(charcoal)
    cylinder_between("Nose_Gear", (0.52, 0, -0.015), (0.52, 0, -0.14), 0.01, charcoal, 10)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.033, minor_radius=0.011, major_segments=16, minor_segments=8, location=(0.52, 0, -0.17), rotation=(math.pi / 2, 0, 0))
    bpy.context.object.name = "Nose_Wheel"
    bpy.context.object.data.materials.append(charcoal)

    # Hidden-by-default named markers are available to later instructor lessons.
    cg = add_text_marker("CG_Marker", (0.02, 0, 0.20), 0.045, lime)
    cg.hide_render = True
    cg.hide_viewport = True

    root = bpy.data.objects.new("Semester_Aircraft", None)
    bpy.context.collection.objects.link(root)
    for obj in list(bpy.context.scene.objects):
        if obj != root and obj.parent is None:
            obj.parent = root

    # Metadata makes the baseline and frame discoverable by future core code.
    root["baselineWingSpanM"] = 1.6
    root["baselineMeanChordM"] = 0.32
    root["coordinateFrame"] = "+x forward, +y right, +z up"

    world = bpy.data.worlds.new("Course World")
    world.color = (0.02, 0.03, 0.025)
    bpy.context.scene.world = world
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    # Keep the teaching marker in the editable .blend, but let modules add it as
    # live data rather than baking it into the normal browser model.
    bpy.data.objects.remove(cg, do_unlink=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_extras=True,
        export_materials="EXPORT",
    )
    print(f"Saved {BLEND_PATH}")
    print(f"Exported {GLB_PATH}")


build()
