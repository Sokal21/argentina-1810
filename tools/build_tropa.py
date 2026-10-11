#!/usr/bin/env python3
"""Lays out the sheets of the king's other men, and says what the game needs to know of each.

SpriteCook returns each animation as an animated WebP of square frames. This
writes each as a row of frames, `assets/tropa/KIND_WHAT.png`, keeping the
untouched one beside it as `..._original.png`, and prints for each the side
of a frame, how many there are, where the feet are across the first frame,
and how tall the figure stands in each: what goes into `LOOKS` in
`src/tropa/Trooper.ts`, and what shows a frame that grew.

    python3 tools/build_tropa.py DIR      # DIR holds KIND_WHAT.webp files
"""
import sys
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'tropa'
# Kinds that came back in finer pixels than the rest, and the side their frames are brought down to.
SHRINK = {'tirador': 86}
COLOURS = 28


def shrunk(frame: Image.Image, side: int) -> Image.Image:
    """A frame at a smaller size, in whole pixels of its own colours."""
    small = frame.resize((side, side), Image.LANCZOS)
    solid = Image.new('RGB', frame.size)
    solid.paste(frame.convert('RGB'), mask=frame.getchannel('A').point(lambda a: 255 if a > 200 else 0))
    flat = small.convert('RGB').quantize(palette=solid.quantize(COLOURS, method=Image.MEDIANCUT), dither=Image.NONE).convert('RGBA')
    flat.putalpha(small.getchannel('A').point(lambda a: 255 if a > 110 else 0))
    return flat


for source in sorted(Path(sys.argv[1]).glob('*_*.webp')):
    frames = [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(source))]
    size = frames[0].width
    original = Image.new('RGBA', (size * len(frames), size))
    for i, frame in enumerate(frames):
        original.paste(frame, (size * i, 0))
    original.save(ROOT / f'{source.stem}_original.png')
    side = SHRINK.get(source.stem.split('_')[0])
    if side:
        frames = [shrunk(frame, side) for frame in frames]
        size = side
    sheet = Image.new('RGBA', (size * len(frames), size))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (size * i, 0))
    sheet.save(ROOT / f'{source.stem}.png')
    boxes = [f.getbbox() for f in frames]
    first = frames[0].load()
    # The feet: what stands on the lowest rows of the first frame.
    low = [x for x in range(size) for y in range(boxes[0][3] - 4, boxes[0][3]) if first[x, y][3] > 0]
    print(f"{source.stem}: size {size} frames {len(frames)} ax {round((min(low) + max(low)) / 2)} "
          f"tall {[b[3] - b[1] for b in boxes]} bottom {sorted(set(b[3] for b in boxes))}")
