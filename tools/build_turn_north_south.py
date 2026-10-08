"""Build the half-turn sheet (straight back -> straight front) used by the demo.

The generated animation turns to her right for two frames and then continues
over her left, so it reads as turning back on itself. This keeps one direction
only: the first turning frame is mirrored, the stray right-profile frame is
dropped, and every frame is centred on the body. It also redraws the face the
way the trot sheets draw it (one small grey pixel per eye, no mouth), and
makes the turn end on the down trot's own standing pose.

Usage: python3 tools/build_turn_north_south.py
"""
from collections import Counter

from PIL import Image, ImageOps

from build_turn_north_back import FRAME, A, frame, squash_and_centre

SRC = f"{A}/giro_arriba_abajo/giro_sheet.png"
OUT = f"{A}/giro_arriba_abajo/giro_sheet_ajustado.png"
LANDING = f"{A}/trote_abajo/trote_abajo_sheet.png"  # frame 0 is its standing pose
# (frame index, mirrored)
STEPS = [(1, True), (3, False), (4, False), (5, False)]

EYE = (62, 63, 67)
FACE_ROWS = 15  # rows below the top of the head that can hold eyes or a mouth
FACE_HALF = 5   # the front-facing face spans this many pixels each side of its centre


def is_skin(p):
    return p[3] and p[0] > 180 and 120 < p[1] < 165


def simplify_face(im):
    px = im.load()
    top = im.getbbox()[1]
    near = lambda x, y, dx, dy: any(is_skin(px[x + dx * d, y + dy * d]) for d in (1, 2, 3))
    # Facial features: non-skin pixels with skin on all four sides.
    marks = [(x, y) for y in range(top, top + FACE_ROWS) for x in range(3, im.width - 3)
             if px[x, y][3] and not is_skin(px[x, y])
             and near(x, y, -1, 0) and near(x, y, 1, 0) and near(x, y, 0, -1) and near(x, y, 0, 1)]
    # One flat skin tone for the whole face: the most common one in the head.
    head = [(x, y) for y in range(top, top + FACE_ROWS) for x in range(im.width) if is_skin(px[x, y])]
    if not head:
        return im
    skin = Counter(px[x, y] for x, y in head).most_common(1)[0][0]
    for x, y in head + marks:
        px[x, y] = skin
    if not marks:
        return im
    # Group touching marks; each group in the eye rows becomes a single pixel.
    eye_row = min(y for _, y in marks)
    groups = []
    for m in sorted(marks):
        for g in groups:
            if any(abs(m[0] - x) <= 1 and abs(m[1] - y) <= 1 for x, y in g):
                g.append(m)
                break
        else:
            groups.append([m])
    eyes = [g for g in groups if min(y for _, y in g) <= eye_row + 1]
    if len(eyes) == 2:
        # Facing the camera. The trot draws this face 11 px wide with hair on
        # both sides and the eyes 4 px apart; the generator left it 14-15 px
        # wide, so hair is painted back over the cheeks.
        spans = [[x for x in range(im.width) if is_skin(px[x, y])] for y in range(eye_row, eye_row + 4)]
        cx = round(sum(min(r) + max(r) for r in spans if r) / (2 * sum(1 for r in spans if r)))
        hair = Counter(px[x, y] for y in range(top, top + FACE_ROWS) for x in range(im.width)
                       if px[x, y][3] and max(px[x, y][:3]) < 40).most_common(1)[0][0]
        for y in range(top, top + FACE_ROWS + 3):
            for x in range(im.width):
                if is_skin(px[x, y]) and abs(x - cx) > FACE_HALF:
                    px[x, y] = hair
        px[cx - 2, eye_row] = px[cx + 2, eye_row] = (*EYE, 255)
    else:
        for g in eyes:
            px[sum(x for x, _ in g) // len(g), min(y for _, y in g)] = (*EYE, 255)
    return im


if __name__ == "__main__":
    frames = []
    for k, mirrored in STEPS:
        im = frame(SRC, k)
        if mirrored:
            im = ImageOps.mirror(im)
        frames.append(simplify_face(squash_and_centre(im, 1.0)))

    # The turn has to land on the down trot, so it ends on that sheet's own
    # standing pose. The generator's two front-facing frames are left out:
    # their drum, sash and collar are drawn differently and read as a jump.
    frames.append(squash_and_centre(frame(LANDING, 0), 1.0))

    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for i, im in enumerate(frames):
        sheet.paste(im, (i * FRAME, 0))
    sheet.save(OUT)
    print(OUT, sheet.size)
