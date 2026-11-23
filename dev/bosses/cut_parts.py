# Key a ChatGPT boss parts sheet (flat magenta) and save each separate part (small bits join the nearest big part).
# python3 dev/bosses_cut_parts.py SHEET OUT_DIR name1 name2 ...  (names in reading order: rows top->bottom, left->right, row height ROWH)
import sys, json
from PIL import Image
import numpy as np
from scipy import ndimage as nd
sheet, out_dir, names = sys.argv[1], sys.argv[2], sys.argv[3:]
ROWH = 300
A = np.array(Image.open(sheet).convert('RGB')).astype(int); r, g, b = A[:, :, 0], A[:, :, 1], A[:, :, 2]
mag = (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 70)
al = np.where(mag, 0, 255).astype(np.uint8)
ring = nd.binary_dilation(mag, iterations=2) & ~mag
sp = np.clip(np.minimum(r, b) - g, 0, 255); al[ring] = np.clip(255 - (sp[ring] - 60) * 2.0, 0, 255).astype(np.uint8)
B = A.copy(); m = (np.minimum(r, b) - g > 40) & (al > 0); B[:, :, 0] = np.where(m, np.maximum(g, r - 80), r); B[:, :, 2] = np.where(m, np.minimum(b, g + 20), b)
lab, n = nd.label(al > 0); sz = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
big = [i + 1 for i, s in enumerate(sz) if s > 3000]
cent = nd.center_of_mass(al > 0, lab, range(1, n + 1))
groups = {j: [j] for j in big}
for i in range(1, n + 1):
    if i in big or sz[i - 1] < 30: continue
    cy, cx = cent[i - 1]; best = min(big, key=lambda j: (cent[j - 1][0] - cy) ** 2 + (cent[j - 1][1] - cx) ** 2); groups[best].append(i)
rgba = np.dstack([B.astype(np.uint8), al]); outs = []
for j, members in groups.items():
    mk = np.isin(lab, members); ys, xs = np.where(mk); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = rgba[y0:y1, x0:x1].copy(); crop[:, :, 3] = np.where(mk[y0:y1, x0:x1], crop[:, :, 3], 0); outs.append((int(x0), int(y0), crop))
outs.sort(key=lambda o: (o[1] // ROWH, o[0]))
assert len(outs) == len(names), (len(outs), len(names))
meta = {}
for (x0, y0, crop), nm in zip(outs, names):
    Image.fromarray(crop).save(f'{out_dir}/{nm}.png'); meta[nm] = {"x": x0, "y": y0, "w": crop.shape[1], "h": crop.shape[0]}
json.dump(meta, open(f'{out_dir}/meta.json', 'w'), indent=1); print(json.dumps(meta))
