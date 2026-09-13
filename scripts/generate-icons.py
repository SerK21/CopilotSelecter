#!/usr/bin/env python3
"""Generate original toolbar icons.

Palette is loosely inspired by Copilot product chrome (teal / sky / violet).
Geometry is original: rounded tile, chat bubble, and a picker chevron.
This is not a reproduction of Microsoft's Copilot ribbon/knot trademark.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"

TEAL = (0, 163, 170)
SKY = (56, 145, 232)
VIOLET = (122, 112, 245)
WHITE = (255, 255, 255)
SPARK = (232, 250, 255)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def aurora(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            t = (x * 0.62 + y * 0.38) / max(size - 1, 1)
            if t < 0.48:
                color = mix(TEAL, SKY, t / 0.48)
            else:
                color = mix(SKY, VIOLET, (t - 0.48) / 0.52)
            # Soft top highlight so it does not look like a flat sticker.
            shine = max(0.0, 1.0 - ((x - size * 0.28) ** 2 + (y - size * 0.22) ** 2) / (size * 0.55) ** 2)
            color = mix(color, (210, 245, 255), shine * 0.18)
            pixels[x, y] = color
    return img


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(radius=max(size / 90, 0.4)))


def draw_spark(draw: ImageDraw.ImageDraw, cx: float, cy: float, arm: float, color: tuple[int, int, int, int]) -> None:
    points = [
        (cx, cy - arm),
        (cx + arm * 0.18, cy - arm * 0.18),
        (cx + arm, cy),
        (cx + arm * 0.18, cy + arm * 0.18),
        (cx, cy + arm),
        (cx - arm * 0.18, cy + arm * 0.18),
        (cx - arm, cy),
        (cx - arm * 0.18, cy - arm * 0.18),
    ]
    draw.polygon(points, fill=color)


def render_icon(size: int) -> Image.Image:
    scale = 8 if size <= 48 else 4
    canvas = size * scale
    pad = int(canvas * 0.06)
    radius = int(canvas * 0.24)

    tile = aurora(canvas)
    mask = rounded_mask(canvas, radius)
    base = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    base.paste(tile.convert("RGBA"), (0, 0), mask)

    overlay = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Original chat bubble (not a trademarked ribbon).
    bx0, by0 = canvas * 0.22, canvas * 0.24
    bx1, by1 = canvas * 0.78, canvas * 0.66
    bubble_radius = int(canvas * 0.14)
    draw.rounded_rectangle((bx0, by0, bx1, by1), radius=bubble_radius, fill=WHITE + (242,))

    # Tail pointing down-left so it reads as a chat, not a logo knot.
    tail = [
        (canvas * 0.32, by1 - canvas * 0.04),
        (canvas * 0.28, canvas * 0.78),
        (canvas * 0.48, by1 - canvas * 0.02),
    ]
    draw.polygon(tail, fill=WHITE + (242,))

    if size >= 32:
        chevron_y = (by0 + by1) / 2
        chevron_x = (bx0 + bx1) / 2
        stroke = max(int(canvas * 0.045), scale)
        left = (chevron_x - canvas * 0.12, chevron_y - canvas * 0.04)
        mid = (chevron_x, chevron_y + canvas * 0.07)
        right = (chevron_x + canvas * 0.12, chevron_y - canvas * 0.04)
        draw.line([left, mid, right], fill=(36, 92, 168, 255), width=stroke, joint="curve")
        draw_spark(
            draw,
            canvas * 0.78,
            canvas * 0.24,
            canvas * 0.08,
            SPARK + (235,),
        )

    base = Image.alpha_composite(base, overlay)

    # Keep a little transparent padding so the tile does not clip in the toolbar.
    if pad:
        padded = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
        inner = base.resize((canvas - pad * 2, canvas - pad * 2), Image.Resampling.LANCZOS)
        padded.paste(inner, (pad, pad), inner)
        base = padded

    return base.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        render_icon(size).save(ICON_DIR / f"icon-{size}.png", "PNG")
    print(f"Generated icons in {ICON_DIR}")


if __name__ == "__main__":
    main()
