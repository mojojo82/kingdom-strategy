"""Walker skin: body (ChatGPT body-only) + Atlas leg walk cycle (legs drawn in front of the body, far legs tucked behind it), body bob synced to the legs.
python3 dev/ships/build_walker.py FRAMESDIR   -> art/originals/ships/walker/walker_{back,front}.png, walker_legs_sheet.webp, walker_anim.json"""
import sys, glob, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
D = "art/originals/ships/walker/"; FD = sys.argv[1]
def keyarr(a):
    a = a.astype(np.float32); M = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0)
    d = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]; dm = min(M[0], M[2]) - M[1]
    al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1); c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255)
    sp = (c[..., 0] > c[..., 1] + 12) & (c[..., 2] > c[..., 1] + 12); c[sp] = c[sp] * 0.4 + np.stack([c[..., 1]] * 3, -1)[sp] * 0.6
    al[al < 0.04] = 0; return np.dstack([c, al * 255])
fin = np.asarray(Image.open(D + "walker_final_v1.png").convert("RGB")).astype(int)
m = ~((fin[..., 0] > 200) & (fin[..., 2] > 200) & (fin[..., 1] < 80)); ys, xs = np.where(m); ox, oy = xs.min(), ys.min(); W, H = xs.max() - ox + 1, ys.max() - oy + 1
body = keyarr(np.asarray(Image.open(D + "walker_body.png").convert("RGB")))[oy:oy + H, ox:ox + W]
# window (one open slit): darkest connected region inside the slit box (final coords 330-1290 x, 255-370 y)
bx0, by0, bx1, by1 = 330 - ox, 255 - oy, 1290 - ox, 370 - oy
box = np.zeros((H, W), bool); box[by0:by1, bx0:bx1] = True
dark = box & (body[..., :3].max(-1) < 45) & (body[..., 3] > 200); dark = ndimage.binary_opening(dark, iterations=2)
lab, n = ndimage.label(dark); sz = ndimage.sum(dark, lab, range(1, n + 1)); win = ndimage.binary_fill_holes(lab == (np.argmax(sz) + 1))
wy, wx = np.where(win); wb = wy.max() / H
k = 1000 / W; feet = wb + 85 / (H * k); crop = feet + 0.07
f = np.asarray(Image.fromarray((win * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
front = body.copy(); front[..., 3] *= (1 - f); rows = np.arange(H)[:, None] / H; front[..., 3] *= np.clip((crop - rows) / 0.01, 0, 1)
Image.fromarray(body.astype(np.uint8)).resize((1000, round(H * k)), Image.LANCZOS).save(D + "walker_back.png")
Image.fromarray(front.astype(np.uint8)).resize((1000, round(H * k)), Image.LANCZOS).save(D + "walker_front.png")
# legs: frames 0..118 step 2 (the clip ends on its start pose); bob = how far the leg tops rose
fs = sorted(glob.glob(FD + "/*.png")); idx = list(range(0, 120, 2)); tops = []; frames = []
for i in idx:
    a = keyarr(np.asarray(Image.open(fs[i]).convert("RGB"))); big = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((1536, 1024), Image.LANCZOS)).astype(np.float32)[oy:oy + H, ox:ox + W]
    al = big[..., 3] > 128; t = []
    for x0, x1 in [(0, 300), (300, 576), (576, 860), (860, 1152)]:
        X0, X1 = int(x0 / 0.75) - ox, int(x1 / 0.75) - ox; sub = al[:, max(0, X0):max(0, X1)]; yy = np.where(sub.any(1))[0]
        if len(yy): t.append(yy.min())
    tops.append(np.mean(t)); frames.append(big)
t0 = tops[0]; bob = [(tp - t0) / H for tp in tops]
FAR = [(415 - ox, 640 - ox), (840 - ox, 1090 - ox)]
bodyal = body[..., 3] > 128
for q, big in enumerate(frames):
    sh = int(round(bob[q] * H)); bm = np.roll(bodyal, sh, axis=0)
    if sh < 0: bm[sh:] = False
    elif sh > 0: bm[:sh] = False
    for x0, x1 in FAR: big[:, x0:x1, 3][bm[:, x0:x1]] = 0   # far legs tuck behind the body
ly0 = max(0, int(min(np.where(fr[..., 3].max(1) > 100)[0].min() for fr in frames)) - 4)
SS = 0.6; tw, th = 1000, round((H - ly0) * k); sw, shh = round(tw * SS), round(th * SS)
cols = max(1, 4096 // sw); rowsN = (len(frames) + cols - 1) // cols
sheet = Image.new("RGBA", (sw * cols, shh * rowsN), (0, 0, 0, 0))
for q, big in enumerate(frames):
    im = Image.fromarray(big[ly0:].astype(np.uint8)).resize((sw, shh), Image.LANCZOS); sheet.paste(im, ((q % cols) * sw, (q // cols) * shh))
sheet.save(D + "walker_legs_sheet.webp", "WEBP", quality=84, method=6)
wx0, wx1 = wx.min() / W, wx.max() / W
spots = [round(wx1 - (wx1 - wx0) * (0.12 + 0.19 * i), 3) for i in range(5)]
info = {"rx": 0, "ry": round(float(ly0 * k), 2), "tw": int(tw), "th": int(th), "sw": int(sw), "sh": int(shh), "cols": cols, "n": len(frames), "fps": 12, "bobTrack": [round(float(b), 4) for b in bob],
        "spots": [float(x) for x in spots], "feet": round(float(feet), 3), "c": [round(float((1300 - ox) / W), 3), round(float((425 - oy) / H), 3)], "canvas": [int(W), int(H), int(ox), int(oy)], "winBottom": round(float(wb), 3)}
json.dump(info, open(D + "walker_anim.json", "w")); print({k2: v for k2, v in info.items() if k2 != "bobTrack"}, "bob range", round(min(bob), 3), round(max(bob), 3), "sheet", sheet.size)
