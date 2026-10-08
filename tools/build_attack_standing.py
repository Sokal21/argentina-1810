"""Build the standing attack sheets from the walking ones.

The attack was only generated as a slow walk, so casting while standing still
showed her walking on the spot. Each walking frame keeps everything above the
hem of the dress (body, arms, branch, light) and takes the hem and the shoes
from the sheet's first frame, which is the standing pose, so the feet stay
planted while the cast plays.

Usage: python3 tools/build_attack_standing.py
"""
from PIL import Image

A = "assets/machi"
FRAME = 94
# Rows from here down come from the standing frame. It sits below the lowest
# the light ever reaches (the downward cast, row 77) and above every hem.
CUT = 79

SHEETS = {
    f"{A}/ataque_caminata/ataque_caminata_sheet.png": f"{A}/ataque_caminata/ataque_de_pie_sheet.png",
    f"{A}/diag_abajo/ataque_sheet.png": f"{A}/diag_abajo/ataque_de_pie_sheet.png",
    f"{A}/ataque_caminata_espalda/sheet.png": f"{A}/ataque_caminata_espalda/de_pie_sheet.png",
    f"{A}/ataque_caminata_abajo/sheet.png": f"{A}/ataque_caminata_abajo/de_pie_sheet.png",
    f"{A}/ataque_caminata_arriba/sheet.png": f"{A}/ataque_caminata_arriba/de_pie_sheet.png",
}

if __name__ == "__main__":
    for src, dst in SHEETS.items():
        walk = Image.open(src).convert("RGBA")
        feet = walk.crop((0, CUT, FRAME, FRAME))
        out = walk.copy()
        for k in range(walk.width // FRAME):
            out.paste(feet, (k * FRAME, CUT))
        out.save(dst)
        print(dst, out.size)
