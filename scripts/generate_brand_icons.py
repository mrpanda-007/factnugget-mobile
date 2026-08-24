#!/usr/bin/env python3
"""Generate the FactNuggets icon family from the transparent Ollie master mark."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageCms, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "assets/branding/factnuggets-mark-master-v2.png"
IMAGE_DIR = ROOT / "assets/images"
STORE_DIR = ROOT / "assets/store"
BRAND_DIR = ROOT / "assets/branding"

OCEAN_BLUE = (58, 170, 225, 255)  # constants/tokens.ts: colors.ocean500
CREAM = (255, 251, 243, 255)  # constants/tokens.ts: colors.cream
WHITE = (255, 255, 255, 255)
SRGB_PROFILE = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()


def trimmed_master() -> Image.Image:
    mark = Image.open(MASTER).convert("RGBA")
    alpha_box = mark.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError(f"Master mark has no visible pixels: {MASTER}")
    return mark.crop(alpha_box)


def fit_mark(mark: Image.Image, max_size: int) -> Image.Image:
    scale = min(max_size / mark.width, max_size / mark.height)
    size = (round(mark.width * scale), round(mark.height * scale))
    return mark.resize(size, Image.Resampling.LANCZOS)


def centered_mark(mark: Image.Image, canvas_size: int, mark_size: int) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    fitted = fit_mark(mark, mark_size)
    x = (canvas_size - fitted.width) // 2
    y = (canvas_size - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def color_icon(mark: Image.Image, canvas_size: int, mark_size: int) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), OCEAN_BLUE)
    canvas.alpha_composite(centered_mark(mark, canvas_size, mark_size))
    return canvas


def monochrome_layer(mark: Image.Image, canvas_size: int, mark_size: int) -> Image.Image:
    positioned = centered_mark(mark, canvas_size, mark_size)
    layer = Image.new("RGBA", positioned.size, WHITE)
    layer.putalpha(positioned.getchannel("A"))
    return layer


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(
        path,
        format="PNG",
        optimize=True,
        compress_level=9,
        icc_profile=SRGB_PROFILE,
    )


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def preview_sheet(icon: Image.Image) -> Image.Image:
    tile_size = 320
    margin = 44
    gap = 32
    sheet = Image.new("RGBA", (tile_size * 3 + gap * 2 + margin * 2, tile_size + margin * 2), CREAM)
    tile = icon.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
    masks = [
        Image.new("L", (tile_size, tile_size), 255),
        rounded_mask(tile_size, round(tile_size * 0.30)),
        circle_mask(tile_size),
    ]
    for index, mask in enumerate(masks):
        masked = tile.copy()
        masked.putalpha(mask)
        x = margin + index * (tile_size + gap)
        sheet.alpha_composite(masked, (x, margin))
    return sheet


def main() -> None:
    mark = trimmed_master()

    # Full-square artwork: Play applies its own rounded mask and shadow; iOS also masks at runtime.
    app_icon = color_icon(mark, canvas_size=1024, mark_size=820)
    play_icon = color_icon(mark, canvas_size=512, mark_size=410)

    # 600/1024 = 63.3/108 dp. This stays below Android's 66 dp maximum safe-zone bound.
    adaptive_foreground = centered_mark(mark, canvas_size=1024, mark_size=600)
    adaptive_background = Image.new("RGBA", (1024, 1024), OCEAN_BLUE)
    adaptive_monochrome = monochrome_layer(mark, canvas_size=1024, mark_size=600)

    splash_icon = centered_mark(mark, canvas_size=1024, mark_size=680)
    favicon = color_icon(mark, canvas_size=48, mark_size=40)

    save_png(app_icon, IMAGE_DIR / "factnuggets-icon.png")
    save_png(adaptive_foreground, IMAGE_DIR / "factnuggets-android-foreground.png")
    save_png(adaptive_background, IMAGE_DIR / "factnuggets-android-background.png")
    save_png(adaptive_monochrome, IMAGE_DIR / "factnuggets-android-monochrome.png")
    save_png(splash_icon, IMAGE_DIR / "factnuggets-splash-icon.png")
    save_png(favicon, IMAGE_DIR / "factnuggets-favicon.png")
    save_png(play_icon, STORE_DIR / "google-play-icon.png")
    save_png(preview_sheet(app_icon), BRAND_DIR / "factnuggets-icon-mask-preview.png")


if __name__ == "__main__":
    main()
