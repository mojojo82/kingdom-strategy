"""Iron Lily run (v1425): her real ground travel per frame in the run clip, measured from her planted feet. The camera tracks her, so the video
can't show the travel directly - but a planted foot is still on the ground, so in the video it slides back at exactly the camera's speed.
travel = body move in the video - planted-foot move in the video. Writes M['tv'] = {frame: sheet px} for the run segments, plus M['run'] =
{'in': [a, b], 'loop': [a, b], 'out': [a, b]} (global frame indices). Run: python3 runspeed.py art/heroes/ironlily/lily_v3.json"""
import json, sys, numpy as np
from PIL import Image
P = sys.argv[1]; D = P.rsplit('/', 1)[0] + '/'
M = json.load(open(P)); sh = [np.array(Image.open(D + f))[..., 3] for f in M['sheets']]
seg = {s[0]: s for s in M['segs']}
def contact(i):  # x (video coords, sheet px) of her pixels touching the floor
    f = M['f'][i]; a = sh[f[0]][f[2]:f[2] + f[4], f[1]:f[1] + f[3]] > 100
    rows = np.arange(a.shape[0]) + f[6]                     # floor-relative y of each row (0 = floor)
    band = (rows >= -6)
    if not band.any(): return None
    xs = np.nonzero(a[band].any(0))[0]
    return (xs + f[5]) if len(xs) >= 3 else None
def shift(c0, c1):
    if c0 is None or c1 is None: return None
    best, bs = None, -1
    for s in np.arange(-60, 8, 0.5):
        h = np.isin(np.round(c1 - s).astype(int), np.round(c0).astype(int)).sum()
        if h > bs: bs, best = h, s
    return best if bs >= max(3, 0.4 * min(len(c0), len(c1))) else None
tv = {}
for name in ('Rin', 'Rrun', 'Rout'):
    s = seg[name]; vals = []
    for i in range(s[1], s[2]):
        fv = shift(contact(i), contact(i + 1)); bv = M['f'][i + 1][7] - M['f'][i][7]
        vals.append(None if fv is None else bv - fv)
    # flight frames (no planted foot): carry the neighbours' speed
    arr = np.array([np.nan if v is None else v for v in vals], float); idx = np.arange(len(arr)); ok = ~np.isnan(arr)
    if ok.sum() >= 2: arr = np.interp(idx, idx[ok], arr[ok])
    for k, i in enumerate(range(s[1] + 1, s[2] + 1)): tv[str(i)] = round(float(arr[k]), 2)
    print(name, 'travel px/frame:', np.round(arr, 1).tolist())
loop = seg['Rrun']; tv[str(loop[1])] = tv.get(str(loop[1] + 1), 0)   # wrapping 78 -> 66
M['tv'] = tv; M['run'] = {'in': [seg['Rin'][1], seg['Rin'][2]], 'loop': [seg['Rrun'][1], seg['Rrun'][2]], 'out': [seg['Rout'][1], seg['Rout'][2]]}
sp = np.mean([tv[str(i)] for i in range(loop[1] + 1, loop[2] + 1)])
print('run speed %.1f sheet px/frame = %.0f px/s = %.1f x her height per second' % (sp, sp * M['fps'], sp * M['fps'] / M['stand']))
json.dump(M, open(P, 'w'), separators=(',', ':'))
