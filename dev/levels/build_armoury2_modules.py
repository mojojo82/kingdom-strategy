"""Armoury 2 modules (Harley, 2 Nov / 9 Nov 2026): cut each GPT-filled module canvas back into a bay that snaps onto the base.
For every art/originals/backgrounds/armoury2_mod_<name>_gpt_1536x1024.png:
  1. find GPT's drift against the canvas over the kept parts (roof, pillars) and undo it
  2. colour-match GPT's picture to the canvas over the kept parts (Harley: every GPT layer colour-matched to the composite)
  3. take ONLY the white area from GPT (feathered a few px into the wall above, so the join is soft), and put everything else back
     from the original bay - roof, pillars and edges stay pixel-exact, so every module snaps onto the base and onto each other.
Writes art/originals/backgrounds/armoury2_built/armoury2_mod_<name>.png (1381 x 950, same as armoury2_wall.png) + a preview strip
base | module | base. Run: python3 dev/levels/build_armoury2_modules.py"""
import os, glob
import numpy as np, cv2
from PIL import Image
import json
ROOT = os.path.join(os.path.dirname(__file__), "..", ".."); SRC = os.path.join(ROOT, "art/originals/backgrounds"); FULL = os.path.join(SRC, "armoury2_built"); OUT = os.path.join(ROOT, "art/levels")
USE = {"forge": "forge", "weapons": "weapons", "windows": "windows", "door": "door", "passage": "passage"}   # game module -> which GPT option
CTX_L, HALF, WALL_TOP = 77, 50, 612          # same as make_armoury2_module_canvas.py
wall = np.asarray(Image.open(os.path.join(FULL, "armoury2_wall.png")).convert("RGB")); P, WH = wall.shape[1], wall.shape[0]
canvas = np.asarray(Image.open(os.path.join(SRC, "armoury2_module_canvas_1536x1024.png")).convert("RGB"))
X0, X1 = CTX_L + HALF, CTX_L + P - HALF
kept = np.ones(canvas.shape[:2], bool); kept[WALL_TOP:WH, X0:X1] = False
def gray(a): return cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32)
def lab(a): return cv2.cvtColor(np.ascontiguousarray(a), cv2.COLOR_RGB2LAB).astype(np.float32)
info = {}
Image.fromarray(wall).save(os.path.join(OUT, "armoury2_bay_plain.webp"), quality=90, method=6)
for path in sorted(glob.glob(os.path.join(SRC, "armoury2_mod_*_gpt_1536x1024.png"))):
    name = os.path.basename(path)[len("armoury2_mod_"):-len("_gpt_1536x1024.png")]
    g = np.asarray(Image.open(path).convert("RGB"))
    if g.shape[1] < 1536: g = np.concatenate([g, np.repeat(g[:, -1:], 1536 - g.shape[1], 1)], 1)   # GPT sometimes returns 1535 wide
    tpl = gray(canvas)[60:WALL_TOP - 20, 40:1496]                              # the roof
    res = cv2.matchTemplate(gray(g)[30:WALL_TOP + 10, 10:1526], tpl, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(res)
    dx, dy = loc[0] - 30, loc[1] - 30
    M = np.float32([[1, 0, -dx], [0, 1, -dy]]); g = cv2.warpAffine(g, M, (1536, 1024), borderMode=cv2.BORDER_REPLICATE)
    gi = g.astype(int); mag = ((np.minimum(gi[..., 0], gi[..., 2]) - gi[..., 1]) > 60) | ((gi[..., 0] > 150) & (gi[..., 2] > 150) & (gi[..., 1] < 110))
    mag = cv2.dilate(mag.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0; mag[~(~kept)] = False   # magenta = see-through opening (passage); only inside the white area
    keep_err = np.abs(g.astype(int) - canvas.astype(int))[kept].mean()
    lg, lc = lab(g), lab(canvas); s_m, s_s = lg[kept].mean(0), lg[kept].std(0) + 1e-3; r_m, r_s = lc[kept].mean(0), lc[kept].std(0)
    g = cv2.cvtColor(np.clip((lg - s_m) / s_s * r_s + r_m, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    left_white = (g[WALL_TOP:WH, X0:X1] > 245).all(-1).mean()
    print(f"{name}: roof match {mx:.3f}, drift dx {dx} dy {dy}, kept-part error {keep_err:.1f}, LAB {np.round(s_m,1)} -> {np.round(r_m,1)}, white left {100*left_white:.1f}%")
    bay = wall.astype(np.float32).copy()
    F = 8                                                                      # feather into the wall above the white area
    a = np.zeros((WH, P), np.float32); a[WALL_TOP:, HALF:P - HALF] = 1
    a[WALL_TOP - F:WALL_TOP, HALF:P - HALF] = np.linspace(0, 1, F, endpoint=False)[:, None]
    src = g[:WH, CTX_L:CTX_L + P].astype(np.float32)
    bay = bay * (1 - a[..., None]) + src * a[..., None]
    out = Image.fromarray(np.clip(bay, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    m = mag[:WH, CTX_L:CTX_L + P]
    if m.any():                                                                # the opening: see-through, the hall behind slides via `peek`
        al = np.asarray(out.getchannel("A")).copy(); al[m] = 0; out.putalpha(Image.fromarray(al))
        ys, xs = np.nonzero(m); print(f"  opening box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()} ({m.sum()} px)")
    out.save(os.path.join(FULL, f"armoury2_mod_{name}.png"))
    strip = Image.new("RGB", (P * 3, WH), (60, 120, 200)); strip.paste(Image.fromarray(wall), (0, 0)); strip.paste(out, (P, 0), out); strip.paste(Image.fromarray(wall), (2 * P, 0))
    strip.save(os.path.join(FULL, f"armoury2_mod_{name}_preview.png"))

    if name in USE.values():
        game = [k for k, v in USE.items() if v == name][0]
        out.save(os.path.join(OUT, f"armoury2_bay_{game}.webp"), quality=90, method=6, exact=True)
        d = {}
        if m.any(): d["open"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
        # glows: bright warm flames (forge coals, torches) inside the module's wall area
        o = np.asarray(out.convert("RGB")).astype(int)
        hot = (o[..., 0] > 250) & (o[..., 1] > 150) & (o[..., 2] < 110) & ((o[..., 0] - o[..., 2]) > 150)
        hot[:WALL_TOP] = False; hot[:, :HALF] = False; hot[:, P - HALF:] = False
        n, lb, st, cen = cv2.connectedComponentsWithStats(cv2.dilate(hot.astype(np.uint8), np.ones((15, 15), np.uint8)))
        d["glows"] = [[int(cen[i][0]), int(cen[i][1]), int(max(16, min(52, max(st[i][2], st[i][3]) // 2 + 10)))] for i in range(1, n) if hot[lb == i].sum() > 100]
        info[game] = d; print("  ->", game, d)
json.dump(info, open(os.path.join(FULL, "armoury2_modules.json"), "w"), indent=1)
