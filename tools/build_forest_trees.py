#!/usr/bin/env python3
"""Cuts the forest's trees out of their concepts, ready for the game.

Each is trimmed to what is drawn, so its trunk stands on the bottom row and in
the middle, and then given a margin at the sides and the top for its crown to
sway into. All come out the same size: the wind that moves them counts on it.
They stay at the scale SpriteCook drew them (about 80 pixels): the game
enlarges them, twice for a tree standing in the forest and three times for
the wall of trees at its edge.

    python3 tools/build_forest_trees.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'bosque'
# The concept each tree comes from.
TREES = {'araucaria_a': 'araucaria_e', 'araucaria_b': 'araucaria_f', 'araucaria_c': 'araucaria_g'}
MARGIN = 3  # pixels of room at each side

cut = {}
for name, concept in TREES.items():
    tree = Image.open(ROOT / 'concept' / f'{concept}.png').convert('RGBA')
    cut[name] = tree.crop(tree.getbbox())
width = max(tree.width for tree in cut.values()) + 2 * MARGIN
height = max(tree.height for tree in cut.values())
for name, tree in cut.items():
    padded = Image.new('RGBA', (width, height))
    padded.paste(tree, ((width - tree.width) // 2, height - tree.height))
    padded.save(ROOT / f'{name}.png')
    print(name, padded.size)
