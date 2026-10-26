"""Clockwork foundry level (chapter 9) - Harley's ChatGPT composite art/originals/backgrounds/foundry_v1_composite_1536x1024.png (26 Oct 2026).
Indoor, no sky. Layers:
  far   = GPT far try 2 (hazy hall, a bit zoomed vs the composite - fine for a far layer), cut at the floor line, seamless
  near  = GPT near try 2 (ALL gears removed, hubs left, lines up 0,0 with the composite), keyed, seamless
  front = the bits of the near layer that sit IN FRONT of a gear in the composite (rails, rods, pipes) - drawn over the spinning gears
  gears = GPT gear sheet, each gear cut out, scaled to its size in the composite, packed in one sheet; spun in code (FOUNDRY_GEARS)
  pour  = the molten stream pixels of the near layer (mask) - the game runs a flowing shimmer through it
  road  = GPT road try 1, plate band squashed to the snow pass / desert depth (village eye level), 2x crisp
Writes art/levels/foundry_*.webp + art/levels/foundry_gears.json (+ PNGs in art/originals/backgrounds/foundry_built/).
Run: python3 dev/levels/build_foundry.py"""
import os, sys, json
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "foundry_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 770
def save(im, name, q=90, lossless=False):
    im.save(os.path.join(FULL, name + ".png"))
    if lossless: im.save(os.path.join(OUT, name + ".webp"), lossless=True, method=6)
    else: im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6)
    print(name, im.size)
def magm(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
comp = np.asarray(Image.open(os.path.join(SRC, "foundry_v1_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
nearsrc = np.asarray(Image.open(os.path.join(SRC, "foundry_layer_near_gpt_try2_1536x1024.png")).convert("RGB")).astype(np.float32)

# ---- far ----
far = Image.open(os.path.join(SRC, "foundry_layer_far_gpt_try2_1536x1024.png")).convert("RGBA")
save(seamless_cut(far.crop((0, 0, far.width, ROAD_TOP + 1))), "foundry_far")

# ---- near (keyed) - the wrap width it picks is used for every near-space piece ----
near = key(Image.open(os.path.join(SRC, "foundry_layer_near_gpt_try2_1536x1024.png")))
nearc = seamless_cut(near.crop((0, 0, near.width, ROAD_TOP + 8))); W2 = nearc.width
save(nearc, "foundry_near")

# ---- gears: (name, sheet blob id, centre x, y, radius in composite px, spin direction) ----
GEARS = [("big", 1, 352, 282, 126, 1), ("med", 2, 516, 368, 67, -1), ("small", 4, 422, 448, 48, 1), ("left", 3, 33, 567, 44, -1)]  # the right-edge gear sits past the near layer's wrap width (1412) - left out, its hole is cut off with it
g = np.asarray(Image.open(os.path.join(SRC, "foundry_gears_gpt_1536x1024.png")).convert("RGB")).astype(np.float32)
gk = np.asarray(key(Image.open(os.path.join(SRC, "foundry_gears_gpt_1536x1024.png")))).astype(np.float32)
gm = ~magm(g); lab, _ = nd.label(nd.binary_fill_holes(nd.binary_opening(gm)))
cells = []; xcur = 0; H = 0
for nm, bid, cx, cy, r, d in GEARS:
    ys, xs = np.where(lab == bid); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    sp = gk[y0:y1, x0:x1].copy(); sp[..., 3] *= (lab[y0:y1, x0:x1] == bid)
    D = 2 * r + 2; spr = cv2.resize(sp, (D, D), interpolation=cv2.INTER_AREA)
    cells.append((nm, spr, cx, cy, r, d)); H = max(H, D)
sheet = np.zeros((H, sum(c[1].shape[1] + 4 for c in cells), 4), np.float32); meta = []
for nm, spr, cx, cy, r, d in cells:
    D = spr.shape[0]; sheet[:D, xcur:xcur + D] = spr
    meta.append({"n": nm, "sx": xcur, "sy": 0, "s": D, "x": cx, "y": cy, "r": r, "dir": d}); xcur += D + 4
save(Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8), "RGBA"), "foundry_gears", lossless=True)

# ---- front: near pixels that cover a gear in the composite (inside each gear disc, composite == near) ----
same = np.abs(comp - nearsrc).mean(2) < 18
solid = ~magm(nearsrc)
fm = np.zeros(same.shape, bool); yy, xx = np.mgrid[0:1024, 0:1536]
for nm, bid, cx, cy, r, d in GEARS:
    disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= (r * 1.02) ** 2
    fm |= disc & same & solid
fm = nd.binary_opening(fm, iterations=2); lab2, nl = nd.label(fm)
if nl:
    sizes = nd.sum(fm, lab2, range(1, nl + 1)); fm = np.isin(lab2, [i + 1 for i, s in enumerate(sizes) if s >= 60])
fa = (cv2.GaussianBlur(fm.astype(np.float32), (0, 0), 0.8) * 255).astype(np.uint8)
na = np.asarray(near).copy(); front = na.copy(); front[..., 3] = np.minimum(na[..., 3], fa)
save(Image.fromarray(front[:ROAD_TOP + 8, :W2], "RGBA"), "foundry_front", lossless=True)
print("front pixels", int(fm.sum()))

# ---- pour: molten stream mask (bright orange/yellow), from the near layer ----
r_, g_, b_ = nearsrc[..., 0], nearsrc[..., 1], nearsrc[..., 2]
molten = (r_ > 220) & (g_ > 120) & (b_ < 140) & (r_ - b_ > 110)
box = (1240, 360, 1400, 680); mm = np.zeros_like(molten); mm[box[1]:box[3], box[0]:box[2]] = molten[box[1]:box[3], box[0]:box[2]]
mm = nd.binary_closing(mm, iterations=2); ys, xs = np.where(mm); px0, px1, py0, py1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
pm = (cv2.GaussianBlur(mm.astype(np.float32), (0, 0), 1.0)[py0:py1, px0:px1] * 255).astype(np.uint8)
pour = np.dstack([np.full(pm.shape + (3,), 255, np.uint8), pm])
save(Image.fromarray(pour, "RGBA"), "foundry_pour", lossless=True)
json.dump({"wrap": W2, "gears": meta, "pour": [int(px0), int(py0), int(px1 - px0), int(py1 - py0)], "sheetH": int(H)}, open(os.path.join(OUT, "foundry_gears.json"), "w"))
print("pour box", px0, py0, px1 - px0, py1 - py0, "wrap", W2)

# ---- road: plate band 698..762 (grate front edge starts 762) squashed to the desert depth, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "foundry_layer_road_gpt_try1_1536x1024.png")))
TOP, CUT, BAND = 688, 762, 43
band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "foundry_road")
a = r2.getchannel("A"); tops = sorted(next((y for y in range(r2.height) if a.getpixel((x, y)) > 200), 0) for x in range(0, r2.width, 40))
print("road solid top (median row)", tops[len(tops) // 2])
