#!/usr/bin/env python3
"""Lays out someone's standing animation as a row of frames, and measures it.

SpriteCook returns an animated WebP of square frames. This writes them side
by side as a sheet, kept beside it untouched as NAME_original.png, and says
where the feet are in a frame and how tall the figure stands in each, so a
frame that grew or shrank shows up as a number.

    python3 tools/build_idle.py IN.webp assets/gente/NAME_idle.png [--still-below ROW] [--tall N]

Asked to keep the feet still, the model moves a leg anyway and whoever is
standing about seems to walk on the spot. `--still-below ROW` takes every
frame's rows from ROW down out of the first frame, so that only what is
above the waist moves. The row is counted in the frames as they came.

`--tall N` brings the frames to the size at which the figure of the first
stands N pixels tall: for when the still drawing was resized after it was
generated and the animation was made from the one before.
"""
import sys
from pathlib import Path

from PIL import Image, ImageSequence

source, out = Path(sys.argv[1]), Path(sys.argv[2])
frames = [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(source))]
size = frames[0].width

def laid(frames):
    sheet = Image.new('RGBA', (size * len(frames), size))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (size * i, 0))
    return sheet


laid(frames).save(out.with_name(out.stem + '_original.png'))
if '--still-below' in sys.argv:
    row = int(sys.argv[sys.argv.index('--still-below') + 1])
    legs = frames[0].crop((0, row, size, size))
    for frame in frames[1:]:
        frame.paste(legs, (0, row))
if '--tall' in sys.argv:
    tall = int(sys.argv[sys.argv.index('--tall') + 1])
    box = frames[0].getbbox()
    size = round(size * tall / (box[3] - box[1]))
    frames = [frame.resize((size, size), Image.NEAREST) for frame in frames]
laid(frames).save(out)

boxes = [f.getbbox() for f in frames]
bottom = max(b[3] for b in boxes)
# Where the still drawing's middle falls: it is that drawing, trimmed, that the game stands on a spot.
print(f'{out}: {len(frames)} frames of {size}')
print(f'  ax {round((boxes[0][0] + boxes[0][2]) / 2)}  up {size - bottom}')
print('  tall', [b[3] - b[1] for b in boxes])
print('  wide', [b[2] - b[0] for b in boxes])
print('  bottom row', [b[3] for b in boxes])
