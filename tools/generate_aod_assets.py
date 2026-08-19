#!/usr/bin/env python3
"""Generate low-luminance assets for the GTR 4 always-on display."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/466x466-amazfit-gtr-4/images/final"
OUTPUT = ASSETS / "aod"
PREVIEW = ROOT / "designs/aod-implementation-v1.png"
SIZE = 466
SCALE = 4


def dim_asset(source: Path, target: Path, factor: float, alpha_factor: float = 1.0) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = []
    for red, green, blue, alpha in image.getdata():
        pixels.append((
            round(red * factor),
            round(green * factor),
            round(blue * factor),
            round(alpha * alpha_factor),
        ))
    image.putdata(pixels)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)


def point(radius: float, degrees: float) -> tuple[int, int]:
    radians = math.radians(degrees)
    return (
        round((SIZE / 2 + radius * math.sin(radians)) * SCALE),
        round((SIZE / 2 - radius * math.cos(radians)) * SCALE),
    )


def generate_background() -> None:
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)
    tick = (35, 62, 52, 235)
    major = (48, 82, 69, 245)

    for index in range(60):
        is_major = index % 5 == 0
        inner = 195 if is_major else 204
        outer = 211
        draw.line(
            [point(inner, index * 6), point(outer, index * 6)],
            fill=major if is_major else tick,
            width=round((2.0 if is_major else 1.0) * SCALE),
        )

    # Sparse turtle-shell geometry behind the active point.
    shell = (19, 48, 39, 220)
    shell_w = round(1.15 * SCALE)
    box = tuple(round(value * SCALE) for value in (148, 196, 318, 344))
    draw.ellipse(box, outline=shell, width=shell_w)
    cx, cy = 233 * SCALE, 270 * SCALE
    vertices = [point(0, 0)]  # placeholder keeps the geometry explicit below
    del vertices
    ring = []
    for degrees in range(0, 360, 60):
        radians = math.radians(degrees)
        ring.append((
            round(cx + 52 * SCALE * math.sin(radians)),
            round(cy - 45 * SCALE * math.cos(radians)),
        ))
    draw.polygon(ring, outline=shell, width=shell_w)
    for x, y in ring:
        edge_x = cx + (x - cx) * 1.55
        edge_y = cy + (y - cy) * 1.55
        draw.line([(x, y), (round(edge_x), round(edge_y))], fill=shell, width=shell_w)
    draw.line([(181 * SCALE, 232 * SCALE), (285 * SCALE, 232 * SCALE)], fill=shell, width=shell_w)
    draw.line([(181 * SCALE, 308 * SCALE), (285 * SCALE, 308 * SCALE)], fill=shell, width=shell_w)

    image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(
        OUTPUT / "background.png", optimize=True
    )


def generate_preview() -> None:
    preview = Image.open(OUTPUT / "background.png").convert("RGBA")

    def place(path: Path, x: int, y: int) -> None:
        preview.alpha_composite(Image.open(path).convert("RGBA"), (x, y))

    digits = OUTPUT / "time"
    place(digits / "1.png", 139, 92)
    place(digits / "0.png", 177, 92)
    place(digits / "colon.png", 224, 92)
    place(digits / "0.png", 251, 92)
    place(digits / "9.png", 289, 92)
    place(OUTPUT / "main/shenmai.png", 103, 272)

    draw = ImageDraw.Draw(preview)
    font = ImageFont.truetype(str(ROOT / "tools/fonts/LXGWZhenKaiGB-Regular.ttf"), 15)
    date = "08月18日 周二"
    box = draw.textbbox((0, 0), date, font=font)
    draw.text(((SIZE - (box[2] - box[0])) / 2, 371), date, font=font, fill=(66, 108, 90, 255))

    hour = Image.open(OUTPUT / "needles/hour.png").convert("RGBA").rotate(
        -304.5, resample=Image.Resampling.BICUBIC, center=(231, 231)
    )
    minute = Image.open(OUTPUT / "needles/minute.png").convert("RGBA").rotate(
        -54, resample=Image.Resampling.BICUBIC, center=(231, 231)
    )
    preview.alpha_composite(hour)
    preview.alpha_composite(minute)
    preview.alpha_composite(Image.open(OUTPUT / "needles/pivot.png").convert("RGBA"))
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    preview.convert("RGB").save(PREVIEW, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    generate_background()

    for name in [str(value) for value in range(10)] + ["colon"]:
        dim_asset(ASSETS / "time" / f"{name}.png", OUTPUT / "time" / f"{name}.png", 0.58)

    for source in sorted((ASSETS / "main").glob("*.png")):
        dim_asset(source, OUTPUT / "main" / source.name, 0.43)

    dim_asset(ASSETS / "needles/hour.png", OUTPUT / "needles/hour.png", 0.50, 0.88)
    dim_asset(ASSETS / "needles/minute.png", OUTPUT / "needles/minute.png", 0.50, 0.88)
    dim_asset(ASSETS / "needles/pivot.png", OUTPUT / "needles/pivot.png", 0.48, 0.90)
    generate_preview()


if __name__ == "__main__":
    main()
