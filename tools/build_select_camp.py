#!/usr/bin/env python3
"""Lays the animated camp back into the select screen's background.

The animation is of a stretch cut out of the background, and comes back in
fewer colours than the picture round it. Each frame is faded into the still
background toward its edges, so no seam shows where it is laid over.

  tools/build_select_camp.py FRAMES.png X Y
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

FEATHER = 14
frames, x, y = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
strip = Image.open(frames).convert('RGB')
back = Image.open('assets/seleccion/fondo.png').convert('RGB')
count = 12
w, h = strip.width // count, strip.height
still = back.crop((x, y, x + w, y + h))
mask = Image.new('L', (w, h), 0)
ImageDraw.Draw(mask).rectangle((FEATHER, FEATHER, w - FEATHER - 1, h - FEATHER - 1), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(FEATHER / 2))
sheet = Image.new('RGB', strip.size)
for i in range(count):
    sheet.paste(Image.composite(strip.crop((i * w, 0, i * w + w, h)), still, mask), (i * w, 0))
sheet.save('assets/seleccion/campamento.png')
print(f'assets/seleccion/campamento.png: {count} frames of {w}x{h}')
