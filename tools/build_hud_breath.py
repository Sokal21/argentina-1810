#!/usr/bin/env python3
"""Makes each hero's breath bar as wide as their experience bar, so the two stand one over the other.

The ends (Cabral's medallion and buckle, Inti's feathers) are kept as drawn and only the stretch
between them, along the channel, is drawn longer: stretching the whole bar would widen the medallion.
Where the channel is in the result is printed, to be written beside the bar in `HudScene.ts`.

    python3 tools/build_hud_breath.py
"""
from pathlib import Path

from PIL import Image

HUD = Path(__file__).resolve().parent.parent / 'assets' / 'hud'
WIDE = 232   # the experience bars' width
# The chosen drawing, the scale it is shown at, and the columns of the channel in it.
BARS = {
    'cabral': ('aliento_cabral_2', 1.0, (40, 150)),
    'inti': ('aliento_inti_1', 0.8, (32, 130)),
}

for hero, (concept, k, (a, b)) in BARS.items():
    bar = Image.open(HUD / 'concept' / f'{concept}.png').convert('RGBA')
    bar = bar.crop(bar.getbbox())
    if k != 1:
        bar = bar.resize((round(bar.width * k), round(bar.height * k)), Image.NEAREST)
    left, middle, right = bar.crop((0, 0, a, bar.height)), bar.crop((a, 0, b, bar.height)), bar.crop((b, 0, bar.width, bar.height))
    room = WIDE - left.width - right.width
    # The middle is laid again and again, never stretched, so its stitches and plaits stay pixels.
    out = Image.new('RGBA', (WIDE, bar.height))
    out.paste(left, (0, 0))
    x = left.width
    while x < left.width + room:
        piece = middle.crop((0, 0, min(middle.width, left.width + room - x), bar.height))
        out.paste(piece, (x, 0))
        x += piece.width
    out.paste(right, (left.width + room, 0))
    out.save(HUD / f'aliento_{hero}.png')
    print(hero, out.size, 'the channel grows by', room - middle.width)
