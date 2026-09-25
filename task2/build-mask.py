"""Build the curved, textured glTF mask used by both MindAR modes.

Run from the repository root: python task2/build-mask.py
Only Python's standard library is required.
"""

import json
import math
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TEXTURE = ROOT / "assets" / "this-man-face.png"
OUTPUT = ROOT / "assets" / "this-man-mask.glb"

COLS = 24
ROWS = 24
WIDTH = 1.35
HEIGHT = 1.20
CURVE = 0.075


def pad4(data, byte=b"\0"):
    return data + byte * (-len(data) % 4)


positions = []
normals = []
uvs = []
indices = []

for row in range(ROWS + 1):
    fy = row / ROWS
    y = (fy - 0.5) * HEIGHT
    for col in range(COLS + 1):
        fx = col / COLS
        x = (fx - 0.5) * WIDTH
        nx = x / (WIDTH / 2)
        ny = y / (HEIGHT / 2)
        z = CURVE * (1 - nx * nx) * (1 - ny * ny)
        dzdx = CURVE * (-2 * nx / (WIDTH / 2)) * (1 - ny * ny)
        dzdy = CURVE * (-2 * ny / (HEIGHT / 2)) * (1 - nx * nx)
        normal = (-dzdx, -dzdy, 1.0)
        magnitude = math.sqrt(sum(value * value for value in normal))
        positions.extend((x, y, z))
        normals.extend(value / magnitude for value in normal)
        # glTF texture origin is at the top-left of the image.
        uvs.extend((fx, 1 - fy))

for row in range(ROWS):
    for col in range(COLS):
        a = row * (COLS + 1) + col
        b = a + 1
        c = a + COLS + 1
        d = c + 1
        indices.extend((a, b, c, b, d, c))


binary = bytearray()
views = []


def add_view(data, target=None):
    offset = len(binary)
    binary.extend(data)
    binary.extend(b"\0" * (-len(binary) % 4))
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
    if target is not None:
        view["target"] = target
    views.append(view)
    return len(views) - 1


position_view = add_view(struct.pack(f"<{len(positions)}f", *positions), 34962)
normal_view = add_view(struct.pack(f"<{len(normals)}f", *normals), 34962)
uv_view = add_view(struct.pack(f"<{len(uvs)}f", *uvs), 34962)
index_view = add_view(struct.pack(f"<{len(indices)}H", *indices), 34963)
image_view = add_view(TEXTURE.read_bytes())

gltf = {
    "asset": {"version": "2.0", "generator": "task2/build-mask.py"},
    "scene": 0,
    "scenes": [{"nodes": [0]}],
    "nodes": [{"name": "This Man mask", "mesh": 0}],
    "meshes": [{"primitives": [{
        "attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2},
        "indices": 3,
        "material": 0,
    }]}],
    "buffers": [{"byteLength": len(binary)}],
    "bufferViews": views,
    "accessors": [
        {"bufferView": position_view, "componentType": 5126, "count": len(positions) // 3,
         "type": "VEC3", "min": [-WIDTH / 2, -HEIGHT / 2, 0],
         "max": [WIDTH / 2, HEIGHT / 2, CURVE]},
        {"bufferView": normal_view, "componentType": 5126, "count": len(normals) // 3,
         "type": "VEC3"},
        {"bufferView": uv_view, "componentType": 5126, "count": len(uvs) // 2,
         "type": "VEC2"},
        {"bufferView": index_view, "componentType": 5123, "count": len(indices),
         "type": "SCALAR"},
    ],
    "images": [{"bufferView": image_view, "mimeType": "image/png"}],
    "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
    "textures": [{"sampler": 0, "source": 0}],
    "materials": [{
        "name": "Illustrated face",
        "pbrMetallicRoughness": {
            "baseColorTexture": {"index": 0},
            "baseColorFactor": [1, 1, 1, 1],
            "metallicFactor": 0,
            "roughnessFactor": 0.9,
        },
        "alphaMode": "BLEND",
        "doubleSided": True,
    }],
}

json_chunk = pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
bin_chunk = pad4(bytes(binary))
total_length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
glb = (
    struct.pack("<III", 0x46546C67, 2, total_length)
    + struct.pack("<II", len(json_chunk), 0x4E4F534A)
    + json_chunk
    + struct.pack("<II", len(bin_chunk), 0x004E4942)
    + bin_chunk
)
OUTPUT.write_bytes(glb)
print(f"Wrote {OUTPUT} ({len(glb)} bytes)")
