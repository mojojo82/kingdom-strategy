"""Pack a new hero's keyed LARGE frames into one HERO_ANIMS grid sheet (same format as Roran / Kessa: rows idle + attack, fixed cells,
`wrap` columns per band, each logical row = 2 physical rows) and print the HERO_ANIMS entry to paste into test/index.html.
Input: art/originals/heroes/<hero>/large/{idle,attack}/NNNN.webp (made by build_hero_frames.py). Output: art/heroes/<hero>/<hero>_anim_<tag>.webp
Run: python3 dev/heroes/build_hero_anim.py juno"""
import glob, os, sys, json
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
HERO = sys.argv[1]
CFG = {"juno": {"tag": "v1", "stand_src": 580, "feet_y": 681, "stand": 110, "disp_stand": 27,
                # idle: 5 s loop at 8 fps (every 3rd video frame, last dropped so it loops); attack: the whole 5 s shot squeezed into ~1 s
                # (every 5th frame at 24 fps) so it fits the 1 s basic-attack rhythm
                "idle": {"step": 3, "fps": 8}, "attack": {"step": 5, "fps": 24}},
       # v1480 Bram (melee, ground): idle 5 s at 8 fps; run = one clean stride cycle (video frames 24-47, the clip repeats every 24 = 1 s) at
       # every 2nd frame, 12 fps; attack = video frames 10-81 (jab ~21, piston punch ~45, back in stance by ~80; attack v3 - v1 steam hit the edge, v2 zoomed in) at every 3rd frame, 24 fps = 1 s
       "bram": {"tag": "v1", "stand": 110, "disp_stand": 26, "per_clip": True,
                "idle": {"step": 3, "fps": 8}, "run": {"step": 2, "fps": 12, "from": 24, "to": 48}, "attack": {"step": 3, "fps": 24, "from": 10, "to": 82}},
       # v1499 Pip (ranged rider): idle 5 s at 8 fps; attack = raise + aim (video frames 9-41) then lower (64-87), every 3rd frame, 24 fps = ~0.85 s.
       # Frames 42-63 (H3 Max's own muzzle flash + smoke cloud, which runs off the frame edge) are left out; the flare round leaves on the jump (release)
       "pip": {"tag": "v1", "stand": 110, "disp_stand": 27, "per_clip": True,
               "idle": {"step": 3, "fps": 8}, "attack": {"fps": 24, "frames": list(range(9, 42, 3)) + [64, 66, 69, 72, 75, 78, 81, 84, 87]}},
       # v1502 Hanzo (melee): idle 5 s at 8 fps; run = one stride cycle (16 video frames = 0.67 s, frames 20-35) at 24 fps; attack = double slash (video 10-76, every 3rd);
       # attack2 = cross-slash + stab (video 18-90 every 3rd, skipping 53-56 where H3 Max drew a light streak to the frame edge);
       # skill = leap + throw (video 8-46 every 2nd: crouch, jump, wind-up, throw ~44) + landing (58-66), the arc/dust landing frames 48-56 left out
       "hanzo": {"tag": "v1", "stand": 90, "disp_stand": 24, "per_clip": True, "wrap": 14,
                 "idle": {"step": 3, "fps": 8}, "run": {"step": 1, "fps": 24, "from": 20, "to": 36},
                 "attack": {"fps": 24, "frames": list(range(10, 77, 3))},
                 "attack2": {"fps": 24, "frames": [i for i in range(18, 91, 3) if not 52 <= i <= 57]}},
       # the leap is tall, so it gets its own small sheet (one cell size for a jump would make the main sheet huge); idle = 1 frame (scale reference only)
       "hanzo_skill": {"hero": "hanzo", "tag": "v1", "stand": 90, "disp_stand": 24, "per_clip": True, "canvas": 3, "wrap": 13,
                 "idle": {"fps": 8, "frames": [0]}, "skill": {"fps": 24, "frames": list(range(8, 45, 2)) + list(range(58, 67, 2))}}}[HERO]
ROWS = [r for r in ("idle", "run", "attack", "attack2", "skill") if r in CFG]
HD_ = CFG.get("hero", HERO); L = os.path.join(ROOT, "art/originals/heroes", HD_, "large")
rows = {}
META = json.load(open(os.path.join(L, "meta.json"))) if CFG.get("per_clip") else None
for st in ROWS:
    fs = sorted(glob.glob(os.path.join(L, st, "*.webp")))
    c = CFG[st]
    if "frames" in c: sel = [fs[i] for i in c["frames"]]   # v1499: an explicit frame list (skips a stretch of the clip)
    else: fs = fs[c.get("from", 0):c.get("to", len(fs))]; sel = fs[::c["step"]]
    if st == "idle" and len(sel) > 1 and "from" not in c and "frames" not in c: sel = sel[:-1]
    ims = [Image.open(f).convert("RGBA") for f in sel]
    if META:   # every clip onto one doubled canvas at the idle clip's scale and feet point, so one cell / anchor fits all rows
        m, m0 = META[st], META["idle"]; sc = m0["stand"] / m["stand"]; W0, H0 = ims[0].size; out = []
        for im in ims:
            big = im.resize((round(W0 * sc), round(H0 * sc)), Image.LANCZOS) if abs(sc - 1) > 1e-3 else im
            CF = CFG.get("canvas", 2); canv = Image.new("RGBA", (round(W0 * CF), round(H0 * CF)), (0, 0, 0, 0))  # v1502: canvas factor (a high jump scaled up needs more room)
            canv.paste(big, (round(m0["feet_x"] + W0 * (CF - 1) / 2 - m["feet_x"] * sc), round(m0["feet_y"] + H0 * (CF - 1) / 2 - m["feet_y"] * sc))); out.append(canv)
        ims = out
    rows[st] = ims
first = rows["idle"][0]
if META:
    CF = CFG.get("canvas", 2); m0 = META["idle"]; W0, H0 = round(first.size[0] / CF), round(first.size[1] / CF)
    FX, FY = m0["feet_x"] + W0 * (CF - 1) / 2, m0["feet_y"] + H0 * (CF - 1) / 2; CFG["stand_src"] = m0["stand"]
else:
    al = np.asarray(first.getchannel("A"))[CFG["feet_y"] - 40:CFG["feet_y"]] > 128
    xs = np.nonzero(al.any(0))[0]; FX, FY = (xs.min() + xs.max()) / 2.0, CFG["feet_y"]
bb = None
for st in rows:
    for im in rows[st]:
        b = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
k = CFG["stand"] / CFG["stand_src"]
cw, ch = int(np.ceil((bb[2] - bb[0]) * k)) + 2, int(np.ceil((bb[3] - bb[1]) * k)) + 2
W = CFG.get("wrap") or max(1, int(np.ceil(max(len(r) for r in rows.values()) / 2)))
# v1502: each logical row starts at physical row 2*index (the game reads row[0] * 2 + floor(f / W)); a row longer than 2*W frames takes more
# physical rows, so the next row's index skips ahead (the game never reads past a row's own frames)
ridx, pr = {}, 0
for st in ROWS: ridx[st] = (pr + 1) // 2; pr = ridx[st] * 2 + int(np.ceil(len(rows[st]) / W))
assert W * cw <= 4096, "sheet wider than 4096"
assert pr * ch <= 4096, "sheet taller than 4096 (%d)" % (pr * ch)
sheet = Image.new("RGBA", (W * cw, pr * ch), (0, 0, 0, 0))
for st in ROWS:
    for f, im in enumerate(rows[st]):
        c = im.crop(bb).resize((cw - 2, ch - 2), Image.LANCZOS)
        sheet.paste(c, ((f % W) * cw + 1, (ridx[st] * 2 + f // W) * ch + 1))
out = os.path.join(ROOT, "art/heroes", HD_); os.makedirs(out, exist_ok=True)
fn = "%s_anim_%s.webp" % (HERO, CFG["tag"]); sheet.save(os.path.join(out, fn), "WEBP", quality=88, method=6)
ax, ay = round((FX - bb[0]) * k + 1, 2), round((FY - bb[1]) * k + 1, 2)
fps = {st: CFG[st]["fps"] for st in ROWS}; rws = {st: [ridx[st], len(rows[st])] for st in ROWS}
if "run" not in ROWS: fps["run"] = fps["idle"]; rws["run"] = rws["idle"]
entry = {"file": fn, "wrap": W, "cw": cw, "ch": ch, "ax": ax, "ay": ay, "fps": fps, "rows": rws,
         "dispH": round(ch * CFG["disp_stand"] / CFG["stand"], 2)}
print("sheet", sheet.size, os.path.getsize(os.path.join(out, fn)) // 1024, "KB"); print(json.dumps(entry))
