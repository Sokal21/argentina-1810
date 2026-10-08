"""Build the left <-> right turn sheets used by the demo.

Side views are one sprite drawn mirrored, so changing side has no frames of
its own. These sheets are assembled from turns that already exist: the first
half is a turn toward the straight view played backwards, the middle is that
straight view's standing pose, and the second half is the same turn mirrored.
Every frame therefore comes from a sheet the trots already connect to.

Each sheet reads left-to-right as "facing left -> facing right"; the demo
plays it backwards for the opposite change and never mirrors it.

Usage: python3 tools/build_turn_side_flip.py
"""
from PIL import Image, ImageOps

from build_turn_north_back import FRAME, A, frame, squash_and_centre

# name: (turn sheet, frames from the side view toward the straight view,
#        straight view's sheet, its standing frame)
FLIPS = {
    "giro_lado_frente": (f"{A}/giro_abajo_frente/giro_sheet.png", [5, 3],
                         f"{A}/trote_abajo/trote_abajo_sheet.png", 0),
    "giro_lado_diagonal": (f"{A}/giro_abajo_frente/giro_sheet.png", [2, 1],
                           f"{A}/trote_abajo/trote_abajo_sheet.png", 0),
    # The same three for turning on the spot, from the standing turns.
    "giros_de_pie/lado_frente": (f"{A}/giros_de_pie/abajo_frente.png", [4, 2],
                                 f"{A}/giros_de_pie/abajo_frente.png", 0),
    "giros_de_pie/lado_diagonal": (f"{A}/giros_de_pie/abajo_frente.png", [2, 1],
                                   f"{A}/giros_de_pie/abajo_frente.png", 0),
    "giros_de_pie/lado_espalda": (f"{A}/giros_de_pie/arriba_espalda.png", [4, 2],
                                  f"{A}/giros_de_pie/arriba_espalda.png", 0),
    "giro_lado_espalda": (f"{A}/giro_arriba_espalda/giro_sheet_ajustado.png", [1, 0],
                          f"{A}/trote_arriba/trote_arriba_sheet.png", 0),
}

if __name__ == "__main__":
    for name, (turn, ks, straight, k0) in FLIPS.items():
        half = [squash_and_centre(frame(turn, k), 1.0) for k in ks]
        frames = half + [squash_and_centre(frame(straight, k0), 1.0)] + [ImageOps.mirror(f) for f in reversed(half)]
        sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), (0, 0, 0, 0))
        for i, im in enumerate(frames):
            sheet.paste(im, (i * FRAME, 0))
        out = f"{A}/{name}.png"
        sheet.save(out)
        print(out, sheet.size)
