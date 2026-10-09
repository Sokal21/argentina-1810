#!/usr/bin/env python3
"""Cuts an animated character select card out of what SpriteCook returns.

The animation comes back as a strip of square frames with the tall card
centred on a grey matte. This finds the card in the first frame and writes
a strip of just the cards.

  tools/build_select_card.py SOURCE.webp assets/seleccion/NAME.png
"""
import sys
from PIL import Image, ImageChops

src, out = sys.argv[1:3]
strip = Image.open(src).convert('RGB')
side = strip.height
count = strip.width // side
first = strip.crop((0, 0, side, side))
matte = Image.new('RGB', first.size, first.getpixel((2, 2)))
left, top, right, bottom = ImageChops.difference(first, matte).point(lambda v: 255 if v > 24 else 0).getbbox()
w, h = right - left, bottom - top
sheet = Image.new('RGB', (w * count, h))
for i in range(count):
    sheet.paste(strip.crop((i * side + left, top, i * side + right, bottom)), (i * w, 0))
sheet.save(out)
print(f'{out}: {count} frames of {w}x{h}')
