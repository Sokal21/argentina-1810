"""Assemble Cabral's about-turn and his changes of side from turns he has.

Neither was generated. Changing side has no frames of its own, because his
side views are one drawing mirrored; turning right round was three turns run
one after another. Each sheet here strings frames of his finished turn
sheets into one move:

  giro_lado_frente    heading left -> right, seen from the front: the turn
                      toward the viewer played backwards and mirrored, the
                      straight front view, then the same turn.
  giro_lado_diagonal  the same for the down diagonals, a shorter way round.
  giro_lado_espalda   the same from behind, through the straight back view.
  giro_norte_sur      heading up -> down, round by his right.

Each reads left to right as named and is played backwards for the opposite
change. None is ever mirrored when drawn. Every frame is moved so the middle
of his body sits on column AX.

Usage: python3 tools/build_cabral_turns.py     (from the project root, after
       tools/build_cabral_sheet.py has made the sheets it reads)
"""
from PIL import Image, ImageOps

D = "assets/cabral"
FRAME, AX = 94, 47
# Each source sheet, and where the middle of his body is in its frames.
SOURCES = {
    "fine": ("giro_sur_frente_fino", 46),   # straight front -> three quarters
    "side": ("giro_frente_espalda", 47),    # three quarters front -> back
    "back": ("giro_espalda_norte", 45),     # three quarters back -> straight back
    "south": ("trote_sur", 47),
    "north": ("trote_norte", 44),
}


def take(source, k, mirrored=False):
    name, ax = SOURCES[source]
    sheet = Image.open(f"{D}/{name}.png").convert("RGBA")
    frame = sheet.crop((k * FRAME, 0, (k + 1) * FRAME, FRAME))
    if mirrored:
        frame = ImageOps.mirror(frame)
        ax = FRAME - 1 - ax
    out = Image.new("RGBA", (FRAME, FRAME))
    out.paste(frame, (AX - ax, 0))
    return out


def there_and_back(source, frames, straight):
    """Mirrored frames in toward the straight view, it, then the frames out."""
    out = [take(source, k) for k in frames]
    return [ImageOps.mirror(f).transform(f.size, Image.AFFINE, (1, 0, -1, 0, 1, 0)) for f in reversed(out)] \
        + [take(straight, 0)] + out


SHEETS = {
    "giro_lado_frente": there_and_back("fine", [2, 3, 4], "south"),
    "giro_lado_diagonal": there_and_back("fine", [2], "south"),
    # The back turn runs from three quarters to straight, so out is backwards.
    "giro_lado_espalda": there_and_back("back", [3, 2, 1], "north"),
    "giro_norte_sur": [take("back", 3), take("back", 2), take("back", 1), take("side", 3), take("side", 2),
                       take("fine", 4), take("fine", 3), take("fine", 2)],
}

if __name__ == "__main__":
    for name, frames in SHEETS.items():
        sheet = Image.new("RGBA", (FRAME * len(frames), FRAME))
        for i, frame in enumerate(frames):
            sheet.paste(frame, (i * FRAME, 0))
        sheet.save(f"{D}/{name}.png")
        print(f"{D}/{name}.png: {len(frames)} frames")
