"""Widen the title screen's background so there is sky above the Cabildo.

The generated picture has the tower reaching the top edge, leaving nowhere
for the title. This sets it at the bottom of a larger and much wider canvas, so screens of
any shape can show its full height: the sides
are filled with the houses at its edges folded outward, and the sky above with its
top rows mirrored and dissolving into flat night sky with a few stars.

Usage: python3 tools/build_title_background.py     (from the project root)
"""
import random

from PIL import Image

SRC = "assets/titulo/concept/cabildo_lejos_1.png"
OUT = "assets/titulo/cabildo.png"
W, H = 960, 405
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
EDGE = 56  # width of the strip of houses at each side of the picture
SKY = 9    # rows at the top of the picture that hold nothing but sky
FADE = 45  # rows over which the folded sky gives way to flat sky

src = Image.open(SRC).convert("RGB")
sw, sh = src.size
left, top = (W - sw) // 2, H - sh
out = Image.new("RGB", (W, H))
out.paste(src, (left, top))

# Sides: the strip of houses at each edge of the picture, folded back and
# forth outward. Only that strip, so the Cabildo itself is not repeated.
for x in range(left):
    fold = x % (2 * EDGE)
    col = fold if fold < EDGE else 2 * EDGE - 1 - fold
    out.paste(src.crop((col, 0, col + 1, sh)), (left - 1 - x, top))
    out.paste(src.crop((sw - 1 - col, 0, sw - col, sh)), (left + sw + x, top))

# Sky: the commonest blue of the picture's top rows is the flat night.
band = list(out.crop((0, top, W, top + 24)).getdata())
night = max(set(band), key=band.count)
px = out.load()
random.seed(1810)
for y in range(top):
    up = top - 1 - y                       # rows above the seam
    for x in range(W):
        # The picture's top few rows are all sky: fold just those upward,
        # dithering out to flat sky, so nothing of the tower is repeated.
        fold = up % (2 * SKY)
        mirrored = px[x, top + (fold if fold < SKY else 2 * SKY - 1 - fold)]
        keep = up / FADE < (BAYER[y % 4][x % 4] + 0.5) / 16
        px[x, y] = mirrored if keep and up < FADE else night
stars = [(200, 208, 230), (150, 165, 205), (110, 125, 170)]
for _ in range(120):
    x, y = random.randrange(W), random.randrange(top - 6)
    if px[x, y] == night:
        px[x, y] = random.choice(stars)
out.save(OUT)
print(OUT, out.size, "picture at", (left, top), "night", night)
