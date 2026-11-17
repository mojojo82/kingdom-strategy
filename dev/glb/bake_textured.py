# Textured march model (proof of concept, Harley 17 Nov 2026): the Meshy .glb -> a low-poly mesh (vertex clustering, rocks removed) with its own
# texture layout, and the original painted texture BAKED onto it (each texel looks up the nearest point on the full 1.3M-triangle model and copies
# its colour). Output: an npz (positions / uvs per face corner) + a texture image.
# Run: python3 dev/glb/bake_textured.py CELL ATLAS OUT_PREFIX     e.g. 0.04 1024 /tmp/pirate_tex
import sys; sys.path.insert(0, '/home/claude/kingdom-strategy/dev/glb')
from load import load
import numpy as np
from scipy.spatial import cKDTree
from PIL import Image
cell = float(sys.argv[1]); A = int(sys.argv[2]); out = sys.argv[3]; BUDGET = 0.55
J, P, N, UV, I, mat, imgs = load('/home/claude/kingdom-strategy/art/originals/haunted_pirate_ship.glb')
tl = np.load(sys.argv[4]) if len(sys.argv) > 4 else None
if tl is not None: I = I[~np.isin(tl, [3, 7, 4, 6, 5, 1])]   # the 6 rocks round the base
tex = np.asarray(imgs[0]).astype(np.float32); th, tw = tex.shape[:2]
# --- low-poly mesh (same clustering as v1051) ---
lo = P[I].reshape(-1, 3).min(0); g = np.floor((P - lo) / cell).astype(np.int64); key = g[:, 0] * 1000003 + g[:, 1] * 1009 + g[:, 2]
uk, cid = np.unique(key, return_inverse=True); cid = cid.ravel(); nc = len(uk)
used = np.unique(I); cnt = np.bincount(cid[used], minlength=nc).astype(float); pos = np.zeros((nc, 3)); np.add.at(pos, cid[used], P[used]); pos /= np.maximum(cnt, 1)[:, None]
T = cid[I]; ok = (T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 0] != T[:, 2]); T = T[ok]
s = np.sort(T, axis=1); fk = s[:, 0] * (nc * nc) + s[:, 1] * nc + s[:, 2]; _, first = np.unique(fk, return_index=True); F = T[first]
V = pos[F]                                     # (nf, 3, 3)
nf = len(F); fn = np.cross(V[:, 1] - V[:, 0], V[:, 2] - V[:, 0]); fa = np.linalg.norm(fn, axis=1) * 0.5; fn /= np.maximum(fa * 2, 1e-12)[:, None]
print('faces', nf)
# --- atlas: two triangles per square cell, cell size by triangle size; faces in spatial (Morton) order so neighbouring cells are neighbouring surface ---
cen = V.mean(1); q = ((cen - cen.min(0)) / (np.ptp(cen, 0) + 1e-9) * 1023).astype(np.int64)
def spread(x):
    x &= 0x3ff; x = (x | (x << 16)) & 0x30000ff; x = (x | (x << 8)) & 0x300f00f; x = (x | (x << 4)) & 0x30c30c3; x = (x | (x << 2)) & 0x9249249; return x
order = np.argsort(spread(q[:, 0]) | (spread(q[:, 1]) << 1) | (spread(q[:, 2]) << 2))
# texel size from sqrt(area), budget = 85% of the atlas
side = np.sqrt(fa); oo = list(order)
def pack(budget):
    scale = np.sqrt(budget * A * A / (np.sum(side ** 2) / 2 + 1e-12)); cs = (np.clip(np.round(side * scale), 4, 96).astype(int) // 2) * 2
    x = y = rowh = 0; pr = []; k = 0
    while k < len(oo):
        a = oo[k]; b = oo[k + 1] if k + 1 < len(oo) else None; c = max(cs[a], cs[b] if b is not None else 0)
        if x + c > A: x = 0; y += rowh; rowh = 0
        if y + c > A: return None, 0
        pr.append((a, b, x, y, c)); x += c; rowh = max(rowh, c); k += 2
    return pr, y + rowh
for BUDGET in [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]:
    pairs, used_h = pack(BUDGET)
    if pairs: break
print('budget', BUDGET, 'atlas rows used', used_h, 'of', A)
uvs = np.zeros((nf, 3, 2))
img = np.zeros((A, A, 3), np.float32); filled = np.zeros((A, A), bool)
# high-poly lookup: KD-tree over the full model's triangle centres
HT = P[I]; hc = HT.mean(1); hn = np.cross(HT[:, 1] - HT[:, 0], HT[:, 2] - HT[:, 0]); hn /= np.maximum(np.linalg.norm(hn, axis=1), 1e-12)[:, None]
tree = cKDTree(hc); HUV = UV[I].astype(np.float64)
def bilinear(u, v):
    fx = (u % 1) * tw - 0.5; fy = (v % 1) * th - 0.5; x0 = np.floor(fx).astype(int); y0 = np.floor(fy).astype(int); ax = (fx - x0)[:, None]; ay = (fy - y0)[:, None]
    x0 %= tw; y0 %= th; x1 = (x0 + 1) % tw; y1 = (y0 + 1) % th
    return (tex[y0, x0] * (1 - ax) + tex[y0, x1] * ax) * (1 - ay) + (tex[y1, x0] * (1 - ax) + tex[y1, x1] * ax) * ay
TX = []; TY = []; TF = []; TB = []
for (a, b, x0, y0, c) in pairs:
    p = 1.0   # corners inset 1 texel; texels outside the triangle still bake (clamped) = gutter
    # triangle a: (0,0) (1,0) (0,1) of the cell; triangle b: (1,1) (0,1) (1,0)
    ca = np.array([[x0 + p, y0 + p], [x0 + c - p - 1, y0 + p], [x0 + p, y0 + c - p - 1]]); uvs[a] = ca
    if b is not None: cb = np.array([[x0 + c - p, y0 + c - p], [x0 + p + 1, y0 + c - p], [x0 + c - p, y0 + p + 1]]); uvs[b] = cb
    yy, xx = np.mgrid[y0:y0 + c, x0:x0 + c]; px = xx.ravel() + 0.5; py = yy.ravel() + 0.5
    inb = ((px - x0) + (py - y0)) > c if b is not None else np.zeros(len(px), bool)
    for f, cc, m in ((a, ca, ~inb), (b, cb if b is not None else None, inb)):
        if f is None or not m.any(): continue
        # barycentric of each texel in the 2D triangle, clamped onto it
        v0 = cc[1] - cc[0]; v1 = cc[2] - cc[0]; d = np.stack([px[m] - cc[0][0], py[m] - cc[0][1]], 1); den = v0[0] * v1[1] - v1[0] * v0[1]
        l1 = (d[:, 0] * v1[1] - v1[0] * d[:, 1]) / den; l2 = (v0[0] * d[:, 1] - d[:, 0] * v0[1]) / den
        l1 = np.clip(l1, 0, 1); l2 = np.clip(l2, 0, 1); sm = l1 + l2; over = sm > 1; l1[over] /= sm[over]; l2[over] /= sm[over]; l0 = 1 - l1 - l2
        P3 = V[f, 0] * l0[:, None] + V[f, 1] * l1[:, None] + V[f, 2] * l2[:, None]
        TX.append(xx.ravel()[m]); TY.append(yy.ravel()[m]); TF.append(np.full(m.sum(), f)); TB.append(P3)
TX = np.concatenate(TX); TY = np.concatenate(TY); TF = np.concatenate(TF); TB = np.concatenate(TB)
print('texels', len(TX))
K = 8; dist, nb = tree.query(TB, k=K)
al = np.abs(np.einsum('nkj,nj->nk', hn[nb], fn[TF]))                       # facing the same way (either side - sails are two-sided)
score = dist / (np.median(dist) + 1e-9) + (al < 0.35) * 1000.0
pick = nb[np.arange(len(nb)), np.argmin(score, 1)]
# project onto the picked full-detail triangle, barycentric -> its UV -> its texture colour
t = HT[pick]; e0 = t[:, 1] - t[:, 0]; e1 = t[:, 2] - t[:, 0]; d2 = TB - t[:, 0]
d00 = (e0 * e0).sum(1); d01 = (e0 * e1).sum(1); d11 = (e1 * e1).sum(1); d20 = (d2 * e0).sum(1); d21 = (d2 * e1).sum(1); den = d00 * d11 - d01 * d01 + 1e-18
bv = (d11 * d20 - d01 * d21) / den; bw = (d00 * d21 - d01 * d20) / den; bv = np.clip(bv, 0, 1); bw = np.clip(bw, 0, 1); ss = bv + bw; o = ss > 1; bv[o] /= ss[o]; bw[o] /= ss[o]; bu = 1 - bv - bw
uvh = HUV[pick, 0] * bu[:, None] + HUV[pick, 1] * bv[:, None] + HUV[pick, 2] * bw[:, None]
img[TY, TX] = bilinear(uvh[:, 0], uvh[:, 1]); filled[TY, TX] = True
# fill the unused atlas space with the average colour (keeps mipmaps from going black)
img[~filled] = img[filled].mean(0)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out + '_tex.png')
uvn = (uvs + 0.0) / A                                                       # 0..1 (texel units -> uv)
np.savez(out + '.npz', pos=V.reshape(-1, 3), uv=uvn.reshape(-1, 2), n=nf)
print('done', out)
