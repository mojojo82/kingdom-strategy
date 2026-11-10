"""Sky docks (chapter 18, 10 Nov 2026) - the fight is ON BOARD a sky-ship (Harley: "like they are on board an airship"). ChatGPT composite
skydocks_v1 (village sharp reference attached), then road / far / near / sky splits in the same chat.
Harley: leave open space in the sky for flying airships he adds later - none are drawn (not in the composite, not in any layer).
  sky   = GPT sky, seamless
  far   = GPT far split (cloud sea + distant snowy peaks), drift undone, colour-matched to the composite, seamless cut
  near  = composite pixels through GPT's near split used as a stencil (railing, three masts with crow's nests and flags, steam engine,
          cargo, cannon, lanterns), drift undone, seamless cut
  road  = GPT road try 1 (deck planks + hull with portholes; lines up with the composite: back edge 722, brass trim 858), FULL depth - no
          squashing (Harley's rule), seamless, 2x crisp. Walking line WALK, about half way into the 722..858 plank band.
Layers stand on the deck's back edge: baseY = layer row of that edge + ((road - top) * 0.21 - lift 2.5) / scale (same as the throne room).
Writes art/levels/skydocks_*.webp (+ PNGs in art/originals/backgrounds/skydocks_built/), prints numbers for TMP_ENV_BG.skydocks.
Run: python3 dev/levels/build_skydocks.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "skydocks_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 722          # composite row where the deck planks start (layers stand on this line)
ROAD_CROP = 718         # road image starts here
WALK = 790              # walking line: about half way into the 722..858 deck
NEAR_TOP, FAR_TOP = 40, 440
SCALE = 0.3             # near / far scale (x 185.76), like the other outdoor levels
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
def lab(a): return cv2.cvtColor(np.ascontiguousarray(a[..., :3]).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
def drift(layer_rgb, comp, mask, rows):
    """GPT's offset of a split against the composite over the pixels it should share (gray template match on the given rows)"""
    g1 = cv2.cvtColor(layer_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32); g0 = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    g1[~mask] = 0; best = (1e9, 0, 0)
    for dy in range(-40, 41, 2):
        for dx in range(-20, 21, 4):
            sh = np.roll(np.roll(g1, dy, 0), dx, 1); mm = np.roll(np.roll(mask, dy, 0), dx, 1); mm[:rows[0]] = False; mm[rows[1]:] = False
            if mm.sum() < 5000: continue
            d = np.abs(sh[mm] - g0[mm]).mean()
            if d < best[0]: best = (d, dx, dy)
    return best
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
comp = np.asarray(Image.open(os.path.join(SRC, "skydocks_v1_composite_1536x1024.png")).convert("RGB")).astype(np.float32)

# ---- sky ----
save(seamless(Image.open(os.path.join(SRC, "skydocks_sky_gpt_1536x1024.png")).convert("RGBA")), "skydocks_sky", 88)

# ---- near: composite pixels through GPT's near stencil (drift undone) ----
ng = np.asarray(Image.open(os.path.join(SRC, "skydocks_layer_near_gpt_try1_1536x1024.png")).convert("RGB")).astype(np.float32)
nm = ~is_mag(ng)
d, dx, dy = drift(ng, comp, nm, (NEAR_TOP, ROAD_TOP)); print("near drift", dx, dy, "err", round(d, 1))
nm = np.roll(np.roll(nm, dy, 0), dx, 1)
m = cv2.GaussianBlur(nm.astype(np.uint8) * 255, (0, 0), 0.6)   # no erode: it wiped the thin ropes and rope ladders; m[ROAD_TOP + 6:] = 0
near = Image.fromarray(np.dstack([comp.astype(np.uint8), m]), "RGBA").crop((0, NEAR_TOP, 1536, ROAD_TOP + 6))
nearC = seamless_cut(near); save(nearC, "skydocks_near")
near_cover = np.zeros(comp.shape[:2], bool); near_cover[NEAR_TOP:ROAD_TOP + 6] = np.asarray(near.getchannel("A")) > 128

# ---- far: GPT far split, drift undone, colour-matched to the composite where the composite shows the cloud sea ----
fg = np.asarray(Image.open(os.path.join(SRC, "skydocks_layer_far_gpt_try1_1536x1024.png")).convert("RGB")).astype(np.float32)
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
farI = Image.fromarray(far.astype(np.uint8), "RGBA").crop((0, FAR_TOP, 1536, ROAD_TOP + 6))
farC = seamless_cut(farI); save(farC, "skydocks_far")

# ---- road: full depth, seamless, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "skydocks_layer_road_gpt_try1_1536x1024.png"))).crop((0, ROAD_CROP, 1536, 1024))
r2 = seamless(road); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "skydocks_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); top = tops[len(tops) // 2]
road_v = (WALK - ROAD_CROP) * 2; up = ((road_v - top) * 0.21 - 2.5) / SCALE
print("TMP_ENV_BG.skydocks: floor road", road_v, "top", top, "| near ow/oh", nearC.size, "baseY", round(ROAD_TOP - NEAR_TOP + up),
      "| far ow/oh", farC.size, "baseY", round(ROAD_TOP - FAR_TOP + up))
