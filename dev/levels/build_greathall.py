"""Great Hall (chapter 13, first of the three castle interior levels) - Harley's ChatGPT composite greathall_v1 (2 Nov 2026).
Harley: don't squash the floor and never move the heroes/enemies - the floor layer is used at its FULL depth and placed so the walking line
is on the red carpet; the near/far are placed so the pillar bases sit on the floor's back edge.
  far   = GPT far try 1 (fills the whole wall; bottom faded into magenta - cut at the floor line), keyed, seamless
  near  = composite pixels through GPT's near split (lines up 0,0)
  road  = GPT road try 1 (lines up with the composite: back edge row 680, carpet 713..751), NOT squashed, 2x crisp
Optional extend-up passes (greathall_far_ext / greathall_near_ext) are stacked on top when present.
Writes art/levels/greathall_*.webp (+ PNGs in art/originals/backgrounds/greathall_built/). Run: python3 dev/levels/build_greathall.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "greathall_built"); os.makedirs(FULL, exist_ok=True)
FLOOR_TOP = 680
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
comp = np.asarray(Image.open(os.path.join(SRC, "greathall_v1_composite_1536x1024.png")).convert("RGB")).astype(np.float32)
# v1459: Harley's extend-up passes. far_ext = the old far moved down 318 px (template match 0.98, scale 1) - used whole, cut at the floor line.
# near_ext = the old near moved down 276 px but partly redrawn (match 0.56: its arches don't line up with the old near's top, so a stitched join
# would show) - used whole, colour-matched (LAB) to the composite's near pixels. Floor line: far row 998, near row 956.
FAR_EXT, NEAR_EXT = 318, 276
far = Image.open(os.path.join(SRC, "greathall_far_ext_gpt_1536x1024.png")).convert("RGBA").crop((0, 0, 1536, FAR_EXT + FLOOR_TOP + 2))
save(seamless_cut(far), "greathall_far")
ng = np.asarray(Image.open(os.path.join(SRC, "greathall_layer_near_gpt_try1_1536x1024.png")).convert("RGB"))
cm = (~is_mag(ng)); cm[FLOOR_TOP:] = False
nx = np.asarray(key(Image.open(os.path.join(SRC, "greathall_near_ext_gpt_1536x1024.png")))).astype(np.float32)
nv = nx[..., 3] > 200
e_lab = cv2.cvtColor(nx[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
r_lab = cv2.cvtColor(comp.astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
e_m, e_s = e_lab[nv].mean(0), e_lab[nv].std(0) + 1e-3; c_m, c_s = r_lab[cm].mean(0), r_lab[cm].std(0)
print("near LAB", np.round(e_m, 1), "->", np.round(c_m, 1))
nx[..., :3] = cv2.cvtColor(np.clip((e_lab - e_m) / e_s * c_s + c_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
nx[NEAR_EXT + FLOOR_TOP + 2:, :, 3] = 0
save(seamless_cut(Image.fromarray(nx.astype(np.uint8), "RGBA").crop((0, 0, 1536, NEAR_EXT + FLOOR_TOP + 2))), "greathall_near")
# road: full depth, 2x
road = key(Image.open(os.path.join(SRC, "greathall_layer_road_gpt_try1_1536x1024.png"))).crop((0, FLOOR_TOP - 4, 1536, 1024))
r2 = seamless(road); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "greathall_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); print("road solid top (2x row)", tops[len(tops) // 2], "carpet centre (2x row)", (732 - (FLOOR_TOP - 4)) * 2)
