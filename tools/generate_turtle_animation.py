#!/usr/bin/env python3
"""Build compact articulated turtle poses for the GTR 4 watch face."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


SOURCE_SIZE = (1024, 1536)
POSE_CANVAS_SIZE = 120
TURTLE_SIZE = (78, 112)


def polygon_mask(points: list[tuple[int, int]]) -> Image.Image:
    mask = Image.new("L", SOURCE_SIZE, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(3.0))


def tone_source(source: Image.Image) -> Image.Image:
    source = source.convert("RGBA")
    if source.size != SOURCE_SIZE:
        source = source.resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    rgb = Image.new("RGB", SOURCE_SIZE, (0, 0, 0))
    rgb.paste(source, mask=source.getchannel("A"))
    rgb = ImageEnhance.Brightness(rgb).enhance(0.72)
    rgb = ImageEnhance.Color(rgb).enhance(0.88)
    return rgb.convert("RGBA")


def masked_layer(source: Image.Image, mask: Image.Image) -> Image.Image:
    layer = source.copy()
    layer.putalpha(mask.point(lambda value: int(value * 0.82)))
    return layer


def build_parts(source: Image.Image) -> dict[str, Image.Image]:
    base_mask = Image.new("L", SOURCE_SIZE, 0)
    base_draw = ImageDraw.Draw(base_mask)
    base_draw.polygon(
        [(500, 10), (545, 15), (602, 146), (618, 303), (594, 410),
         (430, 410), (405, 303), (422, 146), (468, 20)],
        fill=255,
    )
    base_draw.polygon(
        [(382, 342), (642, 342), (770, 430), (841, 596), (864, 820),
         (830, 1037), (722, 1185), (512, 1243), (302, 1185), (194, 1037),
         (160, 820), (183, 596), (254, 430)],
        fill=255,
    )
    base_mask = base_mask.filter(ImageFilter.GaussianBlur(3.0))

    masks = {
        "base": base_mask,
        "front_left": polygon_mask(
            [(438, 365), (302, 345), (209, 337), (104, 366), (43, 434),
             (45, 532), (129, 493), (235, 505), (350, 526), (458, 470)]
        ),
        "front_right": polygon_mask(
            [(586, 365), (722, 345), (815, 337), (920, 366), (981, 434),
             (979, 532), (895, 493), (789, 505), (674, 526), (566, 470)]
        ),
        "rear_left": polygon_mask(
            [(395, 1000), (285, 992), (215, 1004), (126, 1071), (78, 1175),
             (102, 1278), (191, 1246), (271, 1184), (362, 1108), (420, 1035)]
        ),
        "rear_right": polygon_mask(
            [(629, 1000), (739, 992), (809, 1004), (898, 1071), (946, 1175),
             (922, 1278), (833, 1246), (753, 1184), (662, 1108), (604, 1035)]
        ),
        "tail": polygon_mask(
            [(438, 1145), (586, 1145), (620, 1320), (590, 1512),
             (534, 1437), (472, 1321)]
        ),
    }
    return {name: masked_layer(source, mask) for name, mask in masks.items()}


def rotate_part(layer: Image.Image, degrees: float, pivot: tuple[int, int]) -> Image.Image:
    return layer.rotate(
        degrees,
        resample=Image.Resampling.BICUBIC,
        center=pivot,
        expand=False,
    )


def make_pose(parts: dict[str, Image.Image], paddle_angle: float) -> Image.Image:
    pose = Image.new("RGBA", SOURCE_SIZE, (0, 0, 0, 0))
    moving_parts = [
        ("tail", paddle_angle * 1.15, (512, 1160)),
        ("rear_left", -paddle_angle * 0.75, (330, 1025)),
        ("rear_right", paddle_angle * 0.75, (694, 1025)),
        ("front_left", paddle_angle, (385, 430)),
        ("front_right", -paddle_angle, (639, 430)),
    ]
    for name, degrees, pivot in moving_parts:
        pose.alpha_composite(rotate_part(parts[name], degrees, pivot))
    pose.alpha_composite(parts["base"])

    crop = pose.crop((40, 4, 984, 1520)).resize(TURTLE_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (POSE_CANVAS_SIZE, POSE_CANVAS_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(
        crop,
        ((POSE_CANVAS_SIZE - crop.width) // 2, (POSE_CANVAS_SIZE - crop.height) // 2),
    )
    return canvas


def make_poses(source: Image.Image, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_frame in output_dir.glob("*.png"):
        old_frame.unlink()

    parts = build_parts(tone_source(source))
    paddle_angles = [0, 9, 16, 9, 0, -9, -16, -9]
    for index, paddle_angle in enumerate(paddle_angles):
        make_pose(parts, paddle_angle).save(output_dir / f"pose_{index}.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    make_poses(Image.open(args.source), args.output_dir)


if __name__ == "__main__":
    main()
