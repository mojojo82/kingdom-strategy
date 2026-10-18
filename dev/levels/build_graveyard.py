"""Graveyard (night level) layers from Harley's ChatGPT split (art/originals/backgrounds/graveyard_layer_*_gpt_1536x1024.png).
- key out the magenta, clean the pink edge
- far: extend its mist down to the road line (its wavy bottom stopped ~40px short)
- road: flatten the top surface band so the road is seen from the same low eye-level as the village road (Harley: the ground view must match every level)
- every layer made seamless left-right (cross-fade of the two ends), road also 2x with crisp pixels
Writes art/levels/graveyard_{far,near,road}.webp (+ full-size PNGs in art/originals/backgrounds/graveyard_built/).
Run: python3 dev/levels/build_graveyard.py"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "graveyard_built")
os.makedirs(OUT, exist_ok=True); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 727          # composite row where the near layer meets the road
SEAM = 90               # cross-fade width for the left/right join (source px)

def key(im):
    im = im.convert("RGBA"); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]; m = min(r, b) - g
            if m > 70 or (r > 150 and b > 150 and g < 110): px[x, y] = (0, 0, 0, 0); continue   # strict: GPT's magenta edges are often a darker pink
            if m > 25:
                s = m - 25; px[x, y] = (max(0, r - s), g, max(0, b - s), int(255 * (70 - m) / 45))
            elif m > 8:
                s = (m - 8) // 2; px[x, y] = (r - s, g, b - s, a)
    return im

def seamless(im, n=SEAM):
    """cross-fade the last n columns into the first n, then drop them: the right edge now flows into the left."""
    W, H = im.size; out = im.crop((0, 0, W - n, H)).copy()
    for i in range(n):
        t = i / (n - 1)
        a = im.crop((i, 0, i + 1, H)); b = im.crop((W - n + i, 0, W - n + i + 1, H))
        out.paste(Image.blend(b, a, t), (i, 0))
    return out

def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png"))
    im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6)
    print(name, im.size)

# --- far: hills, abbey, mist. Extend the mist down to the road line.
far = key(Image.open(os.path.join(SRC, "graveyard_layer_far_gpt_1536x1024.png")))
px = far.load(); W, H = far.size
for x in range(W):
    last = None
    for y in range(ROAD_TOP, 150, -1):
        if px[x, y][3] > 200: last = y; break
    if last is None: continue
    r, g, b, _ = px[x, last - 3]
    for y in range(last + 1, ROAD_TOP + 1):
        px[x, y] = (r, g, b, 255)
far = seamless(far.crop((0, 130, W, ROAD_TOP + 1)))
save(far, "graveyard_far")

def village_soft(im, k=1 / 1.75):
    """v1297 (Harley: razor sharp looked like a cardboard cut-out): soften like the village is softened on a 3x phone - shrink to 1/1.75 and blow back up.
    Done premultiplied so the cut-out edges don't darken."""
    x = np.asarray(im.convert("RGBA")).astype(np.float32) / 255; x[..., :3] *= x[..., 3:4]; h, w = x.shape[:2]
    ch = [np.asarray(Image.fromarray(x[..., i], "F").resize((round(w * k), round(h * k)), Image.LANCZOS).resize((w, h), Image.BILINEAR)) for i in range(4)]
    y = np.clip(np.stack(ch, -1), 0, 1); a = np.clip(y[..., 3:4], 1e-6, 1); y[..., :3] = np.where(y[..., 3:4] > 1e-4, y[..., :3] / a, 0)
    return Image.fromarray((np.clip(y, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")

# --- near: chapel, trees, fences, graves. v1298 (Harley: "lets not auto soften the images"): the game gets the sharp original; softness is a
#     per-level setting (TMP_ENV_BG layer .soft + the Dev Tools "Scenery sharpness" row), applied at load time. village_soft() kept for reference only.
near = key(Image.open(os.path.join(SRC, "graveyard_layer_near_gpt_1536x1024.png")))
near = seamless(near.crop((0, 95, near.width, ROAD_TOP + 1)))
near.save(os.path.join(FULL, "graveyard_near_sharp.png"))
save(near, "graveyard_near")

# --- road: flatten the top surface band (grass line ~712 to the cut face ~787) to ~38% so it matches the village road's eye-level.
road = key(Image.open(os.path.join(SRC, "graveyard_layer_road2_gpt_1536x1024.png")))
TOP, CUT, KEEP = 700, 787, 0.38
band = road.crop((0, TOP, road.width, CUT)); bh = max(1, round((CUT - TOP) * KEEP))
band = band.resize((road.width, bh), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, bh + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, bh))
r2 = seamless(r2)
r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)   # crisp 2x
save(r2, "graveyard_road")
print("road surface band now", bh, "src px (x2 =", bh * 2, ") ; walking line (25% down the band) =", round(bh * 2 * 0.25), "px from the road image top")
