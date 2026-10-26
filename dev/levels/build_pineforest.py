"""Pine forest level (chapter 12, the second valley road before the castle) - Harley's ChatGPT composite pineforest_v1 (27 Oct 2026).
  sky  = GPT sky, seamless
  far  = GPT far try 1: the keep came out ~1.5x bigger than the composite - KEPT (closer to the castle, and shrinking would make the far layer
         narrower than a phone screen = two keeps on screen); lifted 40 px; colour-matched 50%
  near = composite pixels through GPT's near split (lines up within 2 px; the middle gap is see-through for the keep)
  road = GPT road try 1 - Harley asked for a different underground (not roots and boulders): layered soil, clay, slate, fungus threads;
         path band squashed to the stream / desert depth, 2x crisp
Writes art/levels/pineforest_*.webp (+ PNGs in art/originals/backgrounds/pineforest_built/). Run: python3 dev/levels/build_pineforest.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "pineforest_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 740; FAR_LIFT = 40; FAR_TOP = 200
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
comp = np.asarray(Image.open(os.path.join(SRC, "pineforest_v1_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
nearg = np.asarray(Image.open(os.path.join(SRC, "pineforest_layer_near_gpt_try1_1536x1024.png")).convert("RGB"))
near_mask = ~is_mag(nearg)
save(seamless(Image.open(os.path.join(SRC, "pineforest_sky_gpt_1536x1024.png")).convert("RGBA")), "pineforest_sky", 88)
# far
fs = np.asarray(Image.open(os.path.join(SRC, "pineforest_layer_far_gpt_try1_1536x1024.png")).convert("RGB"))[FAR_LIFT:]
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
save(seamless_cut(Image.fromarray(far.astype(np.uint8), "RGBA").crop((0, FAR_TOP, 1536, ROAD_TOP + 1))), "pineforest_far")
# near: Harley's GPT extend-up pass (v1455) - the old near sits 235 rows down in it. Its lower part matches the old near (mean diff ~17) but the
# trunks above were redrawn a little, so a stitched join would show - the WHOLE extension is used as the near layer (its own trees run to the top).
EXT = 235
nx = np.asarray(key(Image.open(os.path.join(SRC, "pineforest_near_ext_gpt_1536x1024.png")))).astype(np.float32)
# v1456 (Harley: "did you prompt it to make it high contrast?") - GPT's near layers come out more saturated and contrasty than the composite
# (sat 0.64 vs 0.53). Match the extension's colours to the composite's near pixels (LAB mean/std, full match).
nv = nx[..., 3] > 200
e_lab = cv2.cvtColor(nx[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
cm = near_mask.copy(); cm[ROAD_TOP:] = False
e_m, e_s = e_lab[nv].mean(0), e_lab[nv].std(0) + 1e-3; c_m, c_s = ref_lab[cm].mean(0), ref_lab[cm].std(0)
print("near LAB", np.round(e_m, 1), np.round(e_s, 1), "->", np.round(c_m, 1), np.round(c_s, 1))
nx[..., :3] = cv2.cvtColor(np.clip((e_lab - e_m) / e_s * c_s + c_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
save(seamless_cut(Image.fromarray(nx.astype(np.uint8), "RGBA").crop((0, 0, 1536, EXT + ROAD_TOP + 8))), "pineforest_near")
# road: path band 700..764 -> 46 rows, 2x
road = key(Image.open(os.path.join(SRC, "pineforest_layer_road_gpt_try1_1536x1024.png")))
TOP, CUT, BAND = 698, 766, 46
band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "pineforest_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); print("road solid top (median row)", tops[len(tops) // 2])
