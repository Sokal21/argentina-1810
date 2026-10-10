#!/usr/bin/env python3
"""Makes each hero's experience bar ready for the HUD.

Each bar is drawn empty, in the manner of that hero's HUD, with a dark
channel along it for the game to fill and a recess at its left end for the
level. This trims it and brings it to the width it is shown at. Where the
channel and the recess are is read off the result and written beside the
bar in `src/scenes/HudScene.ts`: finding them by their darkness was tried
and took wood for channel.

    python3 tools/build_hud_bars.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'hud'
WIDE = 232   # how wide a bar is shown, in the HUD's own pixels
BARS = {'inti': 'barra_inti_2', 'cabral': 'barra_cabral_2'}
COLOURS = 28


for hero, concept in BARS.items():
    bar = Image.open(ROOT / 'concept' / f'{concept}.png').convert('RGBA')
    bar = bar.crop(bar.getbbox())
    if bar.width != WIDE:
        tall = round(bar.height * WIDE / bar.width)
        small = bar.resize((WIDE, tall), Image.LANCZOS)
        solid = Image.new('RGB', bar.size)
        solid.paste(bar.convert('RGB'), mask=bar.getchannel('A').point(lambda a: 255 if a > 200 else 0))
        flat = small.convert('RGB').quantize(palette=solid.quantize(COLOURS, method=Image.MEDIANCUT), dither=Image.NONE).convert('RGBA')
        flat.putalpha(small.getchannel('A').point(lambda a: 255 if a > 110 else 0))
        bar = flat
    bar.save(ROOT / f'barra_{hero}.png')
    print(f'{hero}: {bar.size}')
