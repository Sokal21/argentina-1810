"""Swap exact colors in a sprite or spritesheet, in place.

Keeps a one-time backup next to the file as NAME_original.png.

Usage: python3 tools/recolor_sprite.py FILE.png FROM:TO [FROM:TO ...]
       colors as r,g,b   e.g.  73,90,111:52,65,81
"""
import shutil
import sys
from pathlib import Path

from PIL import Image


def recolor(path, pairs):
    path = Path(path)
    backup = path.with_name(path.stem + "_original.png")
    if not backup.exists():
        shutil.copy2(path, backup)
    im = Image.open(backup).convert("RGBA")
    px = im.load()
    count = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in pairs:
                px[x, y] = (*pairs[(r, g, b)], a)
                count += 1
    im.save(path)
    print(f"{path}: {count} pixels recolored")


if __name__ == "__main__":
    rgb = lambda s: tuple(int(v) for v in s.split(","))
    mapping = dict((rgb(a), rgb(b)) for a, b in (p.split(":") for p in sys.argv[2:]))
    recolor(sys.argv[1], mapping)
