"""Measure a resource node picture's ground diamond (keyed RGBA): left / right corners (outermost opaque columns), bottom corner (lowest opaque row).
Prints RES_NODE_ART values fx, fy, fw, aspect and the diamond's height/width (sin of the elevation). Run: python3 dev/fx/measure_node.py IMG.png"""
import sys, math
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("RGBA"))[..., 3] > 60; H, W = a.shape
cols = np.nonzero(a.any(0))[0]; xl, xr = cols.min(), cols.max()
yl = np.nonzero(a[:, xl])[0].mean(); yr = np.nonzero(a[:, xr])[0].mean(); cy = (yl + yr) / 2
yb = np.nonzero(a.any(1))[0].max()
k = 2 * (yb - cy) / (xr - xl)
print(dict(fx=round((xl + xr) / 2 / W, 4), fy=round(cy / H, 4), fw=round((xr - xl) / W, 4), aspect=round(H / W, 4), diamond_h_over_w=round(k, 3), elev=round(math.degrees(math.asin(min(1, k))), 1)))
