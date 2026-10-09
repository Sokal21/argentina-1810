"""Shrink the title screen's walkers and carriage to the sizes they are shown at.

They are generated far larger than they appear in front of the Cabildo, and
scaling them down while drawing turns them to mush. This makes two sheets of
each, one for the far side of the plaza and one for the near side, already
at their final size.

Usage: python3 tools/build_title_actors.py     (from the project root)
       reads .tmp/titulo/NAME.webp, writes assets/titulo/NAME_{lejos,cerca}.png
"""
from PIL import Image, ImageEnhance, ImageSequence

# Height of the figure itself, in pixels, on the far and the near side.
LIFT = 1.8  # how much brighter than drawn they are shown
SIZES = {"caballero": (17, 32), "dama": (16, 30), "carruaje": (21, 40)}

for name, heights in SIZES.items():
    frames = [f.convert("RGBA") for f in ImageSequence.Iterator(Image.open(f".tmp/titulo/{name}.webp"))]
    # One box around the figure in every frame, so it does not jump about.
    boxes = [f.getbbox() for f in frames]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    frames = [f.crop(box) for f in frames]
    for label, height in zip(("lejos", "cerca"), heights):
        w = max(1, round(frames[0].width * height / frames[0].height))
        sheet = Image.new("RGBA", (w * len(frames), height))
        for i, f in enumerate(frames):
            small = f.resize((w, height), Image.LANCZOS)
            # Hard edges: a pixel is there or it is not.
            small.putalpha(small.getchannel("A").point(lambda a: 255 if a >= 110 else 0))
            sheet.paste(small, (w * i, 0))
        # A short palette, like the rest of the art.
        alpha = sheet.getchannel("A")
        # Lifted out of the dark: drawn for night, they vanish against the plaza.
        lit = ImageEnhance.Brightness(sheet.convert("RGB")).enhance(LIFT)
        sheet = lit.quantize(20, dither=Image.Dither.NONE).convert("RGBA")
        sheet.putalpha(alpha)
        out = f"assets/titulo/{name}_{label}.png"
        sheet.save(out)
        print(f"{out}: {len(frames)} frames of {w}x{height}")
