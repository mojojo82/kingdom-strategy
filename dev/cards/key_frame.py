"""Key a card frame / icon sheet off flat green (#00FF00) or magenta (#FF00FF) WITHOUT trimming (frames keep one shared canvas so the
art window, socket and text boxes line up across rarities). python3 dev/cards/key_frame.py IN.png OUT.png [green|magenta]"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
mode = sys.argv[3] if len(sys.argv) > 3 else "green"
M = np.median(np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3)]), 0)
if mode == "green":
    d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); dm = M[1] - max(M[0], M[2])
else:
    d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]; dm = min(M[0], M[2]) - M[1]
al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1)
c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
if mode == "green":
    sp = c[..., 1] > np.maximum(c[..., 0], c[..., 2]); c[..., 1] = np.where(sp, np.maximum(c[..., 0], c[..., 2]), c[..., 1])
else:
    lo = np.minimum(c[..., 0], c[..., 2]); sp = lo > c[..., 1] + 40  # despill: pull back strong pink fringes only (keeps the purple banners)
    c[..., 0] = np.where(sp & (al < 0.98), np.minimum(c[..., 0], c[..., 1] + 40), c[..., 0]); c[..., 2] = np.where(sp & (al < 0.98), np.minimum(c[..., 2], c[..., 1] + 40), c[..., 2])
al[al < 0.03] = 0
Image.fromarray(np.dstack([c, al * 255]).astype(np.uint8), "RGBA").save(sys.argv[2]); print(sys.argv[2])
