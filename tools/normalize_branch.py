"""Give the canelo branch the same three muted greens in every spritesheet.

Each sheet came out of the generator with its own greens, some far more
saturated than others. A sheet's greens are ranked by brightness and mapped
onto one shared ramp, in place (a NAME_original.png backup is kept).

Usage: python3 tools/normalize_branch.py SHEET.png [SHEET.png ...]
"""
import shutil
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

RAMP = [(46, 70, 38), (62, 90, 50), (78, 112, 63)]  # dark, mid, light


def is_green(c):
    return c[1] > c[0] + 12 and c[1] > c[2] + 12


def normalize(path):
    path = Path(path)
    backup = path.with_name(path.stem + "_original.png")
    if not backup.exists():
        shutil.copy2(path, backup)
    im = Image.open(path).convert("RGBA")
    px = im.load()
    found = {px[x, y][:3] for y in range(im.height) for x in range(im.width)
             if px[x, y][3] and is_green(px[x, y])}
    if not found:
        return
    # Washed-out greens are stray edge pixels: they go to the light tone and
    # do not take part in the ranking.
    pale = {g for g in found if g[2] > 95}
    greens = sorted(found - pale, key=sum)
    # Spread the sheet's greens over the ramp: darkest -> dark, brightest -> light.
    last = len(greens) - 1
    mapping = {g: RAMP[round(i / last * 2) if last else 2] for i, g in enumerate(greens)}
    mapping.update({g: RAMP[2] for g in pale})
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] and p[:3] in mapping:
                px[x, y] = (*mapping[p[:3]], p[3])
    im.save(path)
    print(f"{path}: {len(found)} greens -> {len(set(mapping.values()))}")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        normalize(arg)
