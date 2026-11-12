"""Open-window layers (no glass): back = full ship (dark interior), front = ship with the window openings cut out; heroes drawn between.
python3 dev/ships/window_layers.py CUT.png OUTPREFIX x0 y0 x1 y1   (box around the window row in CUT pixels; openings = very dark pixels inside it)"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
cut, pre = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); T = float(os.environ.get("DARK", 48))
a = np.asarray(Image.open(cut).convert("RGBA")).astype(np.float32); H, W = a.shape[:2]
box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
dark = box & (a[..., :3].max(-1) < T) & (a[..., 3] > 200)
dark = ndimage.binary_opening(dark, iterations=2)
lab, n = ndimage.label(dark); sizes = ndimage.sum(dark, lab, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sizes) if s > 600]
m = ndimage.binary_fill_holes(np.isin(lab, keep))
if os.environ.get("COLS"):  # square bays with a lighter painted interior: inside the dark bays' band, cut whole columns that are mostly interior; pillar columns (little dark) stay solid
    ys, xs = np.where(m); y0b, y1b = ys.min(), ys.max() + 1; frac = m[y0b:y1b].mean(0); cols = frac > float(os.environ["COLS"])
    cols = ndimage.binary_opening(cols, iterations=2)
    m = np.zeros_like(m); m[y0b:y1b, :] = cols[None, :]; m &= (a[..., 3] > 200)
f = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
front = a.copy(); front[..., 3] = a[..., 3] * (1 - f)
Image.fromarray(a.astype(np.uint8)).save(pre + "_back.png"); Image.fromarray(front.astype(np.uint8)).save(pre + "_front.png")
ov = a.copy(); ov[m] = [0, 255, 0, 255]; Image.fromarray(ov.astype(np.uint8)).resize((W // 2, H // 2)).save(pre + "_maskcheck.png")
ys, xs = np.where(m); print("openings", n and len(keep), "px", m.sum(), "x", xs.min(), xs.max(), "y", ys.min(), ys.max(), "of", W, H)
