"""Build the straight-back -> back-diagonal turn sheet used by the demo.

The generated turn starts exactly on the straight-back pose but rotates past
the diagonal trot it leads into and ends wider than it. This keeps only its
early frames, narrows them progressively and centres them on the body so
nothing slides.

Usage: python3 tools/build_turn_north_back.py
"""
from PIL import Image

A = "assets/machi"
FRAME = 94
NEW = f"{A}/giro_arriba_espalda/giro_sheet.png"   # straight back -> diagonal
OUT = f"{A}/giro_arriba_espalda/giro_sheet_ajustado.png"
# (sheet, frame index, horizontal squash factor)
STEPS = [(NEW, 2, 0.95), (NEW, 3, 0.85)]


def frame(path, k):
    return Image.open(path).convert("RGBA").crop((k * FRAME, 0, (k + 1) * FRAME, FRAME))


def body_cx(im):
    """Centre of the clothes and hair, ignoring the drum, branch and skin."""
    px = im.load()
    xs = [x for y in range(im.height) for x in range(im.width)
          if px[x, y][3] and max(px[x, y][:3]) < 120
          and not (px[x, y][1] > px[x, y][0] + 15 and px[x, y][1] > px[x, y][2])]
    return sum(xs) / len(xs)


def squash_and_centre(im, factor):
    cx = body_cx(im)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    src, dst = im.load(), out.load()
    for y in range(im.height):
        for x in range(im.width):
            sx = round(cx + (x - FRAME / 2) / factor)
            if 0 <= sx < im.width:
                dst[x, y] = src[sx, y]
    return out


if __name__ == "__main__":
    sheet = Image.new("RGBA", (FRAME * len(STEPS), FRAME), (0, 0, 0, 0))
    for i, (path, k, factor) in enumerate(STEPS):
        sheet.paste(squash_and_centre(frame(path, k), factor), (i * FRAME, 0))
    sheet.save(OUT)
    print(OUT, sheet.size)
