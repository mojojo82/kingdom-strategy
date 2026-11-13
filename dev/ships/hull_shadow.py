"""Harley's hand-cut hull (magenta background + WHITE = cut-away area over the legs) -> keyed hull with a static drop shadow baked in
under the cut edges only (the shadow falls on the legs drawn underneath). python3 dev/ships/hull_shadow.py IN.png OUT.png"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.float32); H, W = a.shape[:2]
white = a.min(-1) > 238; lab, n = ndimage.label(white); sz = ndimage.sum(white, lab, range(1, n + 1)); white = lab == (np.argmax(sz) + 1)
white = ndimage.binary_dilation(white, iterations=1)
d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]; al = np.clip(1 - (d - 25) / (200 * 0.85 - 25), 0, 1)
al[white] = 0
c = np.clip((a - (1 - al[..., None]) * np.array([255, 0, 255])) / np.maximum(al[..., None], 1e-3), 0, 255); c[white] = 0
hull = al > 0.5
# shadow: hull shape pushed down a bit and blurred, kept only inside the white (cut) area, fading with distance below the edge
sh = np.roll(hull, 10, axis=0).astype(np.float32); sh[:10] = 0
sh = np.asarray(Image.fromarray((sh * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(np.float32) / 255
reg = np.asarray(Image.fromarray((white * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
sa = np.clip(sh * 0.75, 0, 0.7) * reg * (1 - al)
oa = al + sa * (1 - al); oc = (c * al[..., None]) / np.maximum(oa[..., None], 1e-3)   # shadow colour = black
out = np.dstack([oc, oa * 255]).astype(np.uint8)
Image.fromarray(out, "RGBA").save(sys.argv[2]); print("ok", out.shape, "shadow px", int((sa > 0.05).sum()))
