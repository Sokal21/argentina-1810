"""Cut the HUD frame out of its concept: empty the two orbs and trim the margin.

The concept has the orbs half full of painted liquid. The game draws the
liquid itself, so the frame needs holes where the glass is.

Usage: python3 tools/build_hud_frame.py     (from the project root)
"""
from PIL import Image

SRC = "assets/hud/concept/hud_a.png"
OUT = "assets/hud/marco.png"
ORBS = [(89, 143), (424, 143)]  # centres in the concept
HOLE = 31                       # radius emptied, leaving the glass's rim

im = Image.open(SRC).convert("RGBA")
px = im.load()
for cx, cy in ORBS:
    for y in range(cy - HOLE, cy + HOLE + 1):
        for x in range(cx - HOLE, cx + HOLE + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= HOLE * HOLE:
                px[x, y] = (0, 0, 0, 0)
box = im.getbbox()
im.crop(box).save(OUT)
print(OUT, im.crop(box).size, "orbs at", [(cx - box[0], cy - box[1]) for cx, cy in ORBS])
