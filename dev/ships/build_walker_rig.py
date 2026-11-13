"""Walker v4 (Harley, 13 Nov 2026): code-rigged legs. ChatGPT parts sheet (walker_parts_v1.png: near/far thigh, shin, foot - complete, round
hinges) + hip drum (walker_hip_v1.png) -> one packed atlas (walker_rig.webp) + pivots in HULL px (the 1000-wide walker3_back space).
The game draws the legs live every frame (drawWalkerRig) - smooth at any frame rate. python3 dev/ships/build_walker_rig.py"""
import json, base64, io
import numpy as np
from PIL import Image
D = "art/originals/ships/walker/"; K = 1000 / 1422          # composite px -> hull px
def key(a):
    a = a.astype(np.float32); d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    al = np.clip(1 - (d - 25) / (255 * 0.85 - 25), 0, 1); M = np.array([255, 0, 255])
    c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
    sp = (c[..., 0] > c[..., 1] + 12) & (c[..., 2] > c[..., 1] + 12); c[sp] = c[sp] * 0.4 + np.stack([c[..., 1]] * 3, -1)[sp] * 0.6
    al[al < 0.04] = 0; return np.dstack([c, al * 255])
P = key(np.asarray(Image.open(D + "walker_parts_v1.png").convert("RGB")))
HP = key(np.asarray(Image.open(D + "walker_hip_v1.png").convert("RGB")))
# name: (source, box x0,y0,x1,y1 in source px, scale source->composite, pivots in source px, darken)
NEAR, FAR, FOOTN, FOOTF, HIP = 0.50, 0.475, 0.62, 0.66, 0.253
spec = {
  "nth": (P, (177, 27, 443, 485), NEAR, [(366, 99), (302, 433)], 1.0),
  "nsh": (P, (670, 59, 864, 477), NEAR, [(757, 111), (748, 426)], 1.0),
  "nft": (P, (1015, 304, 1400, 479), FOOTN, [(1212, 330)], 1.0),
  "fth": (P, (200, 553, 422, 952), FAR, [(341, 630), (299, 905)], 0.62),
  "fsh": (P, (675, 575, 826, 951), FAR, [(756, 628), (756, 904)], 0.62),
  "fft": (P, (1064, 816, 1362, 952), FOOTF, [(1213, 836)], 0.62),
}
hy, hx = np.where(HP[..., 3] > 128); spec["hip"] = (HP, (hx.min() - 2, hy.min() - 2, hx.max() + 3, hy.max() + 3), HIP, [(752, 516)], 1.0)
# hip cap: the drum's glowing centre, drawn over the thigh's top hinge (round crop, soft edge)
cy, cx, R = 516, 752, 128
cap = HP[cy - R:cy + R, cx - R:cx + R].copy(); yy, xx = np.mgrid[-R:R, -R:R]; rr = np.hypot(yy, xx)
cap[..., 3] *= np.clip((R - rr) / 6, 0, 1); spec["cap"] = (cap, (0, 0, 2 * R, 2 * R), HIP, [(R, R)], 1.0)
SS = 1.5                                                    # atlas stored at 1.5x hull px (sharp on 3x phones)
pieces, meta = [], {}
for n, (src, (x0, y0, x1, y1), s, piv, dk) in spec.items():
    im = src[y0:y1, x0:x1].copy(); im[..., :3] *= dk
    f = s * K * SS; w, h = max(1, round((x1 - x0) * f)), max(1, round((y1 - y0) * f))
    pim = Image.fromarray(im.astype(np.uint8), "RGBA").resize((w, h), Image.LANCZOS)
    pieces.append((n, pim)); meta[n] = {"p": [[round((px - x0) * f, 2), round((py - y0) * f, 2)] for px, py in piv], "w": w, "h": h}
# shelf-pack
W = 768; x = y = rowh = 0; pos = {}
for n, im in sorted(pieces, key=lambda t: -t[1].height):
    if x + im.width + 2 > W: x, y, rowh = 0, y + rowh + 2, 0
    pos[n] = (x, y); x += im.width + 2; rowh = max(rowh, im.height)
atlas = Image.new("RGBA", (W, y + rowh), (0, 0, 0, 0))
for n, im in pieces: atlas.paste(im, pos[n]); meta[n]["x"], meta[n]["y"] = pos[n]
atlas.save(D + "walker_rig_atlas.png")
b = io.BytesIO(); atlas.save(b, "WEBP", quality=90, method=6); open(D + "walker_rig.webp", "wb").write(b.getvalue())
for n in meta: meta[n]["p"] = [[round(px / SS, 2), round(py / SS, 2)] for px, py in meta[n]["p"]]
meta["_ss"] = SS
json.dump(meta, open(D + "walker_rig.json", "w"))
print(atlas.size, len(b.getvalue()), json.dumps(meta))
