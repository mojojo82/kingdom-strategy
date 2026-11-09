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
                "idle": {"step": 3, "fps": 8}, "attack": {"step": 5, "fps": 24}}}[HERO]
L = os.path.join(ROOT, "art/originals/heroes", HERO, "large")
rows = {}
for st in ("idle", "attack"):
    fs = sorted(glob.glob(os.path.join(L, st, "*.webp")))
    sel = fs[::CFG[st]["step"]]
    if st == "idle" and len(sel) > 1: sel = sel[:-1]
    rows[st] = [Image.open(f).convert("RGBA") for f in sel]
first = rows["idle"][0]; al = np.asarray(first.getchannel("A"))[CFG["feet_y"] - 40:CFG["feet_y"]] > 128
xs = np.nonzero(al.any(0))[0]; FX, FY = (xs.min() + xs.max()) / 2.0, CFG["feet_y"]
bb = None
for st in rows:
    for im in rows[st]:
        b = im.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
k = CFG["stand"] / CFG["stand_src"]
cw, ch = int(np.ceil((bb[2] - bb[0]) * k)) + 2, int(np.ceil((bb[3] - bb[1]) * k)) + 2
W = max(1, int(np.ceil(max(len(r) for r in rows.values()) / 2)))
assert W * cw <= 4096, "sheet wider than 4096"
sheet = Image.new("RGBA", (W * cw, 4 * ch), (0, 0, 0, 0))
for r, st in enumerate(("idle", "attack")):
    for f, im in enumerate(rows[st]):
        c = im.crop(bb).resize((cw - 2, ch - 2), Image.LANCZOS)
        sheet.paste(c, ((f % W) * cw + 1, (r * 2 + f // W) * ch + 1))
out = os.path.join(ROOT, "art/heroes", HERO); os.makedirs(out, exist_ok=True)
fn = "%s_anim_%s.webp" % (HERO, CFG["tag"]); sheet.save(os.path.join(out, fn), "WEBP", quality=88, method=6)
ax, ay = round((FX - bb[0]) * k + 1, 2), round((FY - bb[1]) * k + 1, 2)
entry = {"file": fn, "wrap": W, "cw": cw, "ch": ch, "ax": ax, "ay": ay, "fps": {"idle": CFG["idle"]["fps"], "run": CFG["idle"]["fps"], "attack": CFG["attack"]["fps"]},
         "rows": {"idle": [0, len(rows["idle"])], "run": [0, len(rows["idle"])], "attack": [1, len(rows["attack"])]},
         "dispH": round(ch * CFG["disp_stand"] / CFG["stand"], 2)}
print("sheet", sheet.size, os.path.getsize(os.path.join(out, fn)) // 1024, "KB"); print(json.dumps(entry))
