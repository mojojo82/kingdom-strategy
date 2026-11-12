"""Walker v3 (Harley): legs piece = ChatGPT \"remove the hull\" with the top filled in with machinery, animated whole in Atlas and drawn UNDER the hull (anim.under) - the hull overlaps its top, no stitch. Hull = the approved final cut along walker_hullline.json.
Walker v2 (Harley's method): the lower half (belly + hips + legs, cut along walker_cutline.json) is ONE Atlas walk cycle; the upper body is still art that
follows the lower half's measured rise/fall (bobTrack) so the seam stays joined. Lower sheet is drawn after the front layer (anim.over).
python3 dev/ships/build_walker2.py FRAMESDIR"""
import sys, glob, json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
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
up = keyarr(np.asarray(Image.open(D + "walker_hull_gpt.png").convert("RGB")))[oy:oy + H, ox:ox + W]  # v1538: ChatGPT hull separation (Harley)
bx0, by0, bx1, by1 = 330 - ox, 255 - oy, 1290 - ox, 370 - oy
box = np.zeros((H, W), bool); box[by0:by1, bx0:bx1] = True
dark = box & (up[..., :3].max(-1) < 45) & (up[..., 3] > 200); dark = ndimage.binary_opening(dark, iterations=2)
lab, n = ndimage.label(dark); sz = ndimage.sum(dark, lab, range(1, n + 1)); win = ndimage.binary_fill_holes(lab == (np.argmax(sz) + 1))
wy, wx = np.where(win); wb = wy.max() / H; k = 1000 / W
f = np.asarray(Image.fromarray((win * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
front = up.copy(); front[..., 3] *= (1 - f)
Image.fromarray(up.astype(np.uint8)).resize((1000, round(H * k)), Image.LANCZOS).save(D + "walker3_back.png")
Image.fromarray(front.astype(np.uint8)).resize((1000, round(H * k)), Image.LANCZOS).save(D + "walker3_front.png")
fs = sorted(glob.glob(FD + "/*.png")); idx = list(range(0, 120, 2))
st = np.asarray(Image.open(fs[0]).convert("L")).astype(float)
band = st[330:420, 120:1000]; band = band - band.mean()
frames, bob = [], []
for i in idx:
    g = np.asarray(Image.open(fs[i]).convert("L")).astype(float); best = (1e18, 0)
    for dy in range(-45, 8):
        b2 = g[330 + dy:420 + dy, 120:1000]; b2 = b2 - b2.mean(); e = ((b2 - band) ** 2).mean(); best = min(best, (e, dy))
    bob.append(best[1] / 0.75 / H)   # video px -> 1536 px -> fraction of ship height
    a = keyarr(np.asarray(Image.open(fs[i]).convert("RGB"))); big = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((1536, 1024), Image.LANCZOS)).astype(np.float32)[oy:oy + H, ox:ox + W]
    big[: max(0, 300 - oy)] = 0
    frames.append(big)
ly0 = max(0, int(min(np.where(fr[..., 3].max(1) > 100)[0].min() for fr in frames)) - 4)
SS = 0.6; tw, th = 1000, round((H - ly0) * k); sw, shh = round(tw * SS), round(th * SS)
cols = max(1, 4096 // sw); rowsN = (len(frames) + cols - 1) // cols
sheet = Image.new("RGBA", (sw * cols, shh * rowsN), (0, 0, 0, 0))
for q, big in enumerate(frames): sheet.paste(Image.fromarray(big[ly0:].astype(np.uint8)).resize((sw, shh), Image.LANCZOS), ((q % cols) * sw, (q // cols) * shh))
sheet.save(D + "walker3_legs_sheet.webp", "WEBP", quality=84, method=6)
wx0, wx1 = wx.min() / W, wx.max() / W; feet = wb + 85 / (H * k)
info = {"rx": 0, "ry": round(float(ly0 * k), 2), "tw": int(tw), "th": int(th), "sw": int(sw), "sh": int(shh), "cols": int(cols), "n": len(frames), "fps": 12,
        "bobTrack": [round(float(b), 4) for b in bob], "spots": [round(float(wx1 - (wx1 - wx0) * (0.12 + 0.19 * i)), 3) for i in range(5)], "feet": round(float(feet), 3),
        "c": [round(float((1300 - ox) / W), 3), round(float((425 - oy) / H), 3)]}
json.dump(info, open(D + "walker3_anim.json", "w")); print({k2: v for k2, v in info.items() if k2 != "bobTrack"}, "bob", round(min(bob), 3), round(max(bob), 3), sheet.size)
