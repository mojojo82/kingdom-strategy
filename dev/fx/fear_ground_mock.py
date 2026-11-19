"""Mockup (not game code): Fear's hand grabbing a hero standing on the GROUND (Harley 19 Nov: "how could you pull off a ground version").
Same in-game sheets (art/heroes/siphon/fear_portal_grab_v1 / desc_v1), same hand size as the mid-air grab - each frame is split in two:
the portal part (ring + ground smoke, below SPL) stays where it is, the hand part (above SPL) is drawn D cells lower and cut off at SPL, so the arm
comes out of the hole and the fist closes on his chest. LIFT=1: the fist raises him a few px while it holds him and drops him on release.
Run: python3 dev/fx/fear_ground_mock.py BG.png OUT.mp4"""
import glob, math, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BG, OUT = sys.argv[1], sys.argv[2]
CW, CH, COLS = 216, 297, 18; RINGX, PORTY, GRABY = 106.8, 256.5, 114.0
GRAB = Image.open(os.path.join(ROOT, "art/heroes/siphon/fear_portal_grab_v1.webp")).convert("RGBA"); DESC = Image.open(os.path.join(ROOT, "art/heroes/siphon/fear_portal_desc_v1.webp")).convert("RGBA")
cell = lambda sh, i: sh.crop(((i % COLS) * CW, (i // COLS) * CH, (i % COLS) * CW + CW, (i // COLS) * CH + CH))
bg = Image.open(BG).convert("RGB").crop((0, 380, 860, 760)); FEETY, HX = 333, 600
HZ = sorted(glob.glob(os.path.join(ROOT, "art/originals/heroes/hanzo/large/idle/*.webp"))); HK = 66 / 391.0; HFX, HFY = 561.5, 657
F = float(os.environ.get("HANDF", "1.66"))   # scene px per sheet cell: 1.66 = the approved mockup's size (measured: its portal ring is 242 scene px wide); 0.84 = first try (half size)
SPL = 230.0   # sheet row just above the portal ring: below = portal part (stays), above = hand part (moves down)
CENTER = 33   # his middle, scene px above his feet
D = (PORTY - CENTER / F) - GRABY   # cells the hand part moves down so the fist closes on his middle
FPS, STUN = 30, 4.0
def desc_idx(rel): DS, DC, DK = 4, 2, 90; tk = DK / (24 * DS); return int(rel * 24 * DS) if rel < tk else int(DK + (rel - tk) * 24 * DC)
def frame_at(t):
    if t < STUN: e = t * 36; return ("g", min(61, int(e / 2)), e >= 108)
    di = desc_idx(t - STUN); return ("d", min(51, di // 2), False) if di <= 102 else None
def draw_split(fr, im, x0, y0, part):   # part "portal" / "hand"
    if part == "portal":
        p = im.crop((0, int(SPL), CW, CH)).resize((round(CW * F), round((CH - int(SPL)) * F)), Image.LANCZOS); fr.alpha_composite(p, (x0, round(y0 + int(SPL) * F)))
    else:
        top = int(SPL - D)
        if top <= 0: return
        h = im.crop((0, 0, CW, top)).resize((round(CW * F), round(top * F)), Image.LANCZOS); yy = round(y0 + D * F)
        # fade the last few rows into the cut so the seam with the arm base isn't a hard line
        a = np.asarray(h).astype(np.float32); n = a.shape[0]; r = min(n, 6); a[n - r:, :, 3] *= np.linspace(1, 0.35, r)[:, None]; h = Image.fromarray(a.astype(np.uint8))
        fr.alpha_composite(h, (x0, yy))
def render(lift, out):
    tmp = tempfile.mkdtemp(); n = int((STUN + 2.2) * FPS); x0 = round(HX - RINGX * F); y0 = round(FEETY - PORTY * F + 4)
    for i in range(n):
        t = i / FPS - 0.5; fr = bg.copy().convert("RGBA"); cur = frame_at(t) if t >= 0 else None
        im = cell(GRAB if cur and cur[0] == "g" else DESC, cur[1]) if cur else None; front = bool(cur and cur[2])
        lf = 0.0
        if lift and t >= 108 / 36:
            up = min(1, (t - 108 / 36) / 0.35); down = min(1, max(0, (t - STUN) / 0.25)); lf = 8 * up * (1 - down) * (1 - down)
        if im: draw_split(fr, im, x0, y0, "portal")
        if im and not front: draw_split(fr, im, x0, y0, "hand")
        hz = Image.open(HZ[int((max(0, t) * 24) % len(HZ))]).convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
        hs = hz.resize((round(hz.width * HK), round(hz.height * HK)), Image.LANCZOS); hx = round(HX - (hz.width - HFX) * HK); hy = round(FEETY - lf - HFY * HK)
        fr.alpha_composite(hs, (hx, max(0, hy)))
        if im and front: draw_split(fr, im, x0, y0, "hand")
        fr.convert("RGB").crop((HX - 200, 95, HX + 200, 345 + 25)).resize((800, 500), Image.LANCZOS).save(os.path.join(tmp, "%04d.png" % i))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(tmp, "%04d.png"), "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p", out], check=True)
    return tmp
t0 = render(False, OUT.replace(".mp4", "_nolift.mp4")); t1 = render(True, OUT.replace(".mp4", "_lift.mp4"))
ims = [Image.open(os.path.join(t1, "%04d.png" % k)) for k in (20, 40, 60, 85, 110, 150, 170, 178)]
sh = Image.new("RGB", (4 * 400, 2 * 250)); [sh.paste(im.resize((400, 250)), ((j % 4) * 400, (j // 4) * 250)) for j, im in enumerate(ims)]; sh.save(OUT.replace(".mp4", "_sheet.png")); print("ok", D)
