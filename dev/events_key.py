"""Slice + key a ChatGPT icon sheet on magenta (same keyer as dev/items_key.py).
python3 dev/events_key.py SHEET COLS ROWS OUTDIR name1 name2 ...   (names in reading order; '-' skips a cell)
Writes OUTDIR/<name>.png (trimmed, 256 px max side) and keeps the sheet as the original."""
import sys, os
from PIL import Image
exec(open(os.path.join(os.path.dirname(__file__), "items_key.py")).read().split("\nSHEETS")[0])
sheet, cols, rows, outd, names = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5:]
im = Image.open(sheet).convert("RGB"); W, H = im.size; os.makedirs(outd, exist_ok=True)
for i, n in enumerate(names):
    if n == "-": continue
    c, r = i % cols, i // cols
    cell = im.crop((c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows))
    k = key_cell(cell)
    import numpy as np
    from scipy import ndimage
    a = np.array(k); lab, nl = ndimage.label(a[..., 3] > 20)
    if nl > 1:  # keep the main shape and any blob at least 3% of it (drops stray specks)
        sz = ndimage.sum(np.ones_like(lab), lab, range(1, nl + 1)); big = sz.max()
        for j, v in enumerate(sz):
            if v < big * 0.03: a[..., 3][lab == j + 1] = 0
        k = Image.fromarray(a)
    bb = k.getbbox(); k = k.crop(bb)
    s = 256 / max(k.size); k = k.resize((max(1, round(k.width * s)), max(1, round(k.height * s))), Image.LANCZOS)
    k.save(os.path.join(outd, n + ".png")); print(n, k.size)
