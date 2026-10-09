#!/usr/bin/env python3
"""Cuts the stake fence and the adobe wall into pieces the game can chain.

Both were drawn once, seen from the front, in the concept sheet, and the wall
again seen running away up the picture. From those this makes, at half the
drawn size so a pixel of theirs is a pixel of the world:

  cerca_frente.png      a length of fence seen from the front, which repeats
  cerca_palo_N.png      its posts one by one, to stand in a row going away
  tapia_frente.png      a length of wall seen from the front, which repeats
  tapia_arriba.png      its coping seen from above, which repeats up the picture
  tapia_punta.png       the end of a wall that comes toward the viewer

    python3 tools/build_cercas.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'campo'
HALF = 0.5
COLOURS = 20


def reduced(piece: Image.Image) -> Image.Image:
    """The piece at half size, in whole pixels of its own colours."""
    piece = piece.crop(piece.getbbox())
    size = (max(1, round(piece.width * HALF)), max(1, round(piece.height * HALF)))
    small = piece.resize(size, Image.LANCZOS)
    solid = Image.new('RGB', piece.size)
    solid.paste(piece.convert('RGB'), mask=piece.getchannel('A').point(lambda a: 255 if a > 200 else 0))
    palette = solid.quantize(COLOURS, method=Image.MEDIANCUT)
    flat = small.convert('RGB').quantize(palette=palette, dither=Image.NONE).convert('RGBA')
    flat.putalpha(small.getchannel('A').point(lambda a: 255 if a > 96 else 0))
    return flat


def concept(name: str) -> Image.Image:
    return Image.open(ROOT / 'concept' / f'{name}.png').convert('RGBA')


# The fence, and its posts: the columns of it that reach nearly its full height.
fence = reduced(concept('cerca_frente'))
fence.save(ROOT / 'cerca_frente.png')
alpha = fence.getchannel('A')
tall = [sum(1 for y in range(fence.height) if alpha.getpixel((x, y))) for x in range(fence.width)]
posts, start = [], None
for x, t in enumerate(tall + [0]):
    if t > fence.height * 0.6 and start is None:
        start = x
    elif t <= fence.height * 0.6 and start is not None:
        posts.append((start, x))
        start = None
for n, (x0, x1) in enumerate(posts):
    post = fence.crop((x0 - 1, 0, x1 + 1, fence.height))
    post.crop(post.getbbox()).save(ROOT / f'cerca_palo_{n}.png')

# The wall from the front: its middle, clear of the shaded end, so it repeats.
wall = concept('tapia_frente')
wall = wall.crop(wall.getbbox())
reduced(wall.crop((22, 0, wall.width - 6, wall.height))).save(ROOT / 'tapia_frente.png')

# The wall going away: the coping from above, and the end that faces the viewer.
side = concept('tapia_costado_1')
side = side.crop(side.getbbox())
end = 46   # rows of the end face, at the bottom of the drawing
reduced(side.crop((0, 8, side.width, side.height - end - 8))).save(ROOT / 'tapia_arriba.png')
reduced(side.crop((0, side.height - end - 8, side.width, side.height))).save(ROOT / 'tapia_punta.png')

for piece in sorted(ROOT.glob('cerca_*.png')) + sorted(ROOT.glob('tapia_*.png')):
    print(piece.name, Image.open(piece).size)
