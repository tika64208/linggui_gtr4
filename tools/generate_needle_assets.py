#!/usr/bin/env python3
"""Generate complete, connected acupuncture-needle watch hands."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


CANVAS_SIZE = 466
CENTER = (231, 231)
SCALE = 4


def sc(value: float) -> int:
    return round(value * SCALE)


def make_needle(tip_y: int, handle_top: int, handle_width: int) -> Image.Image:
    size = CANVAS_SIZE * SCALE
    cx, cy = sc(CENTER[0]), sc(CENTER[1])

    # The shadow belongs to the rotating bitmap too, preserving the 3D look.
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.line(
        [(cx + sc(3), sc(tip_y + 3)), (cx + sc(3), cy + sc(11))],
        fill=(0, 0, 0, 125), width=sc(handle_width + 7)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(sc(3.0)))

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    handle_bottom = 204
    shaft_x = CENTER[0]

    # Tapered steel shaft with light and dark sides.
    d.polygon([
        (sc(shaft_x), sc(tip_y)),
        (sc(shaft_x - 2.5), sc(handle_top + 2)),
        (sc(shaft_x + 2.5), sc(handle_top + 2)),
    ], fill=(202, 211, 207, 255))
    d.line(
        [(sc(shaft_x - 1.4), sc(tip_y + 5)), (sc(shaft_x - 1.4), sc(handle_top + 1))],
        fill=(248, 255, 252, 255), width=sc(1.2)
    )
    d.line(
        [(sc(shaft_x + 1.6), sc(tip_y + 8)), (sc(shaft_x + 1.6), sc(handle_top + 1))],
        fill=(72, 80, 78, 255), width=sc(1.1)
    )

    # Copper handle with rounded volume and a warm longitudinal highlight.
    half = handle_width / 2
    d.rounded_rectangle(
        (sc(shaft_x - half), sc(handle_top), sc(shaft_x + half), sc(handle_bottom)),
        radius=sc(half), fill=(91, 39, 20, 255), outline=(43, 21, 14, 255), width=sc(1.2)
    )
    d.rounded_rectangle(
        (sc(shaft_x - half + 2), sc(handle_top + 1), sc(shaft_x + 1), sc(handle_bottom - 1)),
        radius=sc(3), fill=(194, 92, 43, 255)
    )
    d.line(
        [(sc(shaft_x - half + 3), sc(handle_top + 3)),
         (sc(shaft_x - half + 3), sc(handle_bottom - 3))],
        fill=(255, 178, 91, 220), width=sc(1.2)
    )

    # Closely wound wire gives the handle a realistic acupuncture-needle grip.
    y = handle_top + 3
    while y < handle_bottom - 1:
        d.arc(
            (sc(shaft_x - half - 1), sc(y - 2), sc(shaft_x + half + 1), sc(y + 3)),
            5, 178, fill=(255, 185, 91, 255), width=sc(1.5)
        )
        d.arc(
            (sc(shaft_x - half - 1), sc(y - 1), sc(shaft_x + half + 1), sc(y + 4)),
            182, 355, fill=(113, 48, 25, 255), width=sc(1.4)
        )
        y += 4

    # The complete root extends through and beyond the spindle centre. It is
    # therefore guaranteed to rotate as part of the same image as the hand.
    d.polygon([
        (sc(shaft_x - half + 2), sc(handle_bottom - 1)),
        (sc(shaft_x + half - 2), sc(handle_bottom - 1)),
        (sc(shaft_x + 5), sc(CENTER[1] + 9)),
        (sc(shaft_x - 5), sc(CENTER[1] + 9)),
    ], fill=(151, 70, 34, 255))
    d.line(
        [(sc(shaft_x - 2), sc(handle_bottom)), (sc(shaft_x - 2), sc(CENTER[1] + 9))],
        fill=(246, 158, 78, 255), width=sc(1.5)
    )

    shadow.alpha_composite(layer)
    return shadow.resize((CANVAS_SIZE, CANVAS_SIZE), Image.Resampling.LANCZOS)


def make_pivot(source: Image.Image) -> Image.Image:
    # The old 58 px mask captured both roots. Keep only the stationary cap.
    alpha = Image.new("L", source.size, 0)
    ImageDraw.Draw(alpha).ellipse((216, 216, 246, 246), fill=255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    pivot = source.copy()
    pivot.putalpha(alpha)
    return pivot


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGBA").resize(
        (CANVAS_SIZE, CANVAS_SIZE), Image.Resampling.LANCZOS
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)

    make_needle(tip_y=28, handle_top=92, handle_width=15).save(
        args.output_dir / "minute.png", optimize=True
    )
    make_needle(tip_y=48, handle_top=109, handle_width=17).save(
        args.output_dir / "hour.png", optimize=True
    )
    make_pivot(source).save(args.output_dir / "pivot.png", optimize=True)


if __name__ == "__main__":
    main()
