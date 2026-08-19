from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/466x466-amazfit-gtr-4/images/final"
HELVETICA = "/System/Library/Fonts/HelveticaNeue.ttc"
HEITI = "/System/Library/Fonts/STHeiti Medium.ttc"
SONGTI = "/System/Library/Fonts/Supplemental/Songti.ttc"
ZHENKAI = str(ROOT / "tools/fonts/LXGWZhenKaiGB-Regular.ttf")

POINTS = {
    "shenmai": "申脉",
    "zhaohai": "照海",
    "waiguan": "外关",
    "zulinqi": "足临泣",
    "gongsun": "公孙",
    "houxi": "后溪",
    "neiguan": "内关",
    "lieque": "列缺",
}
PAIRS = {
    "shenmai": ("后溪", "通督脉"),
    "zhaohai": ("列缺", "通任脉"),
    "waiguan": ("足临泣", "通带脉"),
    "zulinqi": ("外关", "通阳维脉"),
    "gongsun": ("内关", "通阴维脉"),
    "houxi": ("申脉", "通阳跷脉"),
    "neiguan": ("公孙", "通冲脉"),
    "lieque": ("照海", "通阴跷脉"),
}


def centered_text(size, text, font, fill, offset_y=0):
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    box = draw.textbbox((0, 0), text, font=font)
    x = (size[0] - (box[2] - box[0])) / 2 - box[0]
    y = (size[1] - (box[3] - box[1])) / 2 - box[1] + offset_y
    draw.text((round(x), round(y)), text, font=font, fill=fill)
    return image


def save_time_assets():
    folder = OUT / "time"
    folder.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(HELVETICA, 64, index=7)
    for digit in "0123456789":
        centered_text((38, 70), digit, font, "#F2F8F4", -1).save(folder / f"{digit}.png")
    centered_text((18, 70), ":", font, "#63E0AC", -2).save(folder / "colon.png")


def save_main_point_assets():
    folder = OUT / "main"
    folder.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(ZHENKAI, 50)
    for key, label in POINTS.items():
        centered_text((260, 66), label, font, "#B9F5D9", -2).save(folder / f"{key}.png")


def save_outer_point_assets():
    folder = OUT / "points"
    folder.mkdir(parents=True, exist_ok=True)
    for key, label in POINTS.items():
        font_size = 14 if len(label) > 2 else 15
        font = ImageFont.truetype(HEITI, font_size)
        for state in ("idle", "active"):
            image = Image.new("RGBA", (64, 40), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            color = "#78E8BC" if state == "active" else "#72877C"
            dot = "#FF6C54" if state == "active" else "#354A40"
            label_image = centered_text((64, 30), label, font, color, 0)
            image.alpha_composite(label_image, (0, 0))
            draw.ellipse((29, 33, 35, 39), fill=dot)
            image.save(folder / f"{key}-{state}.png")


def save_pair_assets():
    folder = OUT / "pair"
    folder.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(HEITI, 14)
    for key, (pair, meridian) in PAIRS.items():
        parts = (("配穴 ", "#B9F5D9"), (pair, "#FF6C54"), (" · " + meridian, "#B9F5D9"))
        image = Image.new("RGBA", (156, 38), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        widths = [draw.textlength(text, font=font) for text, _ in parts]
        x = (156 - sum(widths)) / 2
        bounds = draw.textbbox((0, 0), "配穴", font=font)
        y = (38 - (bounds[3] - bounds[1])) / 2 - bounds[1]
        for (text, color), width in zip(parts, widths):
            draw.text((round(x), round(y)), text, font=font, fill=color)
            x += width
        image.save(folder / f"{key}.png")


def add_preview_text(image, box, text, size, color, align="center"):
    font = ImageFont.truetype(HEITI, size)
    layer = Image.new("RGBA", (box[2], box[3]), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    bounds = draw.textbbox((0, 0), text, font=font)
    if align == "left":
        x = -bounds[0]
    elif align == "right":
        x = box[2] - (bounds[2] - bounds[0]) - bounds[0]
    else:
        x = (box[2] - (bounds[2] - bounds[0])) / 2 - bounds[0]
    y = (box[3] - (bounds[3] - bounds[1])) / 2 - bounds[1]
    draw.text((round(x), round(y)), text, font=font, fill=color)
    image.alpha_composite(layer, (box[0], box[1]))


def save_package_preview():
    image = Image.open(OUT / "bg.png").convert("RGBA")
    layout = [
        ("lieque", 201, 16), ("shenmai", 339, 74), ("zhaohai", 402, 216),
        ("waiguan", 342, 352), ("zulinqi", 201, 411), ("gongsun", 56, 352),
        ("houxi", 0, 216), ("neiguan", 56, 74),
    ]
    for key, x, y in layout:
        state = "active" if key == "shenmai" else "idle"
        image.alpha_composite(Image.open(OUT / f"points/{key}-{state}.png"), (x, y))
    for digit, x in (("1", 139), ("0", 177), ("0", 251), ("9", 289)):
        image.alpha_composite(Image.open(OUT / f"time/{digit}.png"), (x, 91))
    image.alpha_composite(Image.open(OUT / "time/colon.png"), (224, 91))
    image.alpha_composite(Image.open(OUT / "live-dot.png"), (185, 70))
    image.alpha_composite(Image.open(OUT / "main/shenmai.png"), (103, 214))
    add_preview_text(image, (177, 57, 150, 32), "酉时 · 癸酉", 15, "#B9F5D9")
    add_preview_text(image, (83, 186, 300, 25), "灵龟八法 · 此时开穴", 14, "#8FA99B")
    add_preview_text(image, (103, 286, 260, 29), "通阳跷脉 · 余数 1", 15, "#8FA99B")
    image.alpha_composite(Image.open(OUT / "pair/shenmai.png"), (155, 323))
    add_preview_text(image, (86, 383, 112, 24), "08月18日 周二", 12, "#8FA99B", "left")
    add_preview_text(image, (183, 383, 120, 24), "甲子日 · 阳", 13, "#D8E8DF")
    add_preview_text(image, (298, 383, 82, 24), "电量 86%", 12, "#8FA99B", "right")
    image.convert("RGB").save(OUT.parents[0] / "preview.png")


if __name__ == "__main__":
    save_time_assets()
    save_main_point_assets()
    save_outer_point_assets()
    save_pair_assets()
    save_package_preview()
