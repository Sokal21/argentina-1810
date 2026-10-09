"""Lay the frames of an animated WebP out in a single row, as a PNG sheet.

Usage: python3 tools/webp_to_sheet.py IN.webp OUT.png
"""
import sys

from PIL import Image, ImageSequence

frames = [f.convert("RGBA") for f in ImageSequence.Iterator(Image.open(sys.argv[1]))]
w, h = frames[0].size
sheet = Image.new("RGBA", (w * len(frames), h))
for i, f in enumerate(frames):
    sheet.paste(f, (w * i, 0))
sheet.save(sys.argv[2])
print(f"{sys.argv[2]}: {len(frames)} frames of {w}x{h}")
