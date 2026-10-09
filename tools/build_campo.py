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
    # The one ombú, a landmark: drawn at this size and shown at about twice it.
    'ombu': (125, ['ombu_7']),
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


def chance(n: int) -> float:
    """A number from 0 up to 1, always the same for the same n."""
    return ((n * 2654435761) % 4294967296) / 4294967296


def rooted(tree: Image.Image, lift: int = 9, swell: int = 3) -> Image.Image:
    """The tree with the foot of its roots uneven, where it was drawn cut off along a straight line.

    The roots at the sides are ended higher than those in the middle, as a
    round foot is seen from above, and the line they end along rises and
    falls a little as it goes. What is left is edged in the bark's darkest,
    as the rest of the tree is, and anything cut loose from it is dropped.
    """
    import math
    tree = tree.copy()
    px, (w, h) = tree.load(), tree.size
    for x in range(w):
        side = ((x - w / 2) / (w / 2)) ** 2
        wave = math.sin(x * 0.21 + 1) + 0.6 * math.sin(x * 0.53) + 0.4 * math.sin(x * 1.1 + 2)
        for y in range(h - max(0, round(lift * side + swell * (wave + 1) / 2)), h):
            px[x, y] = (0, 0, 0, 0)
    # Only what is still joined to the trunk is kept.
    kept, edge_of = set(), [(w // 2, h // 2)]
    while edge_of:
        x, y = edge_of.pop()
        if (x, y) in kept or not (0 <= x < w and 0 <= y < h) or px[x, y][3] == 0:
            continue
        kept.add((x, y))
        edge_of += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    edge = min((px[x, y][:3] for x, y in kept if y > h // 2), key=sum)
    for x in range(w):
        for y in range(h):
            if px[x, y][3] and (x, y) not in kept:
                px[x, y] = (0, 0, 0, 0)
        low = max((y for y in range(h) if px[x, y][3]), default=-1)
        if low > h - lift - swell - 4:
            px[x, low] = (*edge, 255)
    return tree.crop(tree.getbbox())


# Those whose drawing came cut off along the bottom, and are given back an uneven foot.
ROOTED = {'ombu'}

cut = {}
for kind, (tall, concepts) in PLANTS.items():
    for n, concept in enumerate(concepts):
        plant = reduced(Image.open(ROOT / 'concept' / f'{concept}.png').convert('RGBA'), tall)
        cut[f'{kind}_{"abc"[n]}'] = rooted(plant) if kind in ROOTED else plant
width = max(p.width for p in cut.values()) + 2 * MARGIN
height = max(p.height for p in cut.values())
for name, plant in cut.items():
    padded = Image.new('RGBA', (width, height))
    padded.paste(plant, ((width - plant.width) // 2, height - plant.height))
    padded.save(ROOT / f'{name}.png')
print(len(cut), 'plants of', (width, height))
