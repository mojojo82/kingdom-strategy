"""Soft green-screen key for Lily's skill frames: keeps see-through glow, removes the green that leaks into it.
python3 dev/heroes/lily/key_soft.py IN_DIR OUT_DIR   (PNG frames in, RGBA PNG frames out)"""
import sys, glob, os, numpy as np
from PIL import Image
IN, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
fr = sorted(glob.glob(os.path.join(IN, '*.png')))
a = np.asarray(Image.open(fr[0]).convert('RGB')).astype(np.float32); BG = np.median(a[:40, :40].reshape(-1, 3), 0)
for p in fr:
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    sp = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    al = 1 - np.clip((sp - 18) / (BG[1] - max(BG[0], BG[2]) - 30), 0, 1)
    fg = (a - (1 - al)[..., None] * BG) / np.maximum(al, 1e-3)[..., None]
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]) + 10)
    soft = al < 0.97                                   # glow / edges: no yellow-green, keep it red-orange
    fg[..., 1] = np.where(soft, np.minimum(fg[..., 1], 0.55 * fg[..., 0] + 10), fg[..., 1])
    al[al < 0.04] = 0
    Image.fromarray(np.dstack([fg.clip(0, 255), al * 255]).astype(np.uint8), 'RGBA').save(os.path.join(OUT, os.path.basename(p)))
print(len(fr), 'frames, bg', BG)
