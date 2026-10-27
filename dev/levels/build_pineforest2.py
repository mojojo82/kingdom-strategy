"""Pine forest v2 (chapter 12 re-do, 27 Oct 2026) - Harley's second try: complete treetops with sky above (no extend-up pass or blow-up),
softer colours, the layered-soil underground written into the scene prompt. Replaces build_pineforest.py's output in the game (v1 files kept).
  sky  = GPT sky, seamless
  far  = GPT far try 1: keep ~1.4x the composite (kept - last level before the castle gate; shrinking makes the far narrower than a phone
         screen), lifted 30 px, colour-matched 50%
  near = GPT near try 1 was drawn 76 px LOWER than the composite (same scale) - used only as a stencil: shifted up 76, composite pixels cut through it
  road = GPT road try 1 (same layers as the composite, 28 px higher), path band 716..760 squashed to 46 rows, 2x crisp
Writes art/levels/pineforest2_*.webp (+ PNGs in art/originals/backgrounds/pineforest2_built/). Run: python3 dev/levels/build_pineforest2.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "pineforest2_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 742; FAR_LIFT = 30; FAR_TOP = 230; NEAR_DY = -76
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
comp = np.asarray(Image.open(os.path.join(SRC, "pineforest_v2_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
ng = np.asarray(Image.open(os.path.join(SRC, "pineforest2_layer_near_gpt_try1_1536x1024.png")).convert("RGB"))
M = np.float32([[1, 0, 0], [0, 1, NEAR_DY]])
near_mask = cv2.warpAffine((~is_mag(ng)).astype(np.uint8) * 255, M, (1536, 1024)) > 128
save(seamless(Image.open(os.path.join(SRC, "pineforest2_sky_gpt_1536x1024.png")).convert("RGBA")), "pineforest2_sky", 88)
# far
fs = np.asarray(Image.open(os.path.join(SRC, "pineforest2_layer_far_gpt_try1_1536x1024.png")).convert("RGB"))[FAR_LIFT:]
fs = np.concatenate([fs, np.repeat(fs[-1:], FAR_LIFT, 0)], 0)
far = np.asarray(key(Image.fromarray(fs))).astype(np.float32)
vis = (~is_mag(comp)) & (~near_mask); vis[:FAR_TOP] = False; vis[ROAD_TOP - 10:] = False
sky = (comp[..., 2] > comp[..., 0] + 60) & (comp[..., 2] > 180); vis &= ~sky
fv = far[..., 3] > 200; fv[:FAR_TOP] = False
src_lab = cv2.cvtColor(far[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
ref_lab = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
s_m, s_s = src_lab[fv].mean(0), src_lab[fv].std(0) + 1e-3; r_m, r_s = ref_lab[vis].mean(0), ref_lab[vis].std(0)
k = 0.5; t_m, t_s = s_m + (r_m - s_m) * k, s_s + (r_s - s_s) * k; print("far LAB", np.round(s_m, 1), "->", np.round(t_m, 1))
far[..., :3] = cv2.cvtColor(np.clip((src_lab - s_m) / s_s * t_s + t_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
save(seamless_cut(Image.fromarray(far.astype(np.uint8), "RGBA").crop((0, FAR_TOP, 1536, ROAD_TOP + 1))), "pineforest2_far")
# near: composite pixels through the shifted stencil
m = cv2.erode(near_mask.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.2); m[ROAD_TOP + 8:] = 0
ys = np.where(m.max(1) > 128)[0]; print("near rows", ys.min(), ys.max())
save(seamless_cut(Image.fromarray(np.dstack([comp.astype(np.uint8), m]), "RGBA").crop((0, 0, 1536, ROAD_TOP + 8))), "pineforest2_near")
# road
road = key(Image.open(os.path.join(SRC, "pineforest2_layer_road_gpt_try1_1536x1024.png")))
TOP, CUT, BAND = 714, 760, 46
band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "pineforest2_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); print("road solid top (median row)", tops[len(tops) // 2])
