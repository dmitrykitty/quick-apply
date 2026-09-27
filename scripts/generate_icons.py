"""Generate extension PNGs from the simple geometric Quick Apply icon, using stdlib only."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"
SCALE = 4


def rounded(x, y, left, top, right, bottom, radius):
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def segment(x, y, x1, y1, x2, y2, radius):
    dx, dy = x2 - x1, y2 - y1
    t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2 <= radius ** 2


def color(x, y):
    if not rounded(x, y, 0, 0, 128, 128, 27):
        return (0, 0, 0, 0)
    pixel = (25, 92, 189, 255)
    if rounded(x, y, 27, 18, 101, 110, 9):
        pixel = (255, 255, 255, 255)
        if rounded(x, y, 40, 36, 86, 42, 3) or rounded(x, y, 40, 50, 73, 56, 3):
            pixel = (155, 188, 231, 255)
        if segment(x, y, 42, 78, 55, 91, 4) or segment(x, y, 55, 91, 85, 60, 4):
            pixel = (25, 92, 189, 255)
    return pixel


def chunk(name, data):
    return struct.pack(">I", len(data)) + name + data + struct.pack(">I", zlib.crc32(name + data))


def write_png(size):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            samples = [color((px + (sx + .5) / SCALE) * 128 / size,
                             (py + (sy + .5) / SCALE) * 128 / size)
                       for sy in range(SCALE) for sx in range(SCALE)]
            row.extend(sum(sample[channel] for sample in samples) // len(samples) for channel in range(4))
        rows.append(row)
    data = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">2I5B", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(data, 9)) + chunk(b"IEND", b"")
    (OUT / f"icon-{size}.png").write_bytes(png)


if __name__ == "__main__":
    for size in (16, 32, 48, 128):
        write_png(size)
