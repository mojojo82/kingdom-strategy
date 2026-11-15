"""Cut Iron Lily's hand-drawn slash sheets (ChatGPT, 4x2 grid on green) into sprites + measure each arc.
python3 dev/heroes/lily/cut_slashes.py OUT_DIR SHEET.png [SHEET2.png ...]
For each slash: fit a circle to its white cutting edge -> centre + radius; angular span of the slash body near that circle; which end
is the TIP (the white edge runs out to the tip; the frayed tail is the other end); fit quality (hooks / S-shapes fail -> ok: false).
Writes slash_<i>.png (RGBA) + slashes.json."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True); meta = []
for SRC in sys.argv[2:]:
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    BG = np.median(a[:30, :30].reshape(-1, 3), 0)
    sp = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    al = 1 - np.clip((sp - 18) / (BG[1] - max(BG[0], BG[2]) - 30), 0, 1)
    fg = (a - (1 - al)[..., None] * BG) / np.maximum(al, 1e-3)[..., None]
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]) + 6)
    al[al < 0.05] = 0
    H, W = al.shape; rows, cols = 2, 4
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = r * H // rows, (r + 1) * H // rows, c * W // cols, (c + 1) * W // cols
            m = al[y0:y1, x0:x1] > 0.3
            lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=6))
            if n == 0: continue
            big = np.argmax(ndimage.sum(m, lab, range(1, n + 1))) + 1
            keep = ndimage.binary_dilation(lab == big, iterations=2)
            ys, xs = np.nonzero(m & keep); by0, by1, bx0, bx1 = max(0, ys.min() - 4), ys.max() + 5, max(0, xs.min() - 4), xs.max() + 5
            A = (al[y0:y1, x0:x1] * keep)[by0:by1, bx0:bx1]; C = fg[y0:y1, x0:x1][by0:by1, bx0:bx1]
            img = np.dstack([C.clip(0, 255), A * 255]).astype(np.uint8)
            i = len(meta); Image.fromarray(img, 'RGBA').save(os.path.join(OUT, 'slash_%d.png' % i))
            wh = (C.min(-1) > 215) & (A > 0.8); wy, wx = np.nonzero(wh)
            M = np.c_[wx, wy, np.ones(len(wx))]; bb = wx ** 2 + wy ** 2
            sol = np.linalg.lstsq(M, bb, rcond=None)[0]; cx, cy = sol[0] / 2, sol[1] / 2; R = float(np.sqrt(max(1, sol[2] + cx ** 2 + cy ** 2)))
            res = float(np.std(np.hypot(wx - cx, wy - cy) - R) / R)          # how well the cutting edge follows the circle
            oy, ox = np.nonzero(A > 0.3); dd = np.hypot(oy - cy, ox - cx); band = np.abs(dd - R) < 0.3 * R   # ignore splatter
            oy, ox = oy[band], ox[band]; ang = np.sort(np.degrees(np.arctan2(oy - cy, ox - cx)))
            gaps = np.diff(np.r_[ang, ang[0] + 360]); g = int(np.argmax(gaps))
            s0 = ang[(g + 1) % len(ang)]; s1 = ang[g]; span = float((s1 - s0) % 360 or 360)
            wa = (np.degrees(np.arctan2(wy - cy, wx - cx)) - s0) % 360
            tip_at_end = bool(np.mean(wa) > span / 2)
            meta.append(dict(ok=bool(res < 0.05 and 30 < span < 350), fit=round(res, 3), sheet=os.path.basename(SRC), file='slash_%d.png' % i,
                             w=img.shape[1], h=img.shape[0], cx=round(float(cx), 1), cy=round(float(cy), 1), r=round(R, 1),
                             a0=round(float(s0), 1), span=round(span, 1), tipAtEnd=tip_at_end))
            print(meta[-1])
json.dump(meta, open(os.path.join(OUT, 'slashes.json'), 'w'), indent=1)
