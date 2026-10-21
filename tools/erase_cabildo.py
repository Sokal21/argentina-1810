"""Paint the Cabildo out of the title's background, for the 3D one to stand in its place, and
clear its sky, for the 3D sky to show through.

    python3 tools/erase_cabildo.py

Each box it stood in is filled from either side, mirrored: what is beside its edge goes on past
it, so the sky, the clouds and the row of houses run on without a seam at the box's edges; the
two halves meet in the middle, behind the 3D tower. The painting is kept; the plaza without it
is written beside it. The sky is everything above the houses' roofline, found down each column
as the first pixel darker than any sky (the houses are near black, the sky's darkest is not).
"""
from PIL import Image

SRC, DST = 'assets/titulo/cabildo.png', 'assets/titulo/plaza.png'
# Where it stood: its body (roof to foot) and its tower (cross to roof), as (left, top, right, bottom).
BOXES = [(284, 246, 676, 350), (436, 84, 524, 246)]

im = Image.open(SRC).convert('RGB')
p = im.load()
for left, top, right, bottom in BOXES:
    middle = (left + right) // 2
    for y in range(top, bottom):
        for x in range(left, right):
            p[x, y] = p[left - 1 - (x - left), y] if x < middle else p[right + (right - 1 - x), y]
# The sky, cleared.
SKY_ENDS, DARK = 240, 45
im = im.convert('RGBA')
p = im.load()
for x in range(im.width):
    roof = next(y for y in range(SKY_ENDS, im.height) if sum(p[x, y][:3]) < DARK)
    for y in range(roof):
        p[x, y] = (0, 0, 0, 0)
im.save(DST)
print('WROTE', DST)
