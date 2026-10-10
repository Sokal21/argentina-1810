#!/usr/bin/env python3
"""Draws the small "+" buttons of each hero's page, pixel by pixel.

Each is a little stud eleven pixels square, in the materials of that hero's
HUD: his of brass with an iron rim, hers of green wood bound in bark. It has
a lit edge above and to the left and a shaded one below and to the right, a
cross cut into it, and a second drawing beside the first, brighter, for when
it is pointed at.

    python3 tools/build_hud_buttons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'hud'
SIDE = 11
# For each hero: the rim, the face, its lit edge, its shaded edge, the cross, and the cross's shadow.
LOOKS = {
    'cabral': dict(rim=(26, 22, 20), face=(176, 128, 44), lit=(232, 196, 106), shade=(118, 82, 26), cross=(52, 34, 14), under=(214, 170, 82)),
    'inti': dict(rim=(30, 24, 16), face=(88, 118, 58), lit=(146, 178, 98), shade=(54, 76, 38), cross=(238, 228, 196), under=(48, 66, 34)),
}


def brighter(colour, by=28):
    return tuple(min(255, c + by) for c in colour)


def stud(look, lit_up=False):
    c = {name: (brighter(colour) if lit_up and name not in ('rim', 'cross') else colour) for name, colour in look.items()}
    img = Image.new('RGBA', (SIDE, SIDE), (0, 0, 0, 0))
    px = img.load()
    last = SIDE - 1
    for y in range(SIDE):
        for x in range(SIDE):
            corner = (x in (0, last)) and (y in (0, last))
            if corner:
                continue                                   # the corners are cut off, so it is not a plain square
            edge = x in (0, last) or y in (0, last)
            inner_corner = (x in (1, last - 1)) and (y in (1, last - 1))
            if edge or inner_corner:
                px[x, y] = (*c['rim'], 255)
            elif y == 1 or x == 1:
                px[x, y] = (*c['lit'], 255)
            elif y == last - 1 or x == last - 1:
                px[x, y] = (*c['shade'], 255)
            else:
                px[x, y] = (*c['face'], 255)
    # The cross, three pixels to an arm, with a pixel of its own shadow below and to the right.
    mid = SIDE // 2
    arm = [(mid, y) for y in range(mid - 2, mid + 3)] + [(x, mid) for x in range(mid - 2, mid + 3)]
    for x, y in arm:
        if (x + 1, y + 1) not in arm and 1 < x + 1 < last - 1 and 1 < y + 1 < last - 1:
            px[x + 1, y + 1] = (*c['under'], 255)
    for x, y in arm:
        px[x, y] = (*c['cross'], 255)
    return img


for hero, look in LOOKS.items():
    strip = Image.new('RGBA', (SIDE * 2, SIDE), (0, 0, 0, 0))
    strip.paste(stud(look), (0, 0))
    strip.paste(stud(look, lit_up=True), (SIDE, 0))
    strip.save(ROOT / f'mas_{hero}.png')
    print(f'mas_{hero}.png', strip.size)
