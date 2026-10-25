"""Stricter joins for Iron Lily (v1415). Scores every pair of frames on the in-game sheets by how well the two poses OVERLAP when drawn
(feet aligned like the game does), body and sword separately, now and 2 frames later. A join is allowed only when it overlaps at least as
well as a normal next-frame step does (median of real consecutive frames) - so a join never looks worse than the video itself.
Run: python3 rejoin.py art/heroes/ironlily/lily_v1.json   (rewrites jumps + forced in place; prints the options map)"""
import json, sys, numpy as np
from PIL import Image
P = sys.argv[1]; D = P.rsplit('/', 1)[0] + '/'
M = json.load(open(P)); sh = [np.array(Image.open(D + f)) for f in M['sheets']]
N = len(M['f']); GW, GH, SC = 420, 300, 4          # window around her feet (sheet px), scored at 1/4 size
segOf = [0] * N
for si, s in enumerate(M['segs']):
    for i in range(s[1], s[2] + 1): segOf[i] = si
noj = set(M['noj']); safeLast = []
for s in M['segs']:
    e = s[2]
    while e > s[1] and e in noj: e -= 1
    safeLast.append(e)
B = np.zeros((N, (GH // SC) * (GW // SC)), np.float32); R = np.zeros_like(B)
FACE = np.zeros(N)  # v1418: how much FACE (skin on her head) shows - high = facing the camera, ~0 = side-on or back to camera
def face_of(f):
    a = sh[f[0]][f[2]:f[2] + f[4], f[1]:f[1] + f[3]].astype(int); al = a[..., 3] > 120; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    body = al & ~((r > 120) & (r > g + 50) & (r > b + 40)); ys, xs = np.nonzero(body)
    if len(ys) < 50: return 0.0
    top = ys.min(); head = body.copy(); head[top + int((ys.max() - top) * 0.3):] = False
    return float((head & (r > 150) & (g > 100) & (b > 70) & (r > b + 25) & (r - g < 90)).sum() / max(1, head.sum()))
for i, f in enumerate(M['f']): FACE[i] = face_of(f)
FACE_GAP = 0.045  # a join may not flip her from facing the camera to side/back-on (the crossfade showed two people)
for i, f in enumerate(M['f']):
    a = sh[f[0]][f[2]:f[2] + f[4], f[1]:f[1] + f[3]]
    al = a[..., 3] > 100; r, g, b = [a[..., c].astype(int) for c in range(3)]
    red = al & (r > 120) & (r > g + 50) & (r > b + 40); body = al & ~red
    x0 = int(round(f[5] - f[7] + GW / 2)); y0 = int(round(f[6] + GH - 20))
    for m, out in ((body, B), (red, R)):
        c = np.zeros((GH, GW), np.float32); ys, xs = np.nonzero(m); xs = xs + x0; ys = ys + y0
        ok = (xs >= 0) & (xs < GW) & (ys >= 0) & (ys < GH); c[ys[ok], xs[ok]] = 1
        out[i] = c.reshape(GH // SC, SC, GW // SC, SC).mean((1, 3)).ravel() > 0.3
def iou(X):
    inter = X @ X.T; s = X.sum(1); return inter / np.maximum(1, s[:, None] + s[None, :] - inter)
IB, IR = iou(B), iou(R)
nxt2 = [min(i + 2, safeLast[segOf[i]]) if i <= safeLast[segOf[i]] else i for i in range(N)]
def raw(i, j): return min(0.65 * IB[i, j] + 0.35 * IR[i, j], 0.65 * IB[nxt2[i], nxt2[j]] + 0.35 * IR[nxt2[i], nxt2[j]])
def score(i, j):  # pose now (body counts most, sword too) and where both are heading 2 frames on
    if abs(FACE[i] - FACE[j]) > FACE_GAP or abs(FACE[nxt2[i]] - FACE[nxt2[j]]) > FACE_GAP: return 0.0
    return min(0.65 * IB[i, j] + 0.35 * IR[i, j], 0.65 * IB[nxt2[i], nxt2[j]] + 0.35 * IR[nxt2[i], nxt2[j]])
cons = [min(0.65 * IB[i, i + 1] + 0.35 * IR[i, i + 1], 0.65 * IB[nxt2[i], nxt2[i + 1]] + 0.35 * IR[nxt2[i], nxt2[i + 1]]) for i in range(N - 1) if segOf[i] == segOf[i + 1] and i not in noj]
import os; PCT = float(os.environ.get('PCT', 25)); THR = float(np.percentile(cons, PCT)); print('next-frame overlap: %dth pct %.2f (join must be >= this)' % (PCT, THR))
INTRO = 36; tail = M['tailIn']
NOTARGET = ('Rin', 'Rrun', 'Rout', 'Idle')  # v1430: run / idle are entered only on purpose (by the fight's mode), never joined into at random
def fno_ok(j): s = M['segs'][segOf[j]]; return s[0] not in NOTARGET and (j - s[1]) <= (s[2] - s[1] + 1) - tail[segOf[j]] and j not in noj and not (M['segs'][segOf[j]][0] in ('A', 'B', 'C') and j - s[1] < INTRO)
jumps = {}; forced = {}
for i in range(N):
    if i in noj or i > safeLast[segOf[i]]: continue
    s = M['segs'][segOf[i]]
    if s[0] in ('A', 'B', 'C') and i - s[1] < INTRO: continue
    c = []
    for j in range(N):
        if segOf[j] == segOf[i] and abs(j - i) < 20: continue
        if not fno_ok(j): continue
        sc = score(i, j)
        if sc >= THR: c.append((sc, j))
    c.sort(reverse=True)
    if c: jumps[str(i)] = [j for _, j in c[:12]]
    seg = M['segs'][segOf[i]]; nearEnd = (i - seg[1]) > (seg[2] - seg[1] + 1) - (tail[segOf[i]] - 10)
    if i == safeLast[segOf[i]] or nearEnd:
        best = max((j for j in range(N) if fno_ok(j) and (segOf[j] != segOf[i] or abs(j - i) > 30)), key=lambda j: raw(i, j) - (0.08 if segOf[j] == segOf[i] else 0) - 4 * max(0, abs(FACE[i] - FACE[j]) - FACE_GAP))  # facing matters most  # prefer leaving for another clip
        forced[str(i)] = int(best)
M['jumps'] = jumps; M['forced'] = forced; M['face'] = [round(float(x), 3) for x in FACE]  # the game's fallback exit uses it too
fs = [score(int(i), j) for i, j in forced.items()]; print('forced exits: %d, overlap min %.2f median %.2f' % (len(fs), min(fs), float(np.median(fs))))
# options map: exits grouped into moments, destinations into places
def groups(ids):
    out = []
    for x in sorted(ids):
        if out and x - out[-1][-1] <= 3 and segOf[x] == segOf[out[-1][-1]]: out[-1].append(x)
        else: out.append([x])
    return out
one = 0; ex = 0
for si, s in enumerate(M['segs']):
    for g in groups(int(i) for i in jumps if segOf[int(i)] == si):
        pl = groups(set(j for i in g for j in jumps[str(i)])); ex += 1; one += len(pl) == 1
print('exits %d, with only one option %d, frames with a join %d' % (ex, one, len(jumps)))
json.dump(M, open(P, 'w'), separators=(',', ':'))
if os.environ.get('OLD'):  # compare: how the previous joins score on this measure
    O = json.load(open(os.environ['OLD'])); v = [score(int(i), j) for i, js in O['jumps'].items() for j in js]
    print('old joins: %d, below the bar %d (%.0f%%), median %.2f' % (len(v), sum(x < THR for x in v), 100 * sum(x < THR for x in v) / len(v), float(np.median(v))))
bad = [(i, j, round(abs(FACE[int(i)] - FACE[j]), 3)) for i, j in forced.items() if abs(FACE[int(i)] - FACE[j]) > FACE_GAP]
print('forced exits that flip facing: %d %s' % (len(bad), bad[:8]))
