"""Green-screen cut-out for ship pictures (violet ships key badly on magenta). python3 dev/ships/key_green.py IN.png OUT.png  -> trimmed RGBA"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32)
M = np.median(np.concatenate([a[:20].reshape(-1, 3), a[-20:].reshape(-1, 3)]), 0)
d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); dm = M[1] - max(M[0], M[2])
al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1)
c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
sp = c[..., 1] > np.maximum(c[..., 0], c[..., 2]); c[..., 1] = np.where(sp, np.maximum(c[..., 0], c[..., 2]), c[..., 1])  # despill: no pixel greener than its red/blue
al[al < 0.03] = 0
im = Image.fromarray(np.dstack([c, al * 255]).astype(np.uint8), "RGBA"); bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
im.crop(bb).save(sys.argv[2]); print(sys.argv[2], im.crop(bb).size, "offset", bb[:2])
