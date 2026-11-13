"""Straighten the staff in mecha_staffarm_v1.png: the shaft below the fist leans ~3 deg more than above it (looked like two broken
pieces, Harley). Rotate + shift the lower part so it continues the upper part's axis. python3 dev/mecha/fix_staff_line.py"""
import math
import numpy as np
from PIL import Image
from scipy import ndimage
D = "art/originals/ships/mecha/"; src = Image.open(D + "mecha_staffarm_v1.png").convert("RGB"); a = np.asarray(src).astype(np.float32)
m = ndimage.binary_opening((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) < 60, iterations=2)
def centre(y):
    xs = np.where(m[y, 450:])[0] + 450; runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1); r = runs[-1]; return (r.min() + r.max()) / 2
up = [(y, centre(y)) for y in range(420, 790, 10)]; lo = [(y, centre(y)) for y in range(1010, 1450, 10)]
bu = np.polyfit([p[0] for p in up], [p[1] for p in up], 1); bl = np.polyfit([p[0] for p in lo], [p[1] for p in lo], 1)
CUT = 1000; ang = math.degrees(math.atan(bu[0]) - math.atan(bl[0]))   # lower leans this much more (x per y)
px = np.polyval(bl, CUT); target = np.polyval(bu, CUT)
low = np.zeros((a.shape[0], a.shape[1], 4), np.uint8); keep = np.zeros(a.shape[:2], bool); keep[CUT:, 440:] = True; keep &= m
low[..., :3] = a.astype(np.uint8); low[..., 3] = keep * 255
lowI = Image.fromarray(low).rotate(ang, center=(px, CUT), resample=Image.BICUBIC, translate=(target - px, 0))
clr = ndimage.binary_dilation(keep, iterations=6); clr[:CUT] = False; base = np.asarray(src.convert("RGBA")).copy(); base[clr] = [255, 0, 255, 255]   # remove the old lower part (fill magenta)
out = Image.fromarray(base); out.alpha_composite(lowI); out.convert("RGB").save(D + "mecha_staffarm_v1_fixed.png")
b2 = np.asarray(out.convert("RGB")).astype(np.float32); m2 = ndimage.binary_opening((np.minimum(b2[..., 0], b2[..., 2]) - b2[..., 1]) < 60, iterations=2); m = m2
lo2 = [(y, centre(y)) for y in range(1010, 1450, 40)]
print("lean diff %.2f deg, shift %.1f px" % (ang, target - px)); print("after:", [(y, round(x, 1), round(np.polyval(bu, y), 1)) for y, x in lo2])
