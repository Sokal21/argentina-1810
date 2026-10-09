"""Make one of Cabral's sheets ready for the game from SpriteCook's output.

He is drawn the same height as Inti, hat and all, which leaves him the
smaller of the two. Every sheet is enlarged about the spot between his feet
so he stands taller than her, and stays anchored where he was.

More repairs can be asked for, for sheets that come back needing them:
  --plume  animating him can grow his plume to three times its height; this
           cuts it back to the stub the design has.
  --head   the first design had his head facing the opposite way to his
           body; this mirrors the head. Sheets animated from the corrected
           poses in assets/cabral/ do not need it.

  --blade=1>0,7>6   a frame can come back with his sabre missing; this
           draws frame 1's blade into frame 0, and frame 7's into frame 6.

Usage: python3 tools/build_cabral_sheet.py assets/cabral/NAME.png [--plume] [--head] [--blade=...]
       reads NAME_original.png beside it, writes NAME.png
"""
import sys
from pathlib import Path

from PIL import Image

SCALE = 1.15
PLUME = 5           # rows of plume left above the shako
PEAK = 3            # how far the shako's peak can stick out past its body
HAIR = (16, 17, 17, 255)


def near(p, colour, by=26):
    return p[3] and all(abs(p[i] - colour[i]) <= by for i in range(3))


def red(p):
    return p[3] and p[0] > 130 and p[1] < 70


def trim_plume(frame):
    """Clear all but the lowest rows of plume above the shako."""
    px = frame.load()
    w, h = frame.size
    hat_top = min(y for y in range(h) for x in range(w) if px[x, y][3] and not red(px[x, y]))
    for y in range(max(0, hat_top - PLUME)):
        for x in range(w):
            px[x, y] = (0, 0, 0, 0)


def plume_height(frame):
    """Rows of plume standing above the shako."""
    px = frame.load()
    w, h = frame.size
    rows = [y for y in range(h) for x in range(w) if px[x, y][3]]
    hat_top = min(y for y in range(h) for x in range(w) if px[x, y][3] and not red(px[x, y]))
    return hat_top - min(rows)


def mirror_head(frame):
    """Turn his head to face the way his body does.

    His head, hat and all, is flipped about the middle of the shako, leaving
    the musket behind it where it was.
    """
    px = frame.load()
    w, h = frame.size
    skin = lambda p: near(p, (140, 90, 61)) or near(p, (106, 64, 42))
    black = lambda p: near(p, (16, 17, 17), 14)
    plate = lambda p: near(p, (202, 167, 63))
    # His hands and buttons are those colours too, far lower down.
    top_half = [(x, y) for y in range(h // 2) for x in range(w)]
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
            return left - PEAK <= x <= right + PEAK and (black(p) or plate(p) or (red(p) and y < hat_top))
        # The face: only as wide as the shako, so the musket beside it stays put.
        return left <= x <= right and (skin(p) or black(p))

    head = [(x, y) for y in range(chin + 1) for x in range(w) if part(x, y)]
    was = {(x, y): px[x, y] for x, y in head}
    for x, y in head:
        # Under the shako, what the face leaves behind is the back of his head.
        px[x, y] = HAIR if y >= face_top else (0, 0, 0, 0)
    for (x, y), colour in was.items():
        px[left + right - x, y] = colour


def blade(p):
    return p[3] and p[0] > 150 and p[1] > 150 and abs(p[0] - p[2]) < 40


def hilt(frame):
    """Middle of the sabre's brass guard: the yellow by his hand, low down."""
    px = frame.load()
    w, h = frame.size
    gold = [(x, y) for y in range(h // 2, h) for x in range(w) if near(px[x, y], (202, 167, 63), 40)]
    return (sum(x for x, _ in gold) / len(gold), sum(y for _, y in gold) / len(gold))


def lend_blade(donor, frame):
    """Draw the donor frame's sabre blade into a frame that came back without one.

    The blade is placed by the guard in his hand, which both frames have, and
    only fills empty space, so it passes behind whatever is already drawn.
    """
    (dx, dy), (fx, fy) = hilt(donor), hilt(frame)
    ox, oy = round(fx - dx), round(fy - dy)
    src, dst = donor.load(), frame.load()
    w, h = frame.size
    for y in range(h):
        for x in range(w):
            # Below his hand: the white of his crossbelt is higher up.
            if blade(src[x, y]) and y > dy - 2 and 0 <= x + ox < w and 0 <= y + oy < h:
                if not dst[x + ox, y + oy][3]:
                    dst[x + ox, y + oy] = src[x, y]


def enlarge(frame):
    """Scale him up about the spot between his feet, by nearest pixel."""
    w, h = frame.size
    px = frame.load()
    ax, feet = w // 2, h - 1
    big = Image.new("RGBA", (w, h))
    bp = big.load()
    for y in range(h):
        for x in range(w):
            sx, sy = round(ax + (x - ax) / SCALE), round(feet - (feet - y) / SCALE)
            if 0 <= sx < w and 0 <= sy < h:
                bp[x, y] = px[sx, sy]
    return big


if __name__ == "__main__":
    out = Path(sys.argv[1])
    flags = set(sys.argv[2:])
    src = Image.open(out.with_name(out.stem + "_original.png")).convert("RGBA")
    size = src.height
    sheet = Image.new("RGBA", src.size)
    plumes = []
    frames = [src.crop((i * size, 0, (i + 1) * size, size)) for i in range(src.width // size)]
    for flag in flags:
        if flag.startswith("--blade="):
            for pair in flag.split("=")[1].split(","):
                donor, to = (int(n) for n in pair.split(">"))
                lend_blade(frames[donor], frames[to])
    for i, frame in enumerate(frames):
        plumes.append(plume_height(frame))
        if "--plume" in flags:
            trim_plume(frame)
        if "--head" in flags:
            mirror_head(frame)
        sheet.paste(enlarge(frame), (i * size, 0))
    sheet.save(out)
    print(f"{out}: {src.width // size} frames of {size}, enlarged x{SCALE}; plume rows as drawn: {plumes}")
