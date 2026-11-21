"""Cut a ChatGPT icon grid (flat #00FF00 or #FF00FF background) into separate keyed icons.
python3 dev/items/cut_icon_grid.py SHEET.png OUT_DIR name1,name2,... [green|magenta]
Strict key: only pixels close to the pure background colour go transparent (green leaves etc. survive). Icons are found as the biggest
blobs, sorted row by row (left to right), saved trimmed + square-padded as OUT_DIR/<name>.png."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
bgname = sys.argv[4] if len(sys.argv) > 4 else 'green'
BG = np.array([0, 255, 0] if bgname == 'green' else [255, 0, 255], float)
a = np.asarray(Image.open(src).convert('RGB')).astype(float)
d = np.sqrt(((a - BG) ** 2).sum(2))
al = np.clip((d - 45) / (120 - 45), 0, 1)
# despill: pull the background hue out of half-transparent edge pixels
if bgname == 'green':
    m = a[..., 1] > np.maximum(a[..., 0], a[..., 2]); edge = (al < 1) & m
    a[..., 1] = np.where(edge, np.maximum(a[..., 0], a[..., 2]), a[..., 1])
else:
    lim = np.minimum(a[..., 0], a[..., 2]); m = lim > a[..., 1]; edge = (al < 1) & m
    a[..., 0] = np.where(edge, a[..., 1] + (a[..., 0] - lim), a[..., 0]); a[..., 2] = np.where(edge, a[..., 1] + (a[..., 2] - lim), a[..., 2])
rgba = np.dstack([np.clip(a, 0, 255), al * 255]).astype(np.uint8)
lab, n = nd.label(nd.binary_dilation(al > 0.5, iterations=6))
sizes = nd.sum(np.ones_like(al), lab, range(1, n + 1))
keep = sorted(range(1, n + 1), key=lambda i: -sizes[i - 1])[:len(names)]
boxes = [nd.find_objects((lab == i).astype(int))[0] for i in keep]
H = a.shape[0]; rowh = H / max(1, round(len(names) / max(1, sum(1 for b in boxes if b[0].start < H / 2 + 1)))) if False else None
boxes.sort(key=lambda b: (round((b[0].start + b[0].stop) / 2 / (H / 4)), b[1].start))
for nm, b in zip(names, boxes):
    crop = Image.fromarray(rgba[b[0].start:b[0].stop, b[1].start:b[1].stop])
    bb = crop.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox(); crop = crop.crop(bb)
    s = max(crop.size) + 8; sq = Image.new('RGBA', (s, s)); sq.paste(crop, ((s - crop.width) // 2, (s - crop.height) // 2)); sq.save(f'{out}/{nm}.png'); print(nm, sq.size)
