"""Castle gate level (chapter 10, first of the three castle levels) - Harley's ChatGPT composite castlegate_v2 (26 Oct 2026, the evil castle in
bright sun; v1 was a friendly castle, a scene edit then turned it into a village, so v2 is a fresh chat). Same recipe as the desert:
  sky  = GPT sky, seamless
  far  = GPT far try 1 - GPT redrew the valley (waterfalls, bridges) and put it ~130 px lower than the composite (keep spire tip row 215 vs 85),
         so it is moved up 130 px; colour-matched to the composite in LAB; cut at the road line, seamless
  near = composite pixels cut through GPT's near split (lines up 0,0; the gateway is a see-through hole)
  road = GPT road try 1, flagstone band squashed to the desert / snow pass depth, 2x crisp
Writes art/levels/castlegate_{sky,far,near,road}.webp (+ PNGs in art/originals/backgrounds/castlegate_built/).
Run: python3 dev/levels/build_castlegate.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "castlegate_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 779; FAR_SHIFT = 130; FAR_TOP = 50; NEAR_TOP = 40
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
comp = np.asarray(Image.open(os.path.join(SRC, "castlegate_v2_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
nearg = np.asarray(Image.open(os.path.join(SRC, "castlegate_layer_near_gpt_try1_1536x1024.png")).convert("RGB"))
near_mask = ~is_mag(nearg)

save(seamless(Image.open(os.path.join(SRC, "castlegate_sky_gpt_1536x1024.png")).convert("RGBA")), "castlegate_sky", 88)

# ---- far: move up, key, colour-match where the composite shows the far layer ----
farsrc = Image.open(os.path.join(SRC, "castlegate_layer_far_gpt_try1_1536x1024.png")).convert("RGB")
fs = np.asarray(farsrc)[FAR_SHIFT:FAR_SHIFT + 1024]
fs = np.concatenate([fs, np.repeat(fs[-1:], 1024 - fs.shape[0], 0)], 0)          # (never shown: below the road)
far = key(Image.fromarray(fs.astype(np.uint8)))
fa = np.asarray(far).astype(np.float32)
vis = (~is_mag(fs)) & (~near_mask); vis[:FAR_TOP] = False; vis[ROAD_TOP - 10:] = False
vis = cv2.erode(vis.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
src_lab = cv2.cvtColor(fa[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
ref_lab = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
s_m, s_s = src_lab[vis].mean(0), src_lab[vis].std(0) + 1e-3; r_m, r_s = ref_lab[vis].mean(0), ref_lab[vis].std(0)
k = 0.7   # match 70% of the way - the far is a redraw, so a full match would over-correct
t_m, t_s = s_m + (r_m - s_m) * k, s_s + (r_s - s_s) * k
print("far LAB", np.round(s_m, 1), "->", np.round(t_m, 1), "pixels", int(vis.sum()))
fa[..., :3] = cv2.cvtColor(np.clip((src_lab - s_m) / s_s * t_s + t_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
far = Image.fromarray(fa.astype(np.uint8), "RGBA")
save(seamless_cut(far.crop((0, FAR_TOP, far.width, ROAD_TOP + 1))), "castlegate_far")

# ---- near: composite pixels through GPT's near stencil ----
m = cv2.erode(near_mask.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.2); m[ROAD_TOP + 8:] = 0
near = Image.fromarray(np.dstack([comp.astype(np.uint8), m]), "RGBA")
save(seamless_cut(near.crop((0, NEAR_TOP, near.width, ROAD_TOP + 8))), "castlegate_near")

# ---- road: flagstone band 707..752 (edge stones start ~752) -> desert depth, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "castlegate_layer_road_gpt_try1_1536x1024.png")))
TOP, CUT, BAND = 697, 752, 43
band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "castlegate_road")
a = r2.getchannel("A"); tops = sorted(next((y for y in range(r2.height) if a.getpixel((x, y)) > 200), 0) for x in range(0, r2.width, 40))
print("road solid top (median row)", tops[len(tops) // 2])
