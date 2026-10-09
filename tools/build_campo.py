#!/usr/bin/env python3
"""Cuts the plants of the pampa out of their concepts, ready for the game.

SpriteCook draws them about 190 pixels tall, twice the height of a hero and
in finer pixels than the heroes are drawn in. Each is brought down to the
height it should stand at, so that one of its pixels is one of the world's,
and put back onto its own few colours so the reduction leaves no blur.

Each is then trimmed, stood on the bottom row in the middle, and given a
margin at the sides to sway into. All come out the same size: the wind that
moves them counts on it.

    python3 tools/build_campo.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'campo'
# How tall each kind stands, in world pixels, and the concepts it is cut from.
# A hero is about 94.
PLANTS = {
    'cortadera': (88, ['cortadera_1', 'cortadera_2', 'cortadera_3']),
    'cardo': (108, ['cardo_1', 'cardo_2', 'cardo_3']),
    'tuna': (64, ['tuna_1', 'tuna_2', 'tuna_3']),
    'maiz': (104, ['maiz_1', 'maiz_2', 'maiz_3']),
    # The trees are left as drawn, and the game shows them larger still.
    'tala': (150, ['tala_1', 'tala_2']),
    'junco': (80, ['junco_1', 'junco_2', 'junco_3']),
}
MARGIN = 8    # pixels of room at each side
COLOURS = 24  # colours a plant is put back onto


def reduced(plant: Image.Image, tall: int) -> Image.Image:
    """The plant at its standing height, in whole pixels of its own colours."""
    plant = plant.crop(plant.getbbox())
    if plant.height <= tall:
        return plant
    wide = max(1, round(plant.width * tall / plant.height))
    small = plant.resize((wide, tall), Image.LANCZOS)
    # Its own colours, taken from what is solid in the original.
    solid = Image.new('RGB', plant.size)
    solid.paste(plant.convert('RGB'), mask=plant.getchannel('A').point(lambda a: 255 if a > 200 else 0))
    palette = solid.quantize(COLOURS, method=Image.MEDIANCUT)
    flat = small.convert('RGB').quantize(palette=palette, dither=Image.NONE).convert('RGBA')
    # A pixel is there or it is not: thin stems are kept rather than faded.
    flat.putalpha(small.getchannel('A').point(lambda a: 255 if a > 96 else 0))
    return flat


cut = {}
for kind, (tall, concepts) in PLANTS.items():
    for n, concept in enumerate(concepts):
        cut[f'{kind}_{"abc"[n]}'] = reduced(Image.open(ROOT / 'concept' / f'{concept}.png').convert('RGBA'), tall)
width = max(p.width for p in cut.values()) + 2 * MARGIN
height = max(p.height for p in cut.values())
for name, plant in cut.items():
    padded = Image.new('RGBA', (width, height))
    padded.paste(plant, ((width - plant.width) // 2, height - plant.height))
    padded.save(ROOT / f'{name}.png')
print(len(cut), 'plants of', (width, height))
