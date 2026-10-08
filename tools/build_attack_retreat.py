"""Make the backing-away casts actually step backwards.

The generator was asked for her retreating while she casts, but it drew the
same forward steps as the walking cast: her shoes land in the same places on
the same frames. Walking backwards is those steps in the opposite order, so
each frame here keeps everything above the hem as generated and takes the hem
and shoes from the frame that mirrors it in time. The cast still plays
forwards; only the feet run the other way, which is what stops them sliding
over the ground when she moves against her aim.

Usage: python3 tools/build_attack_retreat.py
"""
from PIL import Image

from build_attack_standing import A, FRAME, is_light

# Rows from here down are hem and shoes in every view.
CUT = 79
VIEWS = ["frente", "diagonal", "espalda", "abajo", "arriba"]

if __name__ == "__main__":
    for view in VIEWS:
        src = Image.open(f"{A}/ataque_retroceso/{view}.png").convert("RGBA")
        n = src.width // FRAME
        out = src.copy()
        for k in range(n):
            feet = src.crop(((n - k) % n * FRAME, CUT, ((n - k) % n + 1) * FRAME, FRAME))
            out.paste(feet, (k * FRAME, CUT))
            # A spell flying low must not be lost with the feet it passed over.
            px, dst = src.load(), out.load()
            for y in range(CUT, FRAME):
                for x in range(k * FRAME, (k + 1) * FRAME):
                    if is_light(px[x, y]):
                        dst[x, y] = px[x, y]
        out.save(f"{A}/ataque_retroceso/{view}_pies_atras.png")
        print(view)
