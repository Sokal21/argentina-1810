"""Flatten a pixel-art sprite: fewer tones, fewer internal borders, no shadows.

Dark cloth (black/grey pixels) is reduced to one or two flat tones; with two,
thin fold lines are absorbed by a majority filter. Greys snap to a silver ramp.
Every other color is grouped by hue family and each family keeps at most
`--tones` flat colors, so shading disappears but hues never bleed together.

Usage: python3 tools/flatten_sprite.py IN.png OUT.png [--cloth-tones 1] [--tones 2]
"""
import argparse
import colorsys

import numpy as np
from PIL import Image

CLOTH_DARK = (10, 9, 14)
CLOTH_LIGHT = (28, 28, 32)
CLOTH_SINGLE = (17, 16, 20)
SILVER = [(70, 72, 80), (130, 134, 142), (190, 194, 200), (240, 242, 245)]
HUE_BINS = 24


def box_sum(a, r):
    """Sum of `a` over a (2r+1)x(2r+1) window around each pixel."""
    p = np.pad(a, r)
    out = np.zeros_like(a, dtype=np.int32)
    h, w = a.shape
    for dy in range(2 * r + 1):
        for dx in range(2 * r + 1):
            out += p[dy:dy + h, dx:dx + w]
    return out


def split_tones(px, k, merge):
    """K-means on one hue family; drops to fewer tones while any two centers
    are closer than `merge`, so plain shading collapses but a distinct trim
    color (e.g. a bright edge on a dull cloth) survives."""
    while True:
        order = np.argsort(px.sum(axis=1))
        centers = px[order[np.linspace(0, len(px) - 1, k).astype(int)]]
        for _ in range(12):
            labels = np.linalg.norm(px[:, None] - centers[None], axis=2).argmin(axis=1)
            for i in range(k):
                if (labels == i).any():
                    centers[i] = np.median(px[labels == i], axis=0)
        gaps = [np.linalg.norm(centers[i] - centers[j]) for i in range(k) for j in range(i)]
        if k == 1 or min(gaps) >= merge:
            return labels, centers
        k -= 1


def flatten(src, dst, radius, tones, dark_max, split, passes, cloth_tones, merge):
    im = np.array(Image.open(src).convert("RGBA"))
    rgb = im[..., :3].astype(np.int32)
    opaque = im[..., 3] > 0

    mx = rgb.max(axis=2)
    spread = mx - rgb.min(axis=2)
    lum = rgb.mean(axis=2)
    cloth = opaque & (mx < dark_max) & (spread < 18)

    out = im.copy()
    if cloth_tones == 1:
        # No shading at all: the whole garment is one flat color.
        out[cloth, :3] = CLOTH_SINGLE
    else:
        # Two tones, then a majority vote removes thin fold/border lines.
        dark = cloth & (mx < split)
        if radius > 0:
            for _ in range(passes):
                n_dark = box_sum(dark.astype(np.int32), radius)
                n_cloth = box_sum(cloth.astype(np.int32), radius)
                dark = cloth & (n_dark * 2 > n_cloth)
        out[cloth & dark, :3] = CLOTH_DARK
        out[cloth & ~dark, :3] = CLOTH_LIGHT

    # Greys (silver jewelry, eyes) snap to a fixed ramp so they never pick up
    # a tint from neighbouring colors.
    grey = opaque & ~cloth & (spread < 22)
    ramp = np.array(SILVER)
    idx = np.abs(lum[..., None] - ramp.mean(axis=1)).argmin(axis=2)
    out[grey, :3] = ramp[idx[grey]]

    # Everything else: one hue family at a time, each reduced to a few flat
    # tones.
    rest = opaque & ~cloth & ~grey
    hue = np.zeros(lum.shape, dtype=np.int32)
    for y, x in zip(*np.nonzero(rest)):
        h = colorsys.rgb_to_hsv(*(rgb[y, x] / 255.0))[0]
        hue[y, x] = int(h * HUE_BINS + 0.5) % HUE_BINS
    for b in range(HUE_BINS):
        fam = rest & (hue == b)
        if not fam.any():
            continue
        px = rgb[fam].astype(np.float64)
        labels, centers = split_tones(px, tones, merge)
        out[fam, :3] = centers[labels].astype(np.uint8)

    Image.fromarray(out, "RGBA").save(dst)
    n = len({tuple(c) for c in out[opaque][:, :3]})
    print(f"{dst}: {n} colors")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--cloth-tones", type=int, choices=(1, 2), default=2, help="1 = no shadows on cloth")
    ap.add_argument("--radius", type=int, default=2, help="majority filter radius for two-tone cloth (0 = off)")
    ap.add_argument("--passes", type=int, default=1, help="majority filter passes")
    ap.add_argument("--tones", type=int, default=2, help="max flat tones per hue family")
    ap.add_argument("--dark-max", type=int, default=60, help="pixels darker than this count as cloth")
    ap.add_argument("--split", type=int, default=29, help="brightness that separates the two cloth tones")
    ap.add_argument("--merge", type=float, default=45, help="tones closer than this RGB distance become one")
    a = ap.parse_args()
    flatten(a.src, a.dst, a.radius, a.tones, a.dark_max, a.split, a.passes, a.cloth_tones, a.merge)
