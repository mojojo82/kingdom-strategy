"""Glass-window layers for an enclosed ship: back = window filled with a dark interior, front = window glass made see-through (alpha GLASS).
python3 dev/ships/glass_layers.py CUT.png OUTPREFIX x0 y0 x1 y1 [GLASS=0.45]   (window box in CUT pixels; glass = violet pixels inside it)"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
cut, pre = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); G = float(sys.argv[7]) if len(sys.argv) > 7 else 0.45
a = np.asarray(Image.open(cut).convert("RGBA")).astype(np.float32); H, W = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
import os; TB = float(os.environ.get("GLASS_TB", 45)); TR = float(os.environ.get("GLASS_TR", 10))
glass = box & (b > g + TB) & (r > g + TR) & (a[..., 3] > 200) & (np.maximum(r, b) - np.minimum(r, g) < 255)
glass = ndimage.binary_opening(glass, iterations=1); glass = ndimage.binary_closing(glass, iterations=2)
lab, n = ndimage.label(glass); sizes = ndimage.sum(glass, lab, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sizes) if s > 400]
glass = np.isin(lab, keep)
f = np.asarray(Image.fromarray((glass * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
back = a.copy(); dark = np.array([28, 18, 46], np.float32)   # deep violet interior behind the heroes
back[..., :3] = back[..., :3] * (1 - f[..., None]) + (dark * 0.75 + back[..., :3] * 0.25) * f[..., None]
front = a.copy(); front[..., 3] = a[..., 3] * (1 - f * (1 - G))
Image.fromarray(back.astype(np.uint8)).save(pre + "_back.png"); Image.fromarray(front.astype(np.uint8)).save(pre + "_front.png")
ov = a.copy(); ov[glass] = [0, 255, 0, 255]; Image.fromarray(ov.astype(np.uint8)).resize((W // 2, H // 2)).save(pre + "_maskcheck.png")
ys, xs = np.where(glass); print("glass px", glass.sum(), "x", xs.min(), xs.max(), "y", ys.min(), ys.max(), "of", W, H)
