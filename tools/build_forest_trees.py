#!/usr/bin/env python3
"""Cuts the forest's trees out of their concepts, ready for the game.

Each is trimmed to what is drawn, so its trunk stands on the bottom row and in
the middle. They stay at the size SpriteCook drew them (about 80 pixels): the
game enlarges them, twice for a tree standing in the forest and three times
for the wall of trees at its edge.

    python3 tools/build_forest_trees.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'bosque'
# The concept each tree comes from.
TREES = {'araucaria_a': 'araucaria_e', 'araucaria_b': 'araucaria_f', 'araucaria_c': 'araucaria_g'}

for name, concept in TREES.items():
    tree = Image.open(ROOT / 'concept' / f'{concept}.png').convert('RGBA')
    tree = tree.crop(tree.getbbox())
    tree.save(ROOT / f'{name}.png')
    print(name, tree.size)
