"""Jungle temple ruins (10 Nov 2026) - made by Claude with the level-background skill. Harley: giant statues in the near layer, big but NOT with
their tops chopped. ChatGPT composite jungle_v1 (village sharp reference), then road / far / near / sky in the same chat.
  sky   = GPT sky, seamless
  far   = GPT far split (stepped pyramid, waterfall cliff, distant canopy), drift undone, colour-matched to the composite (GPT's was brighter)
  near  = composite pixels through GPT's near split as a stencil - GPT drew it 62 px LOWER (same scale, found by an edge match), shifted back.
          The three guardian statues are complete: tops at ~row 124, the layer starts at NEAR_TOP 90 so nothing is cut.
  road  = GPT road try 2 (fresh chat, full scene + try 1 attached): try 1 was too side-on (slab surface only 772..792 - Harley: enemies stood
          right on its edge). Try 2 views the paving a little from above: a ~62-row band 706..768, used at full depth. Seamless, 2x crisp.
Writes art/levels/jungle_*.webp (+ PNGs in art/originals/backgrounds/jungle_built/), prints numbers for TMP_ENV_BG.jungle.
Run: python3 dev/levels/build_jungle.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "jungle_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 772          # composite row where the stone slab surface starts (layers stand on this line)
ROAD_CROP = 690         # road image starts here (road try 2: fern tips above the paving's back edge at 706)
WALK = 726              # walking line ~37% into the 708..756 paving band (road try 3)
NEAR_TOP, FAR_TOP = 90, 140
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
def lab(a): return cv2.cvtColor(np.ascontiguousarray(a[..., :3]).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
def drift(layer_rgb, comp, mask, rows, dys=range(-40, 41, 2)):
    """GPT's offset of a split against the composite over the pixels it should share (gray template match on the given rows)"""
    g1 = cv2.cvtColor(layer_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32); g0 = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    g1[~mask] = 0; best = (1e9, 0, 0)
    for dy in dys:
        for dx in range(-20, 21, 4):
            sh = np.roll(np.roll(g1, dy, 0), dx, 1); mm = np.roll(np.roll(mask, dy, 0), dx, 1); mm[:rows[0]] = False; mm[rows[1]:] = False
            if mm.sum() < 5000: continue
            d = np.abs(sh[mm] - g0[mm]).mean()
            if d < best[0]: best = (d, dx, dy)
    return best
comp = np.asarray(Image.open(os.path.join(SRC, "jungle_v1_composite_1536x1024.png")).convert("RGB")).astype(np.float32)

# ---- sky ----
save(seamless(Image.open(os.path.join(SRC, "jungle_sky_gpt_1536x1024.png")).convert("RGBA")), "jungle_sky", 88)

# ---- near: composite pixels through GPT's near stencil (drift undone) ----
ng = np.asarray(Image.open(os.path.join(SRC, "jungle_layer_near_gpt_try1_1536x1024.png")).convert("RGB")).astype(np.float32)
nm = ~is_mag(ng)
d, dx, dy = drift(ng, comp, nm, (NEAR_TOP, ROAD_TOP), range(-90, 11, 2)); print("near drift", dx, dy, "err", round(d, 1))
nm = np.roll(np.roll(nm, dy, 0), dx, 1)
m = cv2.erode(nm.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.2); m[ROAD_TOP + 8:] = 0
near = Image.fromarray(np.dstack([comp.astype(np.uint8), m]), "RGBA").crop((0, NEAR_TOP, 1536, ROAD_TOP + 8))
nearC = seamless_cut(near); save(nearC, "jungle_near")
near_cover = np.zeros(comp.shape[:2], bool); near_cover[NEAR_TOP:ROAD_TOP + 8] = np.asarray(near.getchannel("A")) > 128

# ---- far: GPT far split, drift undone, colour-matched to the composite where the composite shows far things ----
fg = np.asarray(Image.open(os.path.join(SRC, "jungle_layer_far_gpt_try1_1536x1024.png")).convert("RGB")).astype(np.float32)
fm = ~is_mag(fg)
d, dx, dy = drift(fg, comp, fm & ~near_cover, (FAR_TOP, ROAD_TOP)); print("far drift", dx, dy, "err", round(d, 1))
fg = np.roll(np.roll(fg, dy, 0), dx, 1)
far = np.asarray(key(Image.fromarray(fg.astype(np.uint8)))).astype(np.float32)
fv = far[..., 3] > 200; fv[:FAR_TOP] = False; fv[ROAD_TOP:] = False
vis = fv & ~near_cover
s_m, s_s = lab(far)[fv].mean(0), lab(far)[fv].std(0) + 1e-3; r_m, r_s = lab(comp)[vis].mean(0), lab(comp)[vis].std(0)
k = 0.7; t_m, t_s = s_m + (r_m - s_m) * k, s_s + (r_s - s_s) * k
print("far LAB", np.round(s_m, 1), "->", np.round(t_m, 1))
far[..., :3] = cv2.cvtColor(np.clip((lab(far) - s_m) / s_s * t_s + t_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
# despill: magenta-tinted fringe pixels along the canopy edge (purple specks after the key) -> pulled to green-grey; only near transparency
edge = cv2.dilate((far[..., 3] < 200).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
R, G, Bc = far[..., 0], far[..., 1], far[..., 2]; pink = (R > G + 8) & (Bc > G + 8)   # anywhere: nothing in this layer is really purple (stone is warm, mist is blue) - the specks sit in leaf gaps too
far[..., 0] = np.where(pink, np.minimum(R, G), R); far[..., 2] = np.where(pink, (Bc + G) / 2, Bc)
far[..., 3] = np.where(edge & (far[..., 3] < 90), 0, far[..., 3]); print("far despill px", int(pink.sum()))
farI = Image.fromarray(far.astype(np.uint8), "RGBA").crop((0, FAR_TOP, 1536, ROAD_TOP + 1))
farC = seamless_cut(farI, search=60); save(farC, "jungle_far")   # search 60: keep the join in the plain canopy right of the waterfall cliff (the default 260 cut at the cliff's edge = a hard step)

# ---- road: full depth, seamless, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "jungle_layer_road_gpt_try3_1536x1024.png"))).crop((0, ROAD_CROP, 1536, 1024))   # try 3 (Harley 10 Nov): try 1 too side-on (20 rows), try 2 too deep (~62 rows), try 3 ~48 rows
r2 = seamless(road); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "jungle_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40))
print("TMP_ENV_BG.jungle: floor road", (WALK - ROAD_CROP) * 2, "top", tops[len(tops) // 2], "| near ow/oh", nearC.size, "baseY", ROAD_TOP - NEAR_TOP,
      "| far ow/oh", farC.size, "baseY", ROAD_TOP - FAR_TOP)
