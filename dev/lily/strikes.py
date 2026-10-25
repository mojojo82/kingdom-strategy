"""Iron Lily contact strikes (v1424) - replaces the 'full stretch' hit frames. A frame STRIKES where some part of her (blade, foot, leg - anything)
is sweeping fast: pixels covered now that were not within R px of her last frame (moving > R sheet px per frame = ~0.85 x her height per second),
below enemy height. Per frame: the strike's horizontal span in front of / behind her feet (sheet px, facing right) -> M['sw'] = {frame: [x0, x1]}.
Consecutive strike frames = one sweep; in game an enemy inside the span takes one hit per sweep. Cartwheels / flips that roll into an enemy hit it.
Run: python3 strikes.py art/heroes/ironlily/lily_v2.json"""
import json, sys, numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation
P = sys.argv[1]; D = P.rsplit('/', 1)[0] + '/'
M = json.load(open(P)); sh = [np.array(Image.open(D + f))[..., 3] for f in M['sheets']]
N = len(M['f']); ST = M['stand']; R = 9; MINPX = 40; CORE = 0.22  # moving > 9 sheet px a frame (~1.3 x her height per second), outside her torso column
GW, GH = 900, 420; OX, OY = 450, 380                 # canvas in feet-relative coords: feet at (OX, OY = floor)
segOf = [0] * N
for si, s in enumerate(M['segs']):
    for i in range(s[1], s[2] + 1): segOf[i] = si
def mask(i):
    f = M['f'][i]; a = sh[f[0]][f[2]:f[2] + f[4], f[1]:f[1] + f[3]] > 100
    c = np.zeros((GH, GW), bool); x0 = int(round(f[5] - f[7] + OX)); y0 = int(round(f[6] + OY))
    ys, xs = np.nonzero(a); xs = xs + x0; ys = ys + y0; ok = (xs >= 0) & (xs < GW) & (ys >= 0) & (ys < GH); c[ys[ok], xs[ok]] = True; return c
st = np.ones((2 * R + 1, 2 * R + 1), bool)
sw = {}; prev = None
LOW = int(OY - 1.0 * ST)                                # ignore anything higher than her own height above the floor (over the enemy's head)
for i in range(N):
    cur = mask(i)
    if i > M['segs'][segOf[i]][1]:
        new = cur & ~binary_dilation(prev, st); new[:LOW] = False; c0 = int(OX - CORE * ST); c1 = int(OX + CORE * ST); new[:, c0:c1] = False
        if new.sum() >= MINPX:
            xs = np.nonzero(new.any(0))[0]; sw[str(i)] = [int(xs.min() - OX), int(xs.max() - OX)]
    prev = cur
M['sw'] = sw
json.dump(M, open(P, 'w'), separators=(',', ':'))
n = 0; lastI = -9
for k in sorted(sw, key=int):
    if int(k) != lastI + 1: n += 1
    lastI = int(k)
dur = sum((s[2] - s[1] + 1) for s in M['segs']) / M['fps']
print('strike frames %d, sweeps %d (%.2f per second of footage), span median %s' % (len(sw), n, n / dur, np.median([v[1] - v[0] for v in sw.values()])))
