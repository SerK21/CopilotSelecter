#!/usr/bin/env python3
"""Generate simple PNG icons for the extension."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def write_png(path: Path, size: int) -> None:
    # Copilot-blue pin shape on transparent background (simplified circle).
    pixels = bytearray()
    center = (size - 1) / 2
    radius = size * 0.38

    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            dx = x - center
            dy = y - center
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= radius:
                row.extend([37, 99, 235, 255])  # #2563eb
            elif dist <= radius + 1.2:
                row.extend([37, 99, 235, 180])
            else:
                row.extend([0, 0, 0, 0])
        pixels.extend(row)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(pixels), 9)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", ihdr)
    png += png_chunk(b"IDAT", compressed)
    png += png_chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        write_png(ICON_DIR / f"icon-{size}.png", size)
    print(f"Generated icons in {ICON_DIR}")


if __name__ == "__main__":
    main()
