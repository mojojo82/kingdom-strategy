"""Crawler: Atlas tread clip -> loop frame sheet for the skin's anim.sheet (drawn UNDER the hull).
python3 dev/ships/tread_sheet.py K FRAMESDIR i j STEP canvas_oy unit_h_canvas track_x0 track_x1 treads_top cutW
Frames i..j-1 (j = the frame that matches i), every STEP. Prints the anim numbers (rx, ry, tw, th, cols, n, fps) in 1000-px picture space."""
import sys, glob, json
import numpy as np
from PIL import Image
K, FD = sys.argv[1], sys.argv[2]; i, j, st, oy, uh, x0, x1, top, cutW = map(int, sys.argv[3:12])
D = "art/originals/ships/crawler/"; W = 1000; k = W / cutW
fs = sorted(glob.glob(FD + "/*.png")); idx = list(range(i, j, st)); PAD = 6
vx0, vy0, vx1, vy1 = 36, int(oy * 0.75) - PAD, 36 + 1080, int((oy + uh) * 0.75) + PAD
sc = (x1 - x0 + 1) / 1080 * k; tw = round((vx1 - vx0) * sc); th = round((vy1 - vy0) * sc)
def key(a):
    a = a.astype(np.float32); M = np.array([255, 0, 255], np.float32); d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    M = np.median(a[:8].reshape(-1, 3), 0); dm = min(M[0], M[2]) - M[1]
    al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1); c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
    sp = (c[..., 0] > c[..., 1] + 10) & (c[..., 2] > c[..., 1] + 10); c[sp] = np.stack([c[..., 1], c[..., 1], c[..., 1]], -1)[sp] * 0.6 + c[sp] * 0.4
    al[al < 0.05] = 0; return np.dstack([c, al * 255]).astype(np.uint8)
frames = []
for q, n in enumerate(idx):
    a = np.asarray(Image.open(fs[n]).convert("RGB")); f = key(a)[vy0:vy1, vx0:vx1]
    im = Image.fromarray(f, "RGBA").resize((tw, th), Image.LANCZOS)
    frames.append(np.asarray(im).astype(np.float32))
L = len(frames); XF = min(3, L // 4)   # cross-fade the last XF frames toward the first ones so the loop joins
for q in range(XF):
    t = (q + 1) / (XF + 1); frames[L - XF + q] = frames[L - XF + q] * (1 - t) + frames[q] * t
cols = max(1, 4096 // tw); rows = (L + cols - 1) // cols
sheet = Image.new("RGBA", (tw * cols, th * rows), (0, 0, 0, 0))
for q, f in enumerate(frames): sheet.paste(Image.fromarray(f.astype(np.uint8), "RGBA"), ((q % cols) * tw, (q // cols) * th))
sheet.save(D + "crawler%s_treads_sheet.webp" % K, "WEBP", quality=86, method=6)
rx = round(x0 * k - (36 - vx0) * sc, 2); ry = round(top * k - (int(oy * 0.75) - vy0) * sc - (oy * 0.75 - int(oy * 0.75)) * sc, 2)
info = {"rx": rx, "ry": ry, "tw": tw, "th": th, "cols": cols, "n": L, "fps": round(24 / st)}
json.dump(info, open(D + "crawler%s_treads_sheet.json" % K, "w")); print(K, info, "sheet", sheet.size)
