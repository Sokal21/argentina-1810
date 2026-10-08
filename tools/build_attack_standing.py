"""Build the standing attack sheets from the walking ones.

The attack was only generated as a slow walk, so casting while standing still
looked like walking on the spot. Each walking frame is turned into a standing
one in three steps:

1. it is shifted so her head sits exactly where it does in the sheet's first
   frame (the standing pose), which removes the bob and sway of the walk;
2. from the waist down, the dress and shoes are replaced by those of the
   standing pose, so the skirt and feet do not move at all;
3. whatever the walking frame draws over the skirt that is not skirt (her
   arm, the branch, the light, the drum) is put back on top, since the cast
   itself happens there in some views, and any gap that leaves inside the
   figure is closed.

Usage: python3 tools/build_attack_standing.py
"""
from PIL import Image

A = "assets/machi"
FRAME = 94
FEET = 12  # rows at the bottom that hold the hem and the shoes
HIPS = 14  # rows below the waist where the torso and the standing skirt are merged

SHEETS = {
    f"{A}/ataque_caminata/ataque_caminata_sheet.png": f"{A}/ataque_caminata/ataque_de_pie_sheet.png",
    f"{A}/diag_abajo/ataque_sheet.png": f"{A}/diag_abajo/ataque_de_pie_sheet.png",
    f"{A}/ataque_caminata_espalda/sheet.png": f"{A}/ataque_caminata_espalda/de_pie_sheet.png",
    f"{A}/ataque_caminata_abajo/sheet.png": f"{A}/ataque_caminata_abajo/de_pie_sheet.png",
    f"{A}/ataque_caminata_arriba/sheet.png": f"{A}/ataque_caminata_arriba/de_pie_sheet.png",
}


def is_dark(p):   # hair, dress
    return p[3] and max(p[:3]) < 40


def is_shoe(p):
    return p[3] and p[0] > p[1] >= p[2] and 40 <= p[0] < 120 and p[0] - p[2] > 15 and p[1] < 90


def is_red(p):    # sash
    return p[3] and p[0] > 90 and p[1] < 60


def is_light(p):  # the spell
    return p[3] and p[2] > 170 and p[2] > p[0] + 40


def is_blue(p):   # shawl
    return p[3] and p[2] > p[0] + 12 and 40 < max(p[:3]) < 125


def head(im):
    """Top of the hair and the centre of the head, from the hair alone (a
    raised branch can reach higher than the head)."""
    px = im.load()
    top = next(y for y in range(FRAME) if sum(is_dark(px[x, y]) for x in range(FRAME)) >= 4)
    xs = [x for y in range(top, top + 8) for x in range(FRAME) if is_dark(px[x, y])]
    return round(sum(xs) / len(xs)), top


def waist(im):
    """First row below the sash, or below the shawl where the sash is hidden."""
    px = im.load()
    for test in (is_red, is_blue):
        rows = [y for y in range(FRAME) for x in range(FRAME) if test(px[x, y])]
        if rows:
            return max(rows) + 1
    raise ValueError("no sash or shawl found")


def skirt(im, cut):
    """The standing pose from the waist down as plain dress and shoes: things
    drawn over the skirt there (the resting branch, a hand) are filled in."""
    px = im.load()
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dst = out.load()
    for y in range(cut, FRAME):
        dark = [x for x in range(FRAME) if is_dark(px[x, y])]
        if dark:
            black = px[dark[0], y]
            left, right = dark[0], dark[-1]
            for x in range(left, right + 1):
                dst[x, y] = px[x, y] if is_shoe(px[x, y]) else black
        for x in range(FRAME):
            if is_shoe(px[x, y]):
                dst[x, y] = px[x, y]
    return out


def standing(frame, base, cut, base_skirt):
    (hx, hy), (bx, by) = head(frame), head(base)
    moved = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    moved.paste(frame, (bx - hx, by - hy))
    out = moved.copy()
    out.paste((0, 0, 0, 0), (0, cut, FRAME, FRAME))
    out.alpha_composite(base_skirt)
    px, dst = moved.load(), out.load()
    for y in range(cut, FRAME):
        for x in range(FRAME):
            p = px[x, y]
            if not p[3] or is_dark(p) or is_shoe(p):
                continue
            # Down by the feet only the light is hers to keep: anything else
            # there is a stepping foot or ankle from the walk.
            if y >= FRAME - FEET and not is_light(p):
                continue
            dst[x, y] = p
    # The standing skirt is only known where it was visible: behind the drum
    # or a resting hand there was nothing to copy, and once those move away in
    # this frame they leave a hole showing the background. A hole is closed
    # with dress when it is boxed in on both sides and something was drawn
    # there before, in this frame's walk or in the standing pose. Requiring
    # both sides keeps the swaying outer edge of the walking skirt out.
    black = next(px[x, y] for y in range(cut, FRAME) for x in range(FRAME) if is_dark(px[x, y]))
    # Just below the waist the frame keeps its own hips as well: her torso
    # leans and twists with the cast, and a skirt cut straight across would
    # leave a notch of background under the shawl where the two do not meet.
    for y in range(cut, min(FRAME, cut + HIPS)):
        for x in range(FRAME):
            if not dst[x, y][3] and is_dark(px[x, y]):
                dst[x, y] = black
    was = base.load()
    for y in range(cut, FRAME - FEET):
        solid = [x for x in range(FRAME) if dst[x, y][3]]
        if not solid:
            continue
        for x in range(solid[0], solid[-1]):
            if not dst[x, y][3] and (is_dark(px[x, y]) or was[x, y][3]):
                dst[x, y] = black
    return out


if __name__ == "__main__":
    for src, dst in SHEETS.items():
        walk = Image.open(src).convert("RGBA")
        frames = [walk.crop((k * FRAME, 0, (k + 1) * FRAME, FRAME)) for k in range(walk.width // FRAME)]
        base = frames[0]
        cut = waist(base)
        base_skirt = skirt(base, cut)
        out = Image.new("RGBA", walk.size, (0, 0, 0, 0))
        for k, frame in enumerate(frames):
            out.paste(standing(frame, base, cut, base_skirt), (k * FRAME, 0))
        out.save(dst)
        print(dst, "waist at row", cut)
