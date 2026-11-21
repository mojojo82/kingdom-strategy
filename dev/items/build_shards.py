"""Hero fragment (shard) icons: the hero's card portrait clipped inside the gold puzzle piece.
python3 dev/items/build_shards.py PORTRAIT_DIR OUT_DIR   (PORTRAIT_DIR has <hero>.webp, the 360x480 card art)
Per hero: face centre (fx, fy as fractions of the portrait) and zoom (portrait width / piece width)."""
import sys, json
import numpy as np
from PIL import Image, ImageFilter
FRAG = Image.open('/home/claude/kingdom-strategy/art/originals/items/ks/cut/fragment.png').convert('RGBA')
S = FRAG.size[0]
TARGET = (372, 348)          # where the face goes on the piece (piece px)
ERODE = 30                   # gold rim kept around the portrait
P = {  # hero: (fx, fy, zoom)
 'gareth': (0.63, 0.24, 0.90), 'lyra': (0.56, 0.22, 0.98), 'roran': (0.55, 0.22, 0.94), 'kessa': (0.40, 0.23, 0.98),
 'sera': (0.64, 0.36, 0.86), 'bram': (0.53, 0.27, 0.90), 'juno': (0.44, 0.34, 0.94), 'pip': (0.40, 0.34, 0.94),
 'torvald': (0.47, 0.22, 0.94), 'hanzo': (0.53, 0.32, 0.76), 'ironlily': (0.42, 0.27, 0.94), 'vesper': (0.47, 0.37, 0.90),
 'aurek': (0.55, 0.30, 0.86), 'baelgor': (0.55, 0.34, 0.82), 'seraphine': (0.62, 0.35, 0.90), 'halo7': (0.45, 0.30, 0.74),
 'caelum': (0.44, 0.36, 0.90), 'zarek': (0.50, 0.35, 0.90), 'tom': (0.50, 0.34, 0.90)}
a = FRAG.getchannel('A').point(lambda v: 255 if v > 128 else 0)
inner = a.filter(ImageFilter.MinFilter(ERODE * 2 + 1)).filter(ImageFilter.GaussianBlur(1.5))
def build(hero, src):
    fx, fy, z = P[hero]
    im = Image.open(src).convert('RGBA'); w = round(S * z); h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    layer = Image.new('RGBA', (S, S)); layer.alpha_composite(im, (round(TARGET[0] - fx * w), round(TARGET[1] - fy * h))) if True else None
    al = np.minimum(np.asarray(layer.getchannel('A'), np.float32), np.asarray(inner, np.float32))
    layer.putalpha(Image.fromarray(al.astype(np.uint8)))
    out = FRAG.copy(); out.alpha_composite(layer); return out
if __name__ == '__main__':
    pd, od = sys.argv[1], sys.argv[2]
    for h in P: build(h, f'{pd}/{h}.webp').save(f'{od}/shard_{h}.png')
