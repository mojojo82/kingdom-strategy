"""Desert ruins level (chapter 8) - Harley's ChatGPT composite art/originals/backgrounds/desert_v1_composite_1536x1024.png (26 Oct 2026).
Layers (same recipe as the snow pass, dev/levels/build_snowpass.py):
  sky  = GPT sky on its own (desert_sky_gpt), seamless
  far  = GPT far split, keyed, colour-matched back to the composite (GPT made the dunes ~2x more saturated), cut at the road line, seamless
  near = GPT near split used ONLY as a stencil (it lines up 0,0 with the composite) - the pixels are cut straight out of the composite
  road = GPT road split try 2, sand band squashed to the snow pass depth (village eye level), 2x crisp
Writes art/levels/desert_{sky,far,near,road}.webp (+ PNGs in art/originals/backgrounds/desert_built/).
Run: python3 dev/levels/build_desert.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "desert_built"); os.makedirs(FULL, exist_ok=True)
ROAD_TOP = 786          # composite row where the near layer meets the sand band
FAR_TOP = 250           # top of the far layer's content (pyramid apex ~285)

def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)

def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))

comp = np.asarray(Image.open(os.path.join(SRC, "desert_v1_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
nearg = np.asarray(Image.open(os.path.join(SRC, "desert_layer_near_gpt_try1_1536x1024.png")).convert("RGB"))
near_mask = ~is_mag(nearg)

# ---- sky ----
save(seamless(Image.open(os.path.join(SRC, "desert_sky_gpt_1536x1024.png")).convert("RGBA")), "desert_sky", 88)

# ---- far: key, then match its colours to the composite where the composite shows the far layer ----
far = key(Image.open(os.path.join(SRC, "desert_layer_far_gpt_try1_1536x1024.png")))
fa = np.asarray(far).astype(np.float32)
farg = np.asarray(Image.open(os.path.join(SRC, "desert_layer_far_gpt_try1_1536x1024.png")).convert("RGB"))
vis = (~is_mag(farg)) & (~near_mask); vis[:FAR_TOP] = False; vis[ROAD_TOP - 20:] = False
vis = cv2.erode(vis.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)   # stay clear of edges
src_lab = cv2.cvtColor(fa[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
ref_lab = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
s_m, s_s = src_lab[vis].mean(0), src_lab[vis].std(0) + 1e-3; r_m, r_s = ref_lab[vis].mean(0), ref_lab[vis].std(0)
print("far colour match (LAB mean/std) src", np.round(s_m, 1), np.round(s_s, 1), "-> composite", np.round(r_m, 1), np.round(r_s, 1), "pixels", int(vis.sum()))
out_lab = np.clip((src_lab - s_m) / s_s * r_s + r_m, 0, 255).astype(np.uint8)
fa[..., :3] = cv2.cvtColor(out_lab, cv2.COLOR_LAB2RGB)
far = Image.fromarray(fa.astype(np.uint8), "RGBA")
save(seamless_cut(far.crop((0, FAR_TOP, far.width, ROAD_TOP + 1))), "desert_far")

# ---- near: composite pixels through GPT's near stencil (0,0 aligned) ----
m = cv2.erode(near_mask.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.2)
m[ROAD_TOP + 8:] = 0
near = Image.fromarray(np.dstack([comp.astype(np.uint8), m]), "RGBA")
ys = np.where(m.max(1) > 128)[0]; print("near rows", ys.min(), ys.max())
save(seamless_cut(near.crop((0, 400, near.width, ROAD_TOP + 8))), "desert_near")

# ---- road: sand band 734..797 (front-edge stones start ~797) squashed to the snow pass depth, 2x crisp ----
road = key(Image.open(os.path.join(SRC, "desert_layer_road_gpt_try2_1536x1024.png")))
TOP, CUT, BAND = 724, 797, 43
band = road.crop((0, TOP, road.width, CUT)).resize((road.width, BAND), Image.LANCZOS)
face = road.crop((0, CUT, road.width, road.height))
r2 = Image.new("RGBA", (road.width, BAND + face.height)); r2.paste(band, (0, 0)); r2.paste(face, (0, BAND))
r2 = seamless(r2); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST)
save(r2, "desert_road")
a = r2.getchannel("A"); tops = sorted(next((y for y in range(r2.height) if a.getpixel((x, y)) > 200), 0) for x in range(0, r2.width, 40))
print("road solid top (median row)", tops[len(tops) // 2])
