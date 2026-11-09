"""Armoury 2 (chapter 14, modular rebuild, Harley 2 Nov / 9 Nov 2026) - the PLAIN looping base.
Sources (art/originals/backgrounds):
  armoury2_base_bright_gpt  = THE composite (brightness pass of armoury2_base_composite, same chat). Source of truth for colour.
  armoury2_base_ext_gpt     = extend-up pass (fresh chat, canvas = base pushed down EXT_DY with white on top). Its existing part came back at
                              dx -1 / dy 0 but partly redrawn (match 0.85), so only its NEW roof on top is used; from row JOIN of the base down
                              everything is the base itself. The roof is colour-matched to the base over the rows both show.
  armoury2_layer_road_gpt   = GPT road on magenta (same chat as the base; lines up 0,0, top row ~643). Full depth, colour-matched to the base floor.
Loop (Harley's rule: a SOLID piece at the join, no blending on the wall): one repeat = left pillar centre (PL) -> right pillar centre (PR).
The right pillar's left half is replaced by a solid copy of the LEFT pillar's left half, so every join shows the whole left pillar.
Only the roof above the pillar caps gets a short cross-fade at the hidden cut (the two trusses differ by a few px).
Modules (forge, racks, windows, door, passage) will be widen canvases cut from this repeat - see PROMPTS.md.
Writes art/originals/backgrounds/armoury2_built/*.png (+ a 3x tiled preview). Not wired into the game yet. Run: python3 dev/levels/build_armoury2.py"""
import os, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from build_graveyard import key, seamless
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds")
FULL = os.path.join(SRC, "armoury2_built"); os.makedirs(FULL, exist_ok=True)
EXT_DY, EXT_DX, JOIN = 305, 1, 80           # canvas push-down; ext drew the old part 1 px left; rows of the base the roof blends into
FLOOR_TOP = 645                             # base row where the road layer starts (road solid top 642-643)
PL, PR, HALF = 75, 1456, 50                 # pillar centres (left, right) and half-width
CAP_ROW = 545                               # (in the extended image) top of the pillar caps: above = roof, below = wall
def lab(a): return cv2.cvtColor(np.ascontiguousarray(a[..., :3]).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
def transfer(rgb, src_px, ref_px):
    s_m, s_s = src_px.mean(0), src_px.std(0) + 1e-3; r_m, r_s = ref_px.mean(0), ref_px.std(0)
    print("  LAB", np.round(s_m, 1), np.round(s_s, 1), "->", np.round(r_m, 1), np.round(r_s, 1))
    return cv2.cvtColor(np.clip((lab(rgb) - s_m) / s_s * r_s + r_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)

base = np.asarray(Image.open(os.path.join(SRC, "armoury2_base_bright_gpt_1536x1024.png")).convert("RGB"))
ext = np.asarray(Image.open(os.path.join(SRC, "armoury2_base_ext_gpt_1536x1024.png")).convert("RGB"))
ext = np.concatenate([np.repeat(ext[:, :1], EXT_DX, 1), ext[:, :-EXT_DX]], 1) if EXT_DX else ext   # undo the 1 px drift
# ---- wall: new roof (colour-matched over the overlap) + the base ----
print("roof colour")
ov = slice(EXT_DY, EXT_DY + 240)                                              # rows both show (the base's own roof)
ext_m = transfer(ext, lab(ext[ov]).reshape(-1, 3), lab(base[:240]).reshape(-1, 3))
top = ext_m[:EXT_DY + JOIN].astype(np.float32); old = base.astype(np.float32)
w = np.clip((np.arange(JOIN) - (JOIN - 40)) / 40.0, 0, 1)[:, None, None]     # 40-row blend into the base's roof
top[EXT_DY:] = top[EXT_DY:] * (1 - w) + old[:JOIN] * w
wall = np.concatenate([top, old[JOIN:FLOOR_TOP]], 0)                          # height EXT_DY + FLOOR_TOP
print("wall", wall.shape)
# ---- loop: PL -> PR, right pillar's left half = solid copy of the left pillar's left half ----
P = PR - PL
rep = wall[:, PL:PR].copy()
piece = wall[:, PL - HALF:PL]                                                 # left pillar's left half (+ roof above it)
cut = P - HALF; cap = CAP_ROW
rep[cap:, cut:] = piece[cap:]                                                 # wall rows: hard cut on the pillar's outer edge
B = 24                                                                        # roof rows: short cross-fade so the truss joins
for i in range(HALF):
    t = np.clip((i + 0.5) / B, 0, 1)
    rep[:cap, cut + i] = rep[:cap, cut + i] * (1 - t) + piece[:cap, i] * t
print("repeat width", P)
wallI = Image.fromarray(np.clip(rep, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
wallI.save(os.path.join(FULL, "armoury2_wall.png")); print("armoury2_wall", wallI.size)
# ---- road: colour-matched to the base floor, own seam ----
print("road colour")
rk = np.asarray(key(Image.open(os.path.join(SRC, "armoury2_layer_road_gpt_1536x1024.png")))).copy()
solid = rk[..., 3] > 200; solid[:FLOOR_TOP] = False
rk[..., :3] = transfer(rk, lab(rk)[solid], lab(base)[solid])
road = Image.fromarray(rk, "RGBA").crop((0, FLOOR_TOP - 4, 1536, 1024))
road = seamless(road); road.save(os.path.join(FULL, "armoury2_road.png")); print("armoury2_road", road.size)
# ---- preview: wall x3 with the road under it ----
W3 = P * 3; H = wallI.height + road.height - 4
pv = Image.new("RGBA", (W3, H), (0, 0, 0, 255))
for k in range(3): pv.paste(wallI, (k * P, 0))
x = 0
while x < W3: pv.alpha_composite(road, (x, EXT_DY + FLOOR_TOP - 4)); x += road.width
pv.convert("RGB").save(os.path.join(FULL, "armoury2_preview_x3.png")); print("preview", pv.size)
