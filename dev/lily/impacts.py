"""Iron Lily hit frames (v1420). A frame is a HIT when the front-most point of her (blade tip or foot, facing right) reaches a local peak:
the furthest it gets over +-3 frames, at least 0.4 x her height in front of her feet, after moving out >= 10 px over the last 4 frames.
Writes M['imp'] = {frame: reach in sheet px} into the manifest. Run: python3 impacts.py art/heroes/ironlily/lily_v2.json"""
import json, sys, numpy as np
from PIL import Image
P = sys.argv[1]; D = P.rsplit('/', 1)[0] + '/'
M = json.load(open(P)); sh = [np.array(Image.open(D + f))[..., 3] for f in M['sheets']]
N = len(M['f']); STAND = M['stand']
segOf = [0] * N
for si, s in enumerate(M['segs']):
    for i in range(s[1], s[2] + 1): segOf[i] = si
front = np.zeros(N)
for i, f in enumerate(M['f']):
    a = sh[f[0]][f[2]:f[2] + f[4], f[1]:f[1] + f[3]] > 100
    cols = np.nonzero(a.any(0))[0]
    front[i] = (cols.max() + f[5] - f[7]) if len(cols) else 0   # px in front of her feet
imp = {}
for i in range(N):
    s = M['segs'][segOf[i]]
    lo, hi = max(s[1], i - 3), min(s[2], i + 3)
    if front[i] < 0.4 * STAND or front[i] < front[lo:hi + 1].max(): continue
    if i - 4 < s[1] or front[i] - front[i - 4] < 10: continue
    if imp and int(max(imp)) >= i - 3: continue                   # one hit per peak
    imp[str(i)] = round(float(front[i]), 1)
M['imp'] = imp
json.dump(M, open(P, 'w'), separators=(',', ':'))
per = {s[0]: sum(1 for k in imp if s[1] <= int(k) <= s[2]) / ((s[2] - s[1] + 1) / M['fps']) for s in M['segs']}
print('hit frames', len(imp), 'per second by clip', {k: round(v, 2) for k, v in per.items()}, 'reach px median', np.median(list(imp.values())))
