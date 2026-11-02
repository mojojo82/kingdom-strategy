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
EXT_PATH = os.path.join(SRC, "armoury_far_ext2_gpt_1536x1024.png"); EXT_DY, EXT_DX, JOIN = 305, 0, 80   # try 2 (fresh chat, pre-shifted canvas): copy of the far 32 px up, match 0.98
# Harley's far extend-up (2 Nov): the far moved down 193 / right 22 but partly redrawn (match 0.6: shields and banners moved), so only its
# new roof on top is used; from row JOIN of the old far down (the wall, the shields behind the racks, the hall through the arch) stays as it was.
if os.path.exists(EXT_PATH):
    ext = np.asarray(key(Image.open(EXT_PATH)))
    ext = np.concatenate([ext[:, EXT_DX:], np.repeat(ext[:, -1:], EXT_DX, 1)], 1)
    old = np.asarray(farI).astype(np.float32)
    # colour: match the roof to the (already matched) old far over the rows both show, not to the grey wall
    lab_e = cv2.cvtColor(ext[..., :3], cv2.COLOR_RGB2LAB).astype(np.float32); lab_o = cv2.cvtColor(old[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    ov_e = lab_e[EXT_DY:EXT_DY + 300][ext[EXT_DY:EXT_DY + 300, :, 3] > 200]; ov_o = lab_o[:300][old[:300, :, 3] > 200]
    e_m, e_s, o_m, o_s = ov_e.mean(0), ov_e.std(0) + 1e-3, ov_o.mean(0), ov_o.std(0); print("  roof LAB", np.round(e_m, 1), "->", np.round(o_m, 1))
    ext = ext.copy(); ext[..., :3] = cv2.cvtColor(np.clip((lab_e - e_m) / e_s * o_s + o_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    top = ext[:EXT_DY + JOIN].astype(np.float32)
    w = np.clip((np.arange(JOIN) - (JOIN - 40)) / 40.0, 0, 1)[:, None, None]       # 40-row blend into the old wall
    top[EXT_DY:] = top[EXT_DY:] * (1 - w) + old[:JOIN] * w
    farI = Image.fromarray(np.concatenate([top, old[JOIN:]], 0).astype(np.uint8), "RGBA"); print("far with roof", farI.size)
save(seamless_cut(farI), "armoury_far")
# ---- near ----
nk = np.asarray(key(Image.open(os.path.join(SRC, "armoury_layer_near_gpt_try1_1536x1024.png"))))
nv = nk[..., 3] > 200; nv[FLOOR_TOP:] = False
cm = near_mask.copy(); cm[FLOOR_TOP:] = False; cm[:, 1480:] = False
nk = match(nk, nv, cm); nk[FLOOR_TOP + 2:, :, 3] = 0
nearI = Image.fromarray(nk, "RGBA").crop((0, 0, 1536, FLOOR_TOP + 2))
NEXT_PATH = os.path.join(SRC, "armoury_near_ext2_gpt_1536x1024.png"); N_DY, N_JOIN = 305, 80   # Harley's near extend-up (fresh chat, pre-shifted
if os.path.exists(NEXT_PATH):                                                                # canvas): copy of the near 32 px up, match 0.89
    ext = np.asarray(key(Image.open(NEXT_PATH))).copy(); old = np.asarray(nearI).astype(np.float32)
    lab_e = cv2.cvtColor(ext[..., :3], cv2.COLOR_RGB2LAB).astype(np.float32); lab_o = cv2.cvtColor(old[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    me, mo = ext[N_DY:N_DY + 300, :, 3] > 200, old[:300, :, 3] > 200
    ov_e, ov_o = lab_e[N_DY:N_DY + 300][me], lab_o[:300][mo]
    e_m, e_s, o_m, o_s = ov_e.mean(0), ov_e.std(0) + 1e-3, ov_o.mean(0), ov_o.std(0); print("  near top LAB", np.round(e_m, 1), "->", np.round(o_m, 1))
    ext[..., :3] = cv2.cvtColor(np.clip((lab_e - e_m) / e_s * o_s + o_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    top = ext[:N_DY + N_JOIN].astype(np.float32)
    w = np.clip((np.arange(N_JOIN) - (N_JOIN - 40)) / 40.0, 0, 1)[:, None, None]
    top[N_DY:] = top[N_DY:] * (1 - w) + old[:N_JOIN] * w
    nearI = Image.fromarray(np.concatenate([top, old[N_JOIN:]], 0).astype(np.uint8), "RGBA"); print("near with top", nearI.size)
save(seamless_cut(nearI), "armoury_near")
# ---- scene (v1464, Harley: "stick with the original but add the extended part up top, not replacing the original graphics") ----
# ONE layer: the untouched composite (rows 0..FLOOR_TOP+1) with the extended roof (far+near extend-ups stacked, 305 rows) on top,
# blended into the composite's top over 40 rows. One layer = the arch keeps its view down the hall and nothing slides apart.
roof = Image.new("RGBA", farI.size); roof.alpha_composite(farI); roof.alpha_composite(nearI)
roof = np.asarray(roof).astype(np.float32)[:N_DY + 40]; roof[..., 3] = 255
cm4 = np.dstack([comp[:FLOOR_TOP + 2], np.full((FLOOR_TOP + 2, 1536), 255, np.uint8)]).astype(np.float32)
w = (np.arange(40) / 40.0)[:, None, None]
roof[N_DY:] = roof[N_DY:] * (1 - w) + cm4[:40] * w
scene = Image.fromarray(np.concatenate([roof[:N_DY + 40], cm4[40:]], 0).astype(np.uint8), "RGBA"); print("scene", scene.size)
# v1465 (Harley: "only the bg seen through the arch passageway should be moving"): cut the arch opening out of the scene; the hall behind it
# is its own small picture (GPT hall view, 2 Nov) that the game slides a little relative to the arch.
mg = is_mag(ng).astype(np.uint8); mg[670:] = 0
_, lab = cv2.connectedComponents(mg); hole = lab == lab[500, 1400]
for x in np.where(hole[669])[0]: hole[669:FLOOR_TOP + 2, x] = True      # the opening runs down to the floor
hole = cv2.dilate(hole.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & (np.arange(1024)[:, None] < FLOOR_TOP + 2)
ys, xs = np.where(hole); print("arch opening", xs.min(), xs.max(), ys.min(), ys.max())
# the composite cuts the arch's right pillar off at the image edge; GPT's near drew it whole (cols ~1495+) -> paste it in (colour-matched near)
pil = (nk[..., 3] > 200); pil[:, :1488] = False; pil[:240] = False; pil[FLOOR_TOP + 2:] = False
hole &= ~pil
sa = np.asarray(scene).copy(); sub = sa[N_DY:N_DY + FLOOR_TOP + 2]
sub[pil[:FLOOR_TOP + 2]] = nk[:FLOOR_TOP + 2][pil[:FLOOR_TOP + 2]]; sub[hole[:FLOOR_TOP + 2], 3] = 0
# v1466 (Harley: make the archway symmetrical): mirror the composite's left half of the arch (pillar, capital, stones) onto the right about
# the keystone (col AX). The picture gets wider (W2) so the mirrored pillar fits; above the arch the old wall/roof stays, and the extra
# columns past 1536 repeat the last 40 columns of wall/roof. The lantern hanging in front of the arch is put back on top.
AX, R0 = 1388, 505; W2 = 2 * AX - 1200
orig = sa.copy()
wide = np.zeros((sa.shape[0], W2, 4), np.uint8); wide[:, :1536] = sa
wide[:R0, 1536:] = sa[:R0, 1536 - (W2 - 1536):1536]                 # roof/wall above the arch: continue the last columns
for x in range(AX, W2):                                              # the arch from R0 down: mirror of the left half
    wide[R0:, x] = sa[R0:, 2 * AX - x]
for i in range(10):                                                  # soften the horizontal join at R0 in the wall
    t = (i + 0.5) / 10; r = R0 + i
    wide[r, AX:1536, :3] = (sa[r, AX:1536, :3] * (1 - t) + wide[r, AX:1536, :3] * t).astype(np.uint8)
# the left wall lantern (cols ~1172-1222) would be mirrored in half-cut at the right edge: there, keep continuing the wall instead
for x in range(2 * AX - 1224, W2): wide[515:645, x] = wide[515:645, x - 26]
# put the front lantern + its chain back: dark iron or glowing pixels from the original in a strip / box around them
L_ = cv2.cvtColor(orig[..., :3], cv2.COLOR_RGB2LAB)[..., 0].astype(int); o = orig.astype(int)
iron_or_glow = (L_ < 75) | ((o[..., 0] > 200) & (o[..., 1] > 140) & (o[..., 2] < 150))
keep = np.zeros(iron_or_glow.shape, bool); keep[R0:610, 1468:1482] = True; keep[595:690, 1450:1498] = True
inside = np.zeros(keep.shape, bool); inside[:, :1536] = wide[:, :1536, 3] == 0
keep &= iron_or_glow | (inside & (orig[..., 3] > 0))
keep = cv2.morphologyEx(keep.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool)
wide[:, :1536][keep] = orig[keep]
sa = wide; scene = Image.fromarray(sa, "RGBA"); print("scene (symmetrical arch)", scene.size, "lantern px", int(keep.sum()))
save(scene, "armoury_scene")   # full 1536 wrap: the whole pillar ends the picture, the wall starts the next copy
HALL_S = 0.5
hall = Image.open(os.path.join(SRC, "armoury_hall_view_gpt_1536x1024.png")).convert("RGBA")
hall = hall.resize((round(1536 * HALL_S), round(1024 * HALL_S)), Image.LANCZOS)
hm = np.zeros(hall.size[::-1], bool); hm[:] = True
hall = Image.fromarray(match(np.asarray(hall), hm, hole & ~(np.arange(1024)[:, None] > FLOOR_TOP - 2)), "RGBA")
save(hall, "armoury_hall")
print("hall placement: x", AX - hall.width // 2, "y", N_DY + FLOOR_TOP - hall.height, "arch centre x", AX)   # keep the arch + hall on the right whole
# ---- road ----
rk = np.asarray(key(Image.open(os.path.join(SRC, "armoury_layer_road_gpt_try1_1536x1024.png"))))
rv = rk[..., 3] > 200; rv[:FLOOR_TOP + 6] = False
cr = np.zeros(rv.shape, bool); cr[FLOOR_TOP + 6:] = True
rk = match(rk, rv, cr)
road = Image.fromarray(rk, "RGBA").crop((0, FLOOR_TOP - 4, 1536, 1024))
r2 = seamless(road); r2 = r2.resize((r2.width * 2, r2.height * 2), Image.NEAREST); save(r2, "armoury_road")
al = np.asarray(r2.getchannel("A")); tops = sorted(int(np.argmax(al[:, x] > 200)) for x in range(0, r2.width, 40)); print("road solid top (2x row)", tops[len(tops) // 2])
