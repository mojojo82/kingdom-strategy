"""Static hero card art (HERO_CARD_ART2): key a ChatGPT card portrait (1024x1536, flat green or magenta) and fit it on 360x480.
Width-fit, top kept (the head stays where ChatGPT framed it), the body runs off the bottom edge like the other cards. Transparent outside, so the
game paints the rarity colour behind it. Run: python3 dev/heroes/make_card_art.py IN.png OUT.webp green|magenta [ZOOM=1.0] [CY=0]
ZOOM > 1 crops in on the head (centred horizontally, CY = extra px down in the source before cropping)."""
import sys
import numpy as np
from PIL import Image
IN, OUT, BG = sys.argv[1], sys.argv[2], sys.argv[3]
ZOOM = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0; CY = int(sys.argv[5]) if len(sys.argv) > 5 else 0
a = np.asarray(Image.open(IN).convert("RGB")).astype(np.float32)
M = np.median(np.concatenate([a[:30].reshape(-1, 3), a[:, :30].reshape(-1, 3), a[:, -30:].reshape(-1, 3)]), 0)
if BG == "green": d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); dm = M[1] - max(M[0], M[2])
else: d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]; dm = min(M[0], M[2]) - M[1]
al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1)
c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
r, g, b = c[..., 0], c[..., 1], c[..., 2]
if BG == "green": sp = (g > np.maximum(r, b)); c[..., 1] = np.where(sp, np.maximum(r, b), g)           # green spill -> neutral
else: sp = (r > g) & (b > g) & (np.minimum(r, b) - g > 20); m = np.minimum(r, b); c[..., 0] = np.where(sp & (al < 0.98), np.minimum(r, g + (r - m)), r); c[..., 2] = np.where(sp & (al < 0.98), np.minimum(b, g + (b - m)), b)
al[al < 0.03] = 0
im = Image.fromarray(np.dstack([c, al * 255]).astype(np.uint8), "RGBA")
W, H = im.size; cw = W / ZOOM; ch = cw * 480 / 360; x0 = (W - cw) / 2; y0 = CY
im = im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((360, 480), Image.LANCZOS)
im.save(OUT, "WEBP", quality=90, method=6); print(OUT, im.size)
