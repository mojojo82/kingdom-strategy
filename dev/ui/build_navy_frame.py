# Navy-gold Stats frame: parchment -> navy conversion of panel_frame_blank (20 Oct 2026)
from PIL import Image
import numpy as np
from scipy import ndimage
ORIG = np.array(Image.open('/home/claude/kingdom-strategy/art/originals/ui/panel_frame_blank_1024x1536.png').convert('RGB')).astype(float)
F = ORIG; H,W,_ = F.shape
NAVY = np.array([4,34,66], float)
pm = np.median(F[600:900, 350:700].reshape(-1,3), axis=0)
lum = F.mean(axis=2)
dist = np.abs(F - pm).sum(axis=2)
m = ndimage.uniform_filter(lum, 5); m2 = ndimage.uniform_filter(lum**2, 5)
var = m2 - m**2
box = np.zeros((H,W), bool); box[110:1420, 55:975] = True
cand = (dist < 90) & (var < 60) & box
lbl, _ = ndimage.label(cand)
flood = lbl == lbl[760, 512]
mx = F.max(axis=2); mn = F.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1)
shade = (dist < 230) & (sat < 0.42) & (var < 120) & box & (F[...,0] >= F[...,2])
grow = flood.copy()
for _ in range(60):
    g2 = ndimage.binary_dilation(grow, iterations=3) & (flood | shade)
    if (g2 == grow).all(): break
    grow = g2
mask = grow
mask = (ndimage.binary_closing(mask, np.ones((9,9))) & ((dist < 230) & (sat < 0.5) & box)) | mask
mask = ndimage.binary_opening(mask, np.ones((2,2)))
# bottom lip line (per-column first strong carved-art y, heavily smoothed)
_strict0 = (sat > 0.52) & (F[...,0] > F[...,2] + 30) & (lum > 95)
_runm0 = ndimage.uniform_filter(_strict0.astype(float), size=(11,1))
_stops = np.full(W, -1)
for _x in range(150, 880):
    for _y in range(1340, 1466):
        if _runm0[min(_y+5,H-1), _x] > 0.8: _stops[_x] = _y; break
_valid = _stops > 0
_stops[~_valid] = int(np.median(_stops[_valid]))
_sm = ndimage.gaussian_filter1d(ndimage.median_filter(_stops.astype(float), 61), 9)
line = np.minimum(_sm, np.where(_valid, _stops, _sm)).astype(int)
for x in range(150, 880):
    ys = np.where(mask[1200:1465, x])[0]
    if not len(ys): continue
    y0 = 1200 + ys.max() + 1
    if line[x] - 1 > y0 and line[x] - y0 < 110: mask[y0:line[x]-1, x] = True
mask = ndimage.binary_closing(mask, np.ones((3,3)))
a = ndimage.gaussian_filter(mask.astype(float), 1.2)[..., None]
grain = np.clip((lum - lum[flood].mean()) / 255.0, -0.35, 0.12)
navy = np.zeros_like(F) + NAVY + grain[...,None]*np.array([18,26,34])
yy2, xx2 = np.mgrid[0:H, 0:W]
r = np.sqrt(((yy2-760)/700.0)**2 + ((xx2-512)/470.0)**2)
vig = np.clip(1.0 - 0.13*np.clip(r-0.35,0,1)/0.65, 0.85, 1.0)
navy *= vig[...,None]
out = F*(1-a) + np.clip(navy,0,255)*a
shadow = np.zeros((H,W))
for x in range(150, 880):
    for i in range(7):
        y = line[x]-2-i
        if 0 < y < H: shadow[y, x] = (1 - i/7.0) * 0.45
shadow = ndimage.gaussian_filter(shadow, 1.5)
out *= (1 - shadow[...,None]*np.array([0.5,0.45,0.35]))
lum3 = out.mean(axis=2)
blue = (out[...,2] > out[...,0] + 20)
frac = ndimage.uniform_filter(blue.astype(float), 15)
sat3 = (out.max(axis=2)-out.min(axis=2))/np.maximum(out.max(axis=2),1)
rem = (lum3 > 95) & (sat3 < 0.38) & ~blue & (frac > 0.5) & box & (yy2 < 1380)
rem = ndimage.binary_dilation(rem, iterations=2)
a2 = ndimage.gaussian_filter(rem.astype(float), 1.0)[...,None]
out = out*(1-a2) + NAVY*a2

# component cleanup near bottom: kill small isolated specks, AA floating ornaments
zone = np.zeros((H,W), bool)
for x in list(range(100,440)) + list(range(584,924)):
    lx = line[x] if 150 <= x < 880 else 1408
    zone[1330:max(1331, lx-2), x] = True
devmap = np.abs(out - NAVY).sum(axis=2)
nonnavy = zone & (devmap > 55) & ~(out[...,2] > out[...,0] + 15)
lblc, nc = ndimage.label(nonnavy)
for i in range(1, nc+1):
    comp = lblc == i
    s = comp.sum()
    if s > 8000: continue
    ys, xs = np.where(comp)
    width = xs.max() - xs.min()
    near_lip = (ys.max() >= np.array([(line[x] if 150 <= x < 880 else 1408) - 8 for x in xs[ys == ys.max()]])).any()
    if ys.min() <= 1332: continue
    if s < 350 and width < 60 and not near_lip:
        k = ndimage.gaussian_filter(ndimage.binary_dilation(comp, iterations=2).astype(float), 1.0)[...,None]
        out = out*(1-k) + NAVY*k
    elif not near_lip:
        edge = ndimage.binary_dilation(comp, iterations=2) & ~ndimage.binary_erosion(comp, iterations=2)
        sm2 = ndimage.gaussian_filter(out, (1.2,1.2,0))
        ae = ndimage.gaussian_filter(edge.astype(float), 0.8)[...,None]
        out = out*(1-ae) + sm2*ae

# corner boxes: parchment-keyed on original art, mirrored right
Y0,Y1,X0,X1 = 1240,1462,50,240
Z = ORIG[Y0:Y1, X0:X1]; h,w,_ = Z.shape
zl = Z.mean(axis=2)
zmx = Z.max(axis=2); zmn = Z.min(axis=2)
zs = (zmx-zmn)/np.maximum(zmx,1)
zteal = Z[...,2] > Z[...,0] + 5
removec = ~((zs > 0.54) | (zl < 115) | zteal)
strictc = (zs > 0.52) & ~zteal & (zl > 95)
runm = ndimage.uniform_filter(strictc.astype(float), size=(9,1))
floorc = np.full(w, h-6)
for x in range(w):
    for y in range(100, h-8):
        if runm[y+4, x] > 0.8: floorc[x] = y; break
floor_f = np.minimum(ndimage.median_filter(floorc.astype(float), 25), floorc)
yyc = np.arange(h)[:, None]
removec &= (yyc < (floor_f[None,:] - 1))
lblk, _ = ndimage.label(removec)
removec = lblk == lblk[60, 130]
extra = (zl < 115) & (zs < 0.45) & (Z[...,0] >= Z[...,2]) & (yyc > floor_f[None,:]-28) & (yyc < floor_f[None,:]-1)
removec |= extra & ndimage.binary_dilation(removec, iterations=12)
ac = ndimage.gaussian_filter(removec.astype(float), 1.0)[...,None]
gy, gx = np.mgrid[Y0:Y1, X0:X1]
rc = np.sqrt(((gy-760)/700.0)**2 + ((gx-512)/470.0)**2)
vigc = np.clip(1.0 - 0.13*np.clip(rc-0.35,0,1)/0.65, 0.85, 1.0)
grainc = np.clip((zl - 170.0) / 255.0, -0.2, 0.08)
navyc = (np.zeros_like(Z) + NAVY + grainc[...,None]*np.array([18,26,34])) * vigc[...,None]
left_fixed = Z*(1-ac) + np.clip(navyc,0,255)*ac
bm = np.zeros((h,w)); bm[3:-3,3:-3] = 1
bm = ndimage.gaussian_filter(bm, 2.0)[...,None]
out[Y0:Y1, X0:X1] = out[Y0:Y1, X0:X1]*(1-bm) + left_fixed*bm
DX1 = 1022 - X0; DX0 = 1022 - (X1-1)
out[Y0:Y1, DX0:DX1+1] = out[Y0:Y1, DX0:DX1+1]*(1-bm) + left_fixed[:, ::-1]*bm
Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save('frame_navy_final.png')
print("built")
