"""Measure Lily's sword swings in a flurry clip (green screen frames) -> swing list for lily_slash_fx.js.
python3 dev/heroes/lily/measure_swings.py FRAMES_DIR [first last]
Per frame: the newest red/orange pixels (blade + its trail) at the outer quarter of their radius = where the blade tip is; angle around
her chest. Consecutive frames turning the same way = one swing. Prints [startFrame, endFrame, startAngle, endAngle, radius] rows."""
import sys, glob, numpy as np
from PIL import Image
fr = sorted(glob.glob(sys.argv[1] + '/*.png')); F0 = int(sys.argv[2]) if len(sys.argv) > 2 else 1; F1 = int(sys.argv[3]) if len(sys.argv) > 3 else 80
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(int)
a0 = load(fr[0]); fg = ~((a0[..., 1] > a0[..., 0] + 50) & (a0[..., 1] > a0[..., 2] + 50)); ys, xs = np.nonzero(fg)
cx, cy = (xs.min() + xs.max()) / 2 + 40, (ys.min() + ys.max()) / 2 - 25
print('chest', round(cx), round(cy))
prev, seq, tips = None, [], {}
for i, p in enumerate(fr[:F1 + 1]):
    a = load(p); r, g, b = a[..., 0], a[..., 1], a[..., 2]; fx = (r > 150) & (r > g + 30) & (b < 150)
    if prev is not None and i >= F0:
        yy, xx = np.nonzero(fx & ~prev)
        if len(yy) > 1500:
            rad = np.hypot(yy - cy, xx - cx); k = rad > np.percentile(rad, 75); ang = np.arctan2(yy[k] - cy, xx[k] - cx)
            m = np.degrees(np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())); conc = np.cos(ang - np.radians(m)).mean()
            if conc > 0.75: seq.append((i, float(m), float(np.percentile(rad[k], 60))))
            k2 = rad > np.percentile(rad, 85); tips[i] = (float(xx[k2].mean()), float(yy[k2].mean()))   # blade tip = leading edge, far end
    prev = fx
# group into swings: unwrap, same turning direction, steps 6..140 deg, no frame gaps > 2
sw, cur = [], []
def close():
    if len(cur) >= 2:
        f0, a0_, r0 = cur[0]; f1, a1_, _ = cur[-1]
        if abs(a1_ - a0_) >= 35: sw.append([f0, f1, round(a0_), round(a1_), int(round(np.median([c[2] for c in cur]) * 1.05 / 10) * 10)])
for (f, ang, rr) in seq:
    if cur:
        pf, pa, _ = cur[-1]; d = (ang - pa + 180) % 360 - 180; a_un = pa + d
        dirn = np.sign(cur[-1][1] - cur[0][1]) if len(cur) > 1 else np.sign(d)
        if f - pf <= 2 and 6 <= abs(d) <= 140 and (len(cur) == 1 or np.sign(d) == dirn) and abs(a_un - cur[0][1]) <= 220: cur.append((f, a_un, rr)); continue
        if f - pf <= 2 and 6 <= abs(d) <= 140 and np.sign(d) == dirn:          # same spin carries on past 220 deg: next slash starts here
            close(); cur = [(pf, pa, cur[-1][2]), (f, a_un, rr)]; continue
        close(); cur = [(f, ang, rr)]
    else: cur = [(f, ang, rr)]
close()
print('swings', len(sw)); print(sw)
# TRACKED: refit every swing on her real blade path - circle through the tip positions of its frames (own centre + radius)
def fit(pts):
    P = np.array(pts); M = np.c_[P[:, 0], P[:, 1], np.ones(len(P))]; bb = (P ** 2).sum(1)
    sol = np.linalg.lstsq(M, bb, rcond=None)[0]; x0, y0 = sol[0] / 2, sol[1] / 2; return x0, y0, float(np.sqrt(max(1, sol[2] + x0 ** 2 + y0 ** 2)))
out = []
for f0, f1, a0_, a1_, r_ in sw:
    pts = [tips[f] for f in range(f0, f1 + 1) if f in tips]
    row = [f0, f1, a0_, a1_, r_, 0, 0]
    if len(pts) >= 3:
        x0, y0, R = fit(pts)
        if 140 <= R <= 650 and np.hypot(x0 - cx, y0 - cy) <= 260:
            dirn = 1 if a1_ > a0_ else -1
            angs = [np.degrees(np.arctan2(py - y0, px - x0)) for px, py in pts]
            un = [angs[0]]
            for v in angs[1:]: un.append(un[-1] + ((v - un[-1] + 180) % 360 - 180))
            if (un[-1] - un[0]) * dirn > 25:      # the fit turns the same way and far enough
                row = [f0, f1, round(un[0]), round(un[-1]), int(round(R * 1.05 / 10) * 10), round(x0 - cx), round(y0 - cy)]
    out.append(row)
print('tracked', len(out)); print(out)
