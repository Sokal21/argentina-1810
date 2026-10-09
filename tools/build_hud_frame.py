"""Cut the HUD frames out of their concepts: empty the vessels and trim the margin.

Each concept has its vessels painted with liquid in them. The game draws the
liquid itself, so the frames need holes where the glass is.

  marco.png         Inti's: two orbs held by roots. The whole disc of each is
                    emptied, leaving the glass's rim.
  marco_cabral.png  Cabral's: two flasks in iron cages. Only what is not iron
                    is emptied, so the straps across each flask stay and the
                    liquid shows behind them.

Usage: python3 tools/build_hud_frame.py     (from the project root)
"""
from PIL import Image

FRAMES = {
    "assets/hud/marco.png": ("assets/hud/concept/hud_a.png", [(89, 143), (424, 143)], 31, False),
    "assets/hud/marco_cabral.png": ("assets/hud/concept/cabral_c2.png", [(82.5, 152), (429, 152)], 36, True),
}


def iron(p):
    """Grey and not bright: the straps, their rivets and the stone they stand on."""
    return max(p[:3]) - min(p[:3]) < 22 and max(p[:3]) < 125


for out, (src, vessels, hole, caged) in FRAMES.items():
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for cx, cy in vessels:
        for y in range(int(cy - hole), int(cy + hole) + 2):
            for x in range(int(cx - hole), int(cx + hole) + 2):
                inside = (x - cx) ** 2 + (y - cy) ** 2 <= hole * hole
                if inside and not (caged and iron(px[x, y])):
                    px[x, y] = (0, 0, 0, 0)
    box = im.getbbox()
    im.crop(box).save(out)
    print(out, im.crop(box).size, "vessels at", [(cx - box[0], cy - box[1]) for cx, cy in vessels])
