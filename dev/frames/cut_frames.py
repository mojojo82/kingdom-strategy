# Cut avatar frames out of a 2x2 ChatGPT sheet on flat light grey with flat WHITE openings.
# Works on the whole sheet (pieces may cross the half-way lines): the grey background and each frame's white opening
# become transparent, every separate piece is given to the nearest frame. Prints the opening box as fractions of each
# trimmed frame (hx, hy, hw, hh) for AVATAR_FRAME_ART.
# python3 dev/frames/cut_frames.py SHEET OUT_DIR name1 name2 name3 name4   (order: top-left, top-right, bottom-left, bottom-right)
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage as nd
sheet, out, names = sys.argv[1], sys.argv[2], sys.argv[3:7]
A = np.array(Image.open(sheet).convert('RGB')).astype(int); H, W = A.shape[:2]
bg = np.array([222, 222, 224]); d = np.abs(A - bg).sum(2)
lab, n = nd.label(d < 24); edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
outside = np.isin(lab, list(edge))
wl, _ = nd.label(A.min(2) > 232)
centres = [(W // 4, H // 4), (3 * W // 4, H // 4), (W // 4, 3 * H // 4), (3 * W // 4, 3 * H // 4)]
holes = [wl == wl[cy, cx] for cx, cy in centres]
alpha = np.full((H, W), 255, np.uint8); alpha[outside] = 0
ring = nd.binary_dilation(outside, iterations=2) & ~outside
alpha[ring] = np.clip(d[ring] * 255 / 60, 0, 255).astype(np.uint8)
for ho in holes: alpha[nd.binary_dilation(ho, iterations=2) & (A.min(2) > 150)] = 0
# hole centres decide ownership of each solid piece
hc = [tuple(np.argwhere(ho).mean(0)[::-1]) for ho in holes]
pl, pn = nd.label(alpha > 0); owner = np.zeros(pn + 1, int)
for i, c in enumerate(nd.center_of_mass(alpha > 0, pl, range(1, pn + 1))):
    cy, cx = c; owner[i + 1] = int(np.argmin([(cx - x) ** 2 + (cy - y) ** 2 for x, y in hc]))
res = {}
for k, name in enumerate(names):
    mine = (pl > 0) & (owner[pl] == k)
    ys, xs = np.where(mine); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    a = np.where(mine, alpha, 0).astype(np.uint8)
    rgba = np.dstack([A.astype(np.uint8), a])[y0:y1 + 1, x0:x1 + 1]
    hy_, hx_ = np.where(holes[k][y0:y1 + 1, x0:x1 + 1]); fw, fh = int(x1 - x0 + 1), int(y1 - y0 + 1)
    res[name] = dict(hx=round(float(hx_.min()) / fw, 4), hy=round(float(hy_.min()) / fh, 4), hw=round(float(hx_.max() - hx_.min() + 1) / fw, 4), hh=round(float(hy_.max() - hy_.min() + 1) / fh, 4), w=fw, h=fh)
    Image.fromarray(rgba).save(f'{out}/frame_{name}.png')
print(json.dumps(res))
