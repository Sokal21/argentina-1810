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


def compartment(lit_up=False):
    """A square compartment of a shop's display case: a recess in dark wood, shaded where its
    walls overhang it and lit along its sill, with a frame of lighter wood round it."""
    side = 28
    frame, frame_lit, frame_dark = (96, 68, 44), (128, 94, 62), (58, 40, 26)
    back, deep, sill = (40, 29, 22), (24, 17, 13), (74, 53, 36)
    if lit_up:
        frame, frame_lit, back, sill = (150, 112, 60), (196, 156, 88), (56, 42, 30), (104, 78, 50)
    img = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    px = img.load()
    last = side - 1
    for y in range(side):
        for x in range(side):
            d = min(x, y, last - x, last - y)        # how far in from the edge
            if d == 0:
                px[x, y] = (*((16, 12, 10)), 255)    # the line round it
            elif d == 1:
                px[x, y] = (*(frame_lit if (y == 1 or x == 1) else frame_dark), 255)
            elif d == 2:
                px[x, y] = (*frame, 255)
            elif d == 3:
                px[x, y] = (*(deep if (y == 3 or x == 3) else sill), 255)   # overhang above and left, sill below and right
            else:
                px[x, y] = (*back, 255)
    return img


case = Image.new('RGBA', (56, 28), (0, 0, 0, 0))
case.paste(compartment(), (0, 0))
case.paste(compartment(lit_up=True), (28, 0))
case.save(ROOT / 'casilla.png')
print('casilla.png', case.size)
