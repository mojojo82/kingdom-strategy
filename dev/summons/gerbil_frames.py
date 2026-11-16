"""Death Gerbil animation frames (v1672, Harley 17 Nov 2026).
Keys the four H3 Max clips (flat magenta) in art/originals/summons/gerbil/clips/, picks the frames for each animation and writes:
  - LARGE keep-set (every picked frame, full video size, WebP) in art/originals/summons/gerbil/large/<anim>/
  - the game sheet art/summons/gerbil/gerbil_anim_v1.webp + printed GERBIL_ANIM values
Slime is see-through, so unlike the hero key the semi-transparent edge pixels stay green (no grey-out); magenta is un-mixed and despilled.
Run: python3 dev/summons/gerbil_frames.py"""
import json, os, subprocess
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SRC = os.path.join(ROOT, "art/originals/summons/gerbil/clips"); LARGE = os.path.join(ROOT, "art/originals/summons/gerbil/large"); OUT = os.path.join(ROOT, "art/summons/gerbil")
W, H = 1152, 768

def frames(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(SRC, name), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)

def key(a):
    a = a.astype(np.float32); M = np.median(a[:30].reshape(-1, 3), 0)
    d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]; dm = min(M[0], M[2]) - M[1]
    al = np.clip(1 - (d - 20) / (dm * 0.8 - 20), 0, 1)
    c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    spill = (r > g) & (b > g)                       # leftover magenta tint on the edge: pull red/blue down to the green level
    lim = np.minimum(np.minimum(r, b), g)
    c[..., 0] = np.where(spill, np.minimum(r, g * 0.9), r); c[..., 2] = np.where(spill, np.minimum(b, lim * 0.6), b)
    al[al < 0.04] = 0
    return np.dstack([c, al * 255]).astype(np.uint8)

def mask(k): return k[..., 3] > 128

clips = {n: frames("gerbil_%s_v1.mp4" % n) for n in ["idle", "run", "bite", "death"]}
K = {n: None for n in clips}

# --- idle: the longest stretch from the start that loops back closest to frame 0 (1.5-4 s), played at 12 fps (every 2nd frame)
def mdiff(a, b): return np.mean(a != b)
def pick_idle(F):
    m0 = mask(key(F[0])); best = None
    for L in range(36, min(len(F) - 1, 96), 2):
        dd = mdiff(m0, mask(key(F[L])))
        if best is None or dd < best[0]: best = (dd, L)
    return list(range(0, best[1], 2)), best
idle_idx, idle_best = pick_idle(clips["idle"])

# --- run: stride period by mask matching, in the steady middle of the clip; all its frames (24 fps source)
RF = clips["run"]; RM = [mask(key(RF[i])) for i in range(len(RF))]
def pick_run():
    best = None
    for s in range(30, 90, 2):
        for P in range(6, 26):
            if s + P >= len(RM): continue
            dd = mdiff(RM[s], RM[s + P])
            if best is None or dd < best[0]: best = (dd, s, P)
    return best
run_best = pick_run(); run_idx = list(range(run_best[1], run_best[1] + run_best[2]))
# ground speed: how far the feet push back per frame while in contact (bottom strip, shift that best overlaps the next frame)
def feet_speed(idx):
    sh = []
    for i in idx:
        a, b = RM[i], RM[i + 1]; ys = np.nonzero(a.any(1))[0]; y1 = ys.max(); strip_a = a[y1 - 18:y1 + 1]; strip_b = b[y1 - 18:y1 + 1]
        best = None
        for s in range(-160, 8):
            ov = np.logical_and(np.roll(strip_a, s, 1), strip_b).sum()
            if best is None or ov > best[0]: best = (ov, s)
        sh.append(-best[1])
    return float(np.median(sh)), sh
run_speed_src, run_shifts = feet_speed(run_idx)   # source px per source frame (24 fps)

# --- bite: from just before the head starts moving forward until it is back (front edge x), played at 24 fps
BF = clips["bite"]; front = []
for i in range(len(BF)):
    xs = np.nonzero(mask(key(BF[i])).any(0))[0]; front.append(xs.max() if len(xs) else 0)
front = np.array(front, float); f0 = front[:6].mean(); moving = np.nonzero(front > f0 + 6)[0]
b_start = max(0, moving[0] - 2); b_end = b_start + 2
while b_end < len(front) - 1 and (front[b_end] > f0 + 3 or b_end - b_start < 8): b_end += 1
bite_idx = list(range(b_start, min(len(front), b_end + 2)))[:14]; bite_peak = int(np.argmax(front[b_start:b_end + 1])) + 0

# --- death: from the slump (height drops under 85% of standing) to when the puddle stops changing, 12 fps
DF = clips["death"]; hts = []
for i in range(len(DF)):
    ys = np.nonzero(mask(key(DF[i])).any(1))[0]; hts.append(ys.max() - ys.min() if len(ys) else 0)
hts = np.array(hts, float); h0 = hts[:6].mean(); slump = int(np.nonzero(hts < h0 * 0.85)[0][0])
d_start = max(0, slump - 6); settle = len(hts) - 1
for i in range(slump, len(hts) - 12):
    if abs(hts[i + 12] - hts[i]) < 2: settle = i + 12; break
death_idx = list(range(d_start, min(len(DF), settle + 1), 2))[3:]   # skip the short shiver at the start

PICK = {"idle": (clips["idle"], idle_idx, 12), "run": (RF, run_idx, 24), "bite": (BF, bite_idx, 24), "death": (DF, death_idx, 12)}
# feet line + scale from the idle frame 0 (every clip shares the start frame)
k0 = key(clips["idle"][0]); m0 = mask(k0); ys = np.nonzero(m0.any(1))[0]; FEET = int(ys.max()); TOP = int(ys.min())
xs = np.nonzero(m0[FEET - 20:FEET + 1].any(0))[0]; FEETX = float((xs.min() + xs.max()) / 2)
STAND_SRC = FEET - TOP

keyed = {}; union = None
for n, (F, idx, fps) in PICK.items():
    os.makedirs(os.path.join(LARGE, n), exist_ok=True); keyed[n] = []
    for j, i in enumerate(idx):
        kk = key(F[i]); keyed[n].append(kk); Image.fromarray(kk).save(os.path.join(LARGE, n, "%03d.webp" % j), quality=90)
        al = kk[..., 3] > 8; yy = np.nonzero(al.any(1))[0]; xx = np.nonzero(al.any(0))[0]
        if len(yy):
            bb = (xx.min(), yy.min(), xx.max(), yy.max()); union = bb if union is None else (min(union[0], bb[0]), min(union[1], bb[1]), max(union[2], bb[2]), max(union[3], bb[3]))
# one cell for every frame (same box), scaled so the standing gerbil is CELL_STAND px tall in the sheet
CELL_STAND = 96; s = CELL_STAND / STAND_SRC
x0, y0, x1, y1 = union[0] - 4, union[1] - 4, union[2] + 4, union[3] + 4
cw, ch = int(round((x1 - x0) * s)), int(round((y1 - y0) * s))
order = ["idle", "run", "bite", "death"]; COLS = 14; rows = {}; r = 0
for n in order: rows[n] = (r, len(keyed[n])); r += (len(keyed[n]) + COLS - 1) // COLS
sheet = Image.new("RGBA", (COLS * cw, r * ch), (0, 0, 0, 0))
for n in order:
    r0, cnt = rows[n]
    for j, kk in enumerate(keyed[n]):
        im = Image.fromarray(kk).crop((x0, y0, x1, y1)).resize((cw, ch), Image.LANCZOS)
        sheet.paste(im, ((j % COLS) * cw, (r0 + j // COLS) * ch))
os.makedirs(OUT, exist_ok=True); sheet.save(os.path.join(OUT, "gerbil_anim_v1.webp"), quality=88, method=6)
ax, ay = (FEETX - x0) * s, (FEET - y0) * s
run_px_per_cycle_cell = run_speed_src * s * len(run_idx)   # cell px the ground moves during one run cycle
meta = {"cw": cw, "ch": ch, "cols": COLS, "ax": round(ax, 2), "ay": round(ay, 2), "stand": CELL_STAND,
        "rows": {n: [rows[n][0], rows[n][1], PICK[n][2]] for n in order},
        "runGroundPerFrame": round(run_speed_src * s, 3), "biteHit": max(0, bite_peak)}
json.dump(meta, open(os.path.join(LARGE, "meta.json"), "w"), indent=1)
print("idle loop", idle_best, "frames", len(idle_idx)); print("run", run_best, "shifts", run_shifts, "speed src px/frame", run_speed_src)
print("bite frames", b_start, "->", bite_idx[-1], "peak at", bite_peak); print("death", d_start, "->", death_idx[-1], "slump", slump, "settle", settle)
print("sheet", sheet.size, os.path.getsize(os.path.join(OUT, "gerbil_anim_v1.webp")) // 1024, "KB"); print("GERBIL_ANIM", json.dumps(meta))
