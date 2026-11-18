"""Baelgor leap (siphon_skill_low_v1.mp4): rebuild the sword tip that goes off the top edge on frames 37-41.
Shape: the tip outline of the whole sword in frame 42 (upright, tip visible), scaled to the cut width of each frame and
leaned to that frame's blade angle. Colour: the frame's OWN blade pixels at the top edge, carried up along the blade
(so the red line, shading and blur match exactly). Every frame gets PAD px of the clip's green on top so the tip has room;
nothing below the original top edge is changed.   python3 dev/heroes/baelgor_tip_fix.py OUT_DIR"""
import sys, os, cv2, numpy as np
SRC = "art/originals/heroes/siphon/clips/siphon_skill_low_v1.mp4"; OUT = sys.argv[1]; PAD = 140; FIX = [37, 38, 39, 40, 41]; REF = 42
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
# reference tip outline: half-width as a function of distance below the tip
ar = alpha(fr[REF]); tip = np.where((ar > 0.5).any(1))[0].min(); rs = strip(ar, tip, tip + 120)
ref_w = rs[:, 2] - rs[:, 1] + 1                     # width per row from the tip down
bg = np.median(fr[0][:30].reshape(-1, 3), 0).astype(np.uint8)
out = []
for i, f in enumerate(fr):
    big = np.zeros((f.shape[0] + PAD, f.shape[1], 3), np.uint8); big[:] = bg; big[PAD:] = f
    if i in FIX:
        a = alpha(f); s = strip(a, 0, 60); cen = (s[:, 1] + s[:, 2]) / 2
        k, c = np.polyfit(s[:, 0], cen, 1)              # blade axis x = k*y + c
        w_top = s[:3, 2].mean() - s[:3, 1].mean() + 1
        # how far below the tip the reference reaches this width -> length of the missing part
        j = int(np.argmax(ref_w >= w_top)) if (ref_w >= w_top).any() else len(ref_w) - 1
        scale = w_top / ref_w[j]
        L = max(4, int(round(j * max(scale, 0.6))))     # missing length (shorter for narrow / edge-on blades)
        prof = f[0:3, int(s[0, 1]) - 2:int(s[0, 2]) + 3].astype(np.float32).mean(0)  # the blade's own top-edge colours
        pw = prof.shape[0]
        for d in range(1, L + 1):                       # d = rows above the edge
            y = PAD - d
            wr = np.interp(j - d * j / L, np.arange(len(ref_w)), ref_w) * (w_top / ref_w[j])
            xc = c - k * d                              # follow the blade's lean
            x0 = xc - wr / 2; x1 = xc + wr / 2
            for x in range(int(np.floor(x0)) - 1, int(np.ceil(x1)) + 2):
                cov = np.clip(min(x + 0.5, x1) - max(x - 0.5, x0), 0, 1)   # anti-aliased edge
                if cov <= 0: continue
                u = (x - x0) / max(wr, 1e-3)            # 0..1 across the blade -> same place in the edge profile
                col = prof[int(np.clip(round(u * (pw - 1)), 0, pw - 1))]
                big[y, x] = (col * cov + big[y, x] * (1 - cov)).astype(np.uint8)
        if i == 37:                                     # this frame is motion-blurred: blur the rebuilt part to match
            reg = big[PAD - L - 6:PAD, :].copy(); bl = cv2.GaussianBlur(reg, (7, 7), 0); big[PAD - L - 6:PAD, :] = bl
        print(i, "lean %.2f px/row" % k, "cut width %.0f" % w_top, "rebuilt %d px" % L)
    out.append(big)
H, W = out[0].shape[:2]
vw = cv2.VideoWriter(os.path.join(OUT, "fixed_raw.avi"), cv2.VideoWriter_fourcc(*"MJPG"), 24, (W, H))
for f in out: vw.write(f)
vw.release()
np.save(os.path.join(OUT, "fixed_36_42.npy"), np.array(out[36:43]))
np.save(os.path.join(OUT, "bg.npy"), bg)
