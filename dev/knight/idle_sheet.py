"""Dark knight boss idle -> game sprite sheet (v1174 test).
Source: art/originals/dark_knight_idle_hailuo.mp4 (green screen, 24 fps). Loop 1.0-5.8 s at 12 fps.
Steps: soft green key + despill, keep the biggest blob, dim the pink gem/eye glow Hailuo adds, mirror (he faces the fortress on the left),
crop all frames to one shared box, blend the last frames into the first for a clean loop, shrink to TARGET_H (73% of 3x like Bonewake, to match
the tank's softness), pack into a webp sheet.  Run: python3 dev/knight/idle_sheet.py <out_dir>"""
import sys, os, subprocess, tempfile, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), "../..")
SRC = os.path.join(ROOT, "art/originals/dark_knight_idle_hailuo.mp4")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
T0, T1, FPS, BLEND = 1.0, 5.8, 12, 4
PT = 110                      # default height on screen (points)
TARGET_H = round(PT * 3 * 0.73)
COLS = 8

tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(T0), "-i", SRC, "-t", str(T1 - T0), "-vf", "fps=%d" % FPS, os.path.join(tmp, "f%03d.png")], check=True)
files = sorted(glob.glob(os.path.join(tmp, "*.png")))

def key(rgb):
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    ex = g - np.maximum(r, b)                       # how green
    a = np.clip(1 - (ex - 25) / 55, 0, 1)           # soft edge
    lab, n = ndimage.label(a > 0.5)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); keep = np.argmax(sizes) + 1
        body = ndimage.binary_dilation(lab == keep, iterations=3); a = a * body
    g2 = np.minimum(g, np.maximum(r, b) + 4)        # despill
    out = np.stack([r, g2, b], -1)
    return out, a

def dim_glow(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    lum = (r + g + b) / 3
    f = np.clip((lum - 115) / 80, 0, 1) * np.clip((np.minimum(r, b) - g - 35) / 60, 0, 1)
    dull = np.array([170, 28, 112], np.float32)       # the gems' colour in Harley's still
    w = (0.65 * f)[..., None]
    return c * (1 - w) + dull * w

frames = []
for f in files:
    rgb = np.array(Image.open(f).convert("RGB"))
    c, a = key(rgb); c = dim_glow(c)
    frames.append(np.dstack([c, a * 255])[:, ::-1])   # mirror
n = len(frames)
for i in range(BLEND):                                # last frames ease into the first one
    t = (i + 1) / (BLEND + 1); j = n - BLEND + i
    frames[j] = frames[j] * (1 - t) + frames[0] * t
al = np.max([fr[..., 3] for fr in frames], 0)
ys, xs = np.nonzero(al > 8); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
k = TARGET_H / (y1 - y0); tw = round((x1 - x0) * k); th = TARGET_H
tiles = []
for fr in frames:
    crop = fr[y0:y1, x0:x1]
    rgb = crop[..., :3] * (crop[..., 3:4] / 255)      # premultiply so edges don't go dark/green when shrunk
    im = Image.fromarray(np.dstack([rgb, crop[..., 3]]).clip(0, 255).astype(np.uint8), "RGBA").resize((tw, th), Image.LANCZOS)
    p = np.array(im).astype(np.float32); aa = p[..., 3:4] / 255
    p[..., :3] = np.where(aa > 0.01, p[..., :3] / np.maximum(aa, 0.01), 0)
    tiles.append(p.clip(0, 255).astype(np.uint8))
rows = (n + COLS - 1) // COLS
sheet = np.zeros((rows * th, COLS * tw, 4), np.uint8)
for i, t in enumerate(tiles): sheet[(i // COLS) * th:(i // COLS + 1) * th, (i % COLS) * tw:(i % COLS + 1) * tw] = t
os.makedirs(OUT, exist_ok=True)
Image.fromarray(sheet, "RGBA").save(os.path.join(OUT, "knight_idle_sheet.webp"), quality=88, method=6)
# feet: lowest solid pixel row in the shrunk frames (the anchor)
feet = max(np.nonzero(t[..., 3].max(1) > 128)[0].max() for t in tiles)
meta = {"tw": tw, "th": th, "cols": COLS, "n": n, "fps": FPS, "feet": int(feet), "pt": PT}
json.dump(meta, open(os.path.join(OUT, "knight_idle_meta.json"), "w")); print(meta, os.path.getsize(os.path.join(OUT, "knight_idle_sheet.webp")))
Image.fromarray(tiles[len(tiles) // 2], "RGBA").save(os.path.join(OUT, "knight_idle_mid.png"))
