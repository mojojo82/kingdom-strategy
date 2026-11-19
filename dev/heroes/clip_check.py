"""Edge + size check for a hero clip on a flat green / magenta screen: per-frame gap to each edge (px), figure height and area, plus a contact sheet.
Run: python3 dev/heroes/clip_check.py CLIP.mp4 green|magenta SHEET.png [every=12]"""
import glob, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw
CLIP, BG, SHEET = sys.argv[1], sys.argv[2], sys.argv[3]; EV = int(sys.argv[4]) if len(sys.argv) > 4 else 12
t = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", CLIP, os.path.join(t, "%04d.png")], check=True)
fs = sorted(glob.glob(os.path.join(t, "*.png"))); rows = []; thumbs = []
for i, f in enumerate(fs):
    a = np.asarray(Image.open(f).convert("RGB")).astype(int)
    d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]) if BG == "green" else np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    m = d < 40; m[:, :2] = m[:, -2:] = False; m[:2] = m[-2:] = False
    ys, xs = np.nonzero(m); h, w = m.shape
    rows.append((i, xs.min(), w - 1 - xs.max(), ys.min(), h - 1 - ys.max(), ys.max() - ys.min(), int(m.sum())))
    if i % EV == 0: im = Image.open(f).convert("RGB"); im.thumbnail((320, 320)); ImageDraw.Draw(im).text((4, 4), str(i), fill=(255, 255, 0)); thumbs.append(im)
R = np.array(rows); print(CLIP, len(fs), "frames", w, "x", h)
print("min gap  L %d  R %d  T %d  B %d" % tuple(R[:, 1:5].min(0)), "| height min %d max %d | area min %d max %d" % (R[:, 5].min(), R[:, 5].max(), R[:, 6].min(), R[:, 6].max()))
for side, col in (("L", 1), ("R", 2), ("T", 3), ("B", 4)):
    bad = R[R[:, col] < 20][:, 0]
    if len(bad): print("  %s under 20 px in %d frames (%d-%d)" % (side, len(bad), bad.min(), bad.max()))
cols = 6; tw, th = thumbs[0].size; S = Image.new("RGB", (cols * tw, ((len(thumbs) + cols - 1) // cols) * th), (20, 20, 20))
for k, im in enumerate(thumbs): S.paste(im, ((k % cols) * tw, (k // cols) * th))
S.save(SHEET); import shutil; shutil.rmtree(t, ignore_errors=True)
