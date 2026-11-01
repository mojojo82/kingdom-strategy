"""Armoury & forge (chapter 14, the middle castle interior) - Harley's ChatGPT composite armoury_v1 (2 Nov 2026; he picked it over the Dark Library).
Same rules as the Great Hall: the floor is NOT squashed, heroes/enemies never move - the floor is used at full depth and the hall placed so its
racks/forge sit on the floor's back edge. Harley (2 Nov): every GPT layer used directly is colour-matched to the composite.
  far  = GPT far try 1, drawn ~101 px lower than the composite -> shifted up 101; colour-matched to the composite where the composite shows wall
  near = GPT near try 1 (lines up 0,0; the archway on the right redrawn COMPLETE with its right pillar, which the composite cuts off) -
         used whole and colour-matched, so the redrawn pillar matches the rest
  road = GPT road try 1 (lines up 0,0, back edge row 685), full depth, colour-matched, 2x crisp
Optional extend-up passes (armoury_far_ext / armoury_near_ext + their row offsets) are stacked on top when present.
Writes art/levels/armoury_*.webp (+ PNGs in art/originals/backgrounds/armoury_built/). Run: python3 dev/levels/build_armoury.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
from build_snowpass import seamless_cut
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
OUT = os.path.join(ROOT, "art/levels"); FULL = os.path.join(SRC, "armoury_built"); os.makedirs(FULL, exist_ok=True)
FLOOR_TOP = 685; FAR_SHIFT = 101
FAR_EXT = int(os.environ.get("FAR_EXT", "0")); NEAR_EXT = int(os.environ.get("NEAR_EXT", "0"))
def save(im, name, q=90):
    im.save(os.path.join(FULL, name + ".png")); im.save(os.path.join(OUT, name + ".webp"), quality=q, method=6); print(name, im.size)
def is_mag(a):
    a = a.astype(int); return ((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) > 60) | ((a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 110))
comp = np.asarray(Image.open(os.path.join(SRC, "armoury_v1_composite_1536x1024.png")).convert("RGB"))
c_lab = cv2.cvtColor(comp, cv2.COLOR_RGB2LAB).astype(np.float32)
def match(rgba, src_mask, ref_mask, k=1.0):
    a = rgba.astype(np.float32); lab = cv2.cvtColor(a[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    s_m, s_s = lab[src_mask].mean(0), lab[src_mask].std(0) + 1e-3; r_m, r_s = c_lab[ref_mask].mean(0), c_lab[ref_mask].std(0)
    t_m, t_s = s_m + (r_m - s_m) * k, s_s + (r_s - s_s) * k
    print("  LAB", np.round(s_m, 1), np.round(s_s, 1), "->", np.round(t_m, 1), np.round(t_s, 1))
    a[..., :3] = cv2.cvtColor(np.clip((lab - s_m) / s_s * t_s + t_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB); return a.astype(np.uint8)
ng = np.asarray(Image.open(os.path.join(SRC, "armoury_layer_near_gpt_try1_1536x1024.png")).convert("RGB")); near_mask = ~is_mag(ng)
# ---- far ----
fs = np.asarray(Image.open(os.path.join(SRC, "armoury_layer_far_gpt_try1_1536x1024.png")).convert("RGB"))[FAR_SHIFT:]
fs = np.concatenate([fs, np.repeat(fs[-1:], FAR_SHIFT, 0)], 0)
far = np.asarray(key(Image.fromarray(fs)))
fv = far[..., 3] > 200; fv[FLOOR_TOP:] = False
ref = ~near_mask; ref[FLOOR_TOP - 5:] = False; ref[:, 1200:] = False          # the composite's visible back wall (not the bright hall through the arch)
fsrc = fv.copy(); fsrc[:, 1200:] = False
far = match(far, fsrc, ref)
farI = Image.fromarray(far, "RGBA").crop((0, 0, 1536, FLOOR_TOP + 2))
if FAR_EXT:
    ext = np.asarray(Image.open(os.path.join(SRC, "armoury_far_ext_gpt_1536x1024.png")).convert("RGBA"))
    ext = match(ext, np.ones(ext.shape[:2], bool) & (np.arange(1024)[:, None] < FAR_EXT + 300) & (np.arange(1536)[None] < 1200), ref)
    farI = Image.fromarray(np.concatenate([ext[:FAR_EXT], np.asarray(farI)], 0), "RGBA")
save(seamless_cut(farI), "armoury_far")
# ---- near ----
nk = np.asarray(key(Image.open(os.path.join(SRC, "armoury_layer_near_gpt_try1_1536x1024.png"))))
nv = nk[..., 3] > 200; nv[FLOOR_TOP:] = False
cm = near_mask.copy(); cm[FLOOR_TOP:] = False; cm[:, 1480:] = False
nk = match(nk, nv, cm); nk[FLOOR_TOP + 2:, :, 3] = 0
nearI = Image.fromarray(nk, "RGBA").crop((0, 0, 1536, FLOOR_TOP + 2))
if NEAR_EXT:
    ext = np.asarray(key(Image.open(os.path.join(SRC, "armoury_near_ext_gpt_1536x1024.png"))))
    ev = ext[..., 3] > 200; ev[NEAR_EXT + FLOOR_TOP:] = False
    ext = match(ext, ev, cm)
    nearI = Image.fromarray(np.concatenate([ext[:NEAR_EXT], np.asarray(nearI)], 0), "RGBA")
save(seamless_cut(nearI), "armoury_near")
# ---- road ----
rk = np.asarray(key(Image.open(os.path.join(SRC, "armoury_layer_road_gpt_try1_1536x1024.png"))))
rv = rk[..., 3] > 200; rv[:FLOOR_TOP + 6] = False
cr = np.zeros(rv.shape, bool); cr[FLOOR_TOP + 6:] = True
rk = match(rk, rv, cr)
road = Image.fromarray(rk, "RGBA").crop((0, FLOOR_TOP - 4, 1536, 1024))
r2 = seamless(road); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "armoury_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); print("road solid top (2x row)", tops[len(tops) // 2])
