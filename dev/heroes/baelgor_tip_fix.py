"""Baelgor leap: rebuild the sword tip that goes off the top edge.
- Length of the missing piece: measured per frame (how far the hilt's eye gem is below the top edge vs the whole blade's
  tip-to-eye length in a frame where the blade is fully visible), given on the command line as frame:length pairs.
- Outline: the reference blade's own tip outline, scaled to the cut blade's real width (corrected for its lean).
- Colour: the frame's OWN blade pixels at the top edge, carried up along the blade (red line, shading and blur match).
Every frame gets PAD px of the clip's green on top; nothing below the original top edge changes.
  python3 dev/heroes/baelgor_tip_fix.py OUT_DIR CLIP REF_FRAME 37:30,38:6,...   (frame:missing length along the blade)"""
import sys, os, cv2, numpy as np
OUT, SRC, REF = sys.argv[1], sys.argv[2], int(sys.argv[3]); PAD = 140
MISS = {int(a): float(b) for a, b in (p.split(":") for p in sys.argv[4].split(","))}
os.makedirs(OUT, exist_ok=True)
cap = cv2.VideoCapture(SRC); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(f)
def alpha(f):
    b, g, r = [f[:, :, k].astype(np.float32) for k in range(3)]
    return np.clip(1 - ((g - np.maximum(r, b)) - 30) / 90, 0, 1)
def strip(a, y0, y1):
    pts = []
    for y in range(y0, y1):
        xs = np.where(a[y] > 0.5)[0]
        if len(xs) == 0: continue
        runs = np.split(xs, np.where(np.diff(xs) > 3)[0] + 1)
        run = min(runs, key=lambda r: abs(r.mean() - (pts[-1][1] if pts else r.mean())))
        pts.append((y, run.min(), run.max()))
    return np.array(pts, float)
ar = alpha(fr[REF]); tip = np.where((ar > 0.5).any(1))[0].min(); rs = strip(ar, tip, tip + 160)
ref_w = rs[:, 2] - rs[:, 1] + 1; ref_full = np.median(ref_w[80:140])
bg = np.median(fr[0][:30].reshape(-1, 3), 0).astype(np.uint8)
out = []
for i, f in enumerate(fr):
    big = np.zeros((f.shape[0] + PAD, f.shape[1], 3), np.uint8); big[:] = bg; big[PAD:] = f
    if i in MISS and MISS[i] > 0:
        a = alpha(f); s = strip(a, 0, 60); cen = (s[:, 1] + s[:, 2]) / 2
        k, c = np.polyfit(s[:, 0], cen, 1); ct = 1 / np.sqrt(1 + k * k)
        w_top = s[:3, 2].mean() - s[:3, 1].mean() + 1; w_true = w_top * ct
        body = np.median(s[20:60, 2] - s[20:60, 1] + 1) * ct
        sref = max(body, w_true) / ref_full              # this blade's size vs the reference blade
        Lm = MISS[i]
        prof = f[0:3, int(s[0, 1]) - 2:int(s[0, 2]) + 3].astype(np.float32).mean(0); pw = prof.shape[0]
        rows = int(np.ceil(Lm * ct)) + 1
        join = w_true / max(1.0, sref * np.interp(Lm / sref, np.arange(len(ref_w)), ref_w))   # widths meet exactly at the cut
        for d in range(1, rows + 1):
            t = Lm - d / ct                              # distance from the tip along the blade
            if t < 0: break
            wt = sref * np.interp(t / sref, np.arange(len(ref_w)), ref_w) * join   # the reference outline, notches and all
            wr = wt / ct; xc = c - k * d; y = PAD - d
            x0, x1 = xc - wr / 2, xc + wr / 2
            for x in range(int(np.floor(x0)) - 1, int(np.ceil(x1)) + 2):
                cov = np.clip(min(x + 0.5, x1) - max(x - 0.5, x0), 0, 1)
                if cov <= 0: continue
                u = (x - xc) / max(wr, 1e-3) * (wr / max(w_top, 1e-3)) + 0.5   # same place across the blade as at the cut
                col = prof[int(np.clip(round(u * (pw - 1)), 0, pw - 1))]
                big[y, x] = (col * cov + big[y, x] * (1 - cov)).astype(np.uint8)
        if abs(k) > 0.35:                                 # swinging fast = motion-blurred in the clip: blur the new part to match
            y0 = max(0, PAD - rows - 6); big[y0:PAD] = cv2.GaussianBlur(big[y0:PAD], (7, 7), 0)
        print(i, "lean %.2f" % k, "cut width %.0f (real %.0f)" % (w_top, w_true), "rebuilt %.0f px along the blade" % Lm)
    out.append(big)
H, W = out[0].shape[:2]
vw = cv2.VideoWriter(os.path.join(OUT, "fixed_raw.avi"), cv2.VideoWriter_fourcc(*"MJPG"), 24, (W, H))
for f in out: vw.write(f)
vw.release(); np.save(os.path.join(OUT, "bg.npy"), bg)
