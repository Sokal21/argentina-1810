"""Make one of Cabral's sheets ready for the game from SpriteCook's output.

Three things are wrong with what comes back, every time:
  - his head faces the opposite way to his body, so it is mirrored;
  - animating him grows his plume to three times its height, so it is cut
    back to the stub the design has;
  - he is drawn the same height as Inti, hat and all, which leaves him the
    smaller of the two. He is enlarged about the spot between his feet so he
    stands taller than her, and stays anchored where he was.

Usage: python3 tools/build_cabral_sheet.py assets/cabral/NAME.png
       reads NAME_original.png beside it, writes NAME.png
"""
import sys
from pathlib import Path

from PIL import Image

FRAME = 94
AX, FEET = 47, 93   # the spot between his feet, in a frame
SCALE = 1.15
PLUME = 5           # rows of plume left above the shako
HAIR = (16, 17, 17, 255)
PEAK = 3            # how far the shako's peak can stick out past its body

def near(p, colour, by=26):
    return p[3] and all(abs(p[i] - colour[i]) <= by for i in range(3))


def mirror_head(px):
    """Turn his head to face the way his body does.

    The design has his chest turned to the right with the shako's peak and
    his face turned to the left. His head, hat and all, is flipped about the
    middle of the shako, leaving the musket behind it where it was.
    """
    skin = lambda p: near(p, (140, 90, 61)) or near(p, (106, 64, 42))
    black = lambda p: near(p, (16, 17, 17), 14)
    plate = lambda p: near(p, (202, 167, 63))
    # His hands and buttons are those colours too, far lower down.
    top_half = [(x, y) for y in range(FRAME // 2) for x in range(FRAME)]
    chin = max(y for x, y in top_half if skin(px[x, y]))
    # The shako's body is the run of black on the row its plate sits on. The
    # head is a box that much wide plus the peak, from the top down to the chin.
    px0, py0 = min(((x, y) for x, y in top_half if plate(px[x, y]) and y < chin), key=lambda q: q[1])
    row = py0 + 2
    left = right = px0
    while black(px[left - 1, row]) or plate(px[left - 1, row]):
        left -= 1
    while black(px[right + 1, row]) or plate(px[right + 1, row]):
        right += 1
    hat_top = min(y for x, y in top_half if left <= x <= right and black(px[x, y]))
    face_top = min(y for x, y in top_half if left <= x <= right and skin(px[x, y]))

    def part(x, y):
        p = px[x, y]
        if y < face_top:
            # The shako: its body, its peak sticking out to one side, its plume.
            plume = p[0] > 130 and p[1] < 70 and y < hat_top
            return left - PEAK <= x <= right + PEAK and (black(p) or plate(p) or plume)
        # The face: only as wide as the shako, so the musket beside it stays put.
        return left <= x <= right and (skin(p) or black(p))

    head = [(x, y) for y in range(chin + 1) for x in range(FRAME) if part(x, y)]
    was = {(x, y): px[x, y] for x, y in head}
    for x, y in head:
        # Under the shako, what the face leaves behind is the back of his head.
        px[x, y] = HAIR if y >= face_top else (0, 0, 0, 0)
    for (x, y), colour in was.items():
        px[left + right - x, y] = colour


out = Path(sys.argv[1])
src = Image.open(out.with_name(out.stem + "_original.png")).convert("RGBA")
sheet = Image.new("RGBA", src.size)
for i in range(src.width // FRAME):
    frame = src.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME))
    px = frame.load()
    red = lambda p: p[0] > 130 and p[1] < 70
    hat_top = min(y for y in range(FRAME) for x in range(FRAME) if px[x, y][3] and not red(px[x, y]))
    for y in range(max(0, hat_top - PLUME)):
        for x in range(FRAME):
            px[x, y] = (0, 0, 0, 0)
    mirror_head(px)
    # Each pixel of the result takes the nearest pixel of the original.
    big = Image.new("RGBA", (FRAME, FRAME))
    bp = big.load()
    for y in range(FRAME):
        for x in range(FRAME):
            sx, sy = round(AX + (x - AX) / SCALE), round(FEET - (FEET - y) / SCALE)
            if 0 <= sx < FRAME and 0 <= sy < FRAME:
                bp[x, y] = px[sx, sy]
    sheet.paste(big, (i * FRAME, 0))
sheet.save(out)
print(f"{out}: {src.width // FRAME} frames, plume trimmed, enlarged x{SCALE}")
