#!/usr/bin/env python3
"""Makes one of the nahuel's sheets ready for the game from SpriteCook's output.

It is drawn with no outlines: depth comes from flat tones of slate alone. The
model keeps putting near-black lines back, round the silhouette and between
the legs. This repaints them: on the silhouette a line takes the darkest body
tone beside it, so no rim is left; inside the body it becomes a flat shadow.

It then prints where the animal stands in the first frame, which the game
needs to anchor the sheet: the middle of its body and the row its paws are on.

  tools/build_nahuel_sheet.py SOURCE.(webp|png) assets/nahuel/NAME.png [FRAMES]
"""
import sys
from collections import Counter

from PIL import Image

SHADOW = (35, 47, 69)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def is_line(c):
    """Nearly black, and not part of the red band."""
    return lum(c) < 34 and c[0] <= c[2] + 12


def is_slate(c):
    return c[2] >= c[0] and c[1] < 150


def clean(frame):
    w, h = frame.size
    px = frame.load()
    out = frame.copy()
    o = out.load()
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][3] > 127
    near4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    near8 = near4 + [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for y in range(h):
        for x in range(w):
            if px[x, y][3] <= 127:
                o[x, y] = (0, 0, 0, 0)
                continue
            o[x, y] = px[x, y][:3] + (255,)
            if not is_line(px[x, y]):
                continue
            around = [px[x + dx, y + dy] for dx, dy in near8
                      if solid(x + dx, y + dy) and not is_line(px[x + dx, y + dy])]
            edge = any(not solid(x + dx, y + dy) for dx, dy in near4)
            body = [c for c in around if is_slate(c)]
            if edge and body:
                o[x, y] = min(body, key=lum)[:3] + (255,)
            elif body or not around:
                o[x, y] = SHADOW + (255,)
            else:
                o[x, y] = Counter(around).most_common(1)[0][0][:3] + (255,)
    return out


src, dst = sys.argv[1:3]
strip = Image.open(src).convert('RGBA')
side = strip.height
count = int(sys.argv[3]) if len(sys.argv) > 3 else strip.width // side
sheet = Image.new('RGBA', (side * count, side))
for i in range(count):
    sheet.paste(clean(strip.crop((i * side, 0, i * side + side, side))), (i * side, 0))
sheet.save(dst)
left, top, right, bottom = sheet.crop((0, 0, side, side)).getbbox()
print(f'{dst}: {count} frames of {side}; first frame body {left}..{right}, middle {(left + right) / 2:.0f}, paws on row {bottom}')
