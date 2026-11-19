"""Mockup (not game code): a volley of the black-flame white fireballs (Atlas loop, art/originals/heroes/siphon/fx/fear_fireball_loop_v1.mp4)
fired from Baelgor at an enemy Hanzo on a real Conquest background. Run: python3 dev/fx/fireball_volley_mock.py BG.png OUT_DIR"""
import glob, math, os, random, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."); BGP, OUT = sys.argv[1], sys.argv[2]; os.makedirs(os.path.join(OUT, "f"), exist_ok=True)
t = tempfile.mkdtemp(); subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals/heroes/siphon/fx/fear_fireball_loop_v1.mp4"), os.path.join(t, "%04d.png")], check=True)
def key(f):
    a = np.asarray(Image.open(f).convert("RGB")).astype(np.float32); M = np.median(a[:30].reshape(-1, 3), 0)
    d = a[..., 1] - np.maximum(a[..., 0], a[..., 2]); dm = M[1] - max(M[0], M[2]); al = np.clip(1 - (d - 25) / (dm * 0.85 - 25), 0, 1)
    c = np.clip((a - (1 - al[..., None]) * M) / np.maximum(al[..., None], 1e-3), 0, 255); c[..., 1] = np.minimum(c[..., 1], np.maximum(c[..., 0], c[..., 2])); al[al < 0.03] = 0
    return Image.fromarray(np.dstack([c, al * 255]).astype(np.uint8), "RGBA").crop((220, 230, 880, 540))
FB = [key(f) for f in sorted(glob.glob(os.path.join(t, "*.png")))[:-1]]; FB = [im.resize((round(im.width * 0.17), round(im.height * 0.17)), Image.LANCZOS) for im in FB]
CORE = (round(0.17 * (840 - 220 - 120)), round(0.17 * (390 - 230)))   # the white core sits near the front (right) of the crop
bg = Image.open(BGP).convert("RGBA"); W, H = bg.size
idl = Image.open(os.path.join(ROOT, "art/heroes/siphon/siphon_anim_v1.webp")).convert("RGBA").crop((0, 0, 497, 393)); kb = 2 * 68.35 / 393; bae = idl.resize((round(497 * kb), round(393 * kb)), Image.LANCZOS)
hz = Image.open(os.path.join(ROOT, "art/heroes/hanzo/hanzo_anim_v1.webp")).convert("RGBA").crop((0, 0, 274, 141)).transpose(Image.FLIP_LEFT_RIGHT); kh = 2 * 37.6 / 141; hzs = hz.resize((round(274 * kh), round(141 * kh)), Image.LANCZOS)
FEETY = 318; BX = 300; HX = 640
HAND = (BX + 30, FEETY - 62); TGT = (HX - 6, FEETY - 34); FPS = 30; random.seed(4)
shots = [{"t0": 0.5 + i * 0.16, "dy": random.uniform(-22, 22), "arc": random.uniform(10, 34), "fi": random.randrange(len(FB))} for i in range(10)]
DUR = 0.5; TOT = shots[-1]["t0"] + DUR + 1.2
def pos(s, tt):
    u = (tt - s["t0"]) / DUR
    if u < 0 or u > 1: return None
    x = HAND[0] + (TGT[0] - HAND[0]) * u; y = HAND[1] + s["dy"] * math.sin(u * math.pi) * 0.6 + (TGT[1] - HAND[1]) * u - s["arc"] * math.sin(u * math.pi)
    return x, y, u
for n in range(int(TOT * FPS)):
    tt = n / FPS; fr = bg.copy(); fr.alpha_composite(bae, (round(BX - 191.03 * kb), round(FEETY - 388.43 * kb)))
    hit = 0
    for s in shots:
        e = tt - s["t0"] - DUR
        if 0 <= e < 0.25: hit = max(hit, 1 - e / 0.25)
    hzx, hzy = round(HX - (274 - 82.83) * kh + (3 * math.sin(tt * 90) * hit)), round(FEETY - 135.65 * kh)
    fr.alpha_composite(hzs, (hzx, hzy))
    if hit > 0:   # white hit flash on Hanzo
        wf = Image.new("RGBA", hzs.size, (255, 255, 255, 0)); a = np.asarray(hzs)[..., 3].astype(np.float32) * 0.75 * hit; wf.putalpha(Image.fromarray(a.astype(np.uint8))); fr.alpha_composite(wf, (hzx, hzy))
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
    for s in shots:
        p = pos(s, tt)
        if p:
            im = FB[(s["fi"] + n) % len(FB)]; p2 = pos(s, min(tt + 0.02, s["t0"] + DUR)) or p; ang = math.degrees(math.atan2(-(p2[1] - p[1]), p2[0] - p[0]))
            r = im.rotate(ang, resample=Image.BICUBIC, expand=True); fr.alpha_composite(r, (round(p[0] - r.width / 2 - 20), round(p[1] - r.height / 2)))
        e = tt - s["t0"] - DUR
        if 0 <= e < 0.35:   # impact: white flash ring + black smoke puff
            q = e / 0.35; R = 8 + 34 * q; cx, cy = TGT[0] + s["dy"] * 0.2, TGT[1] + s["dy"] * 0.3
            dr.ellipse((cx - R * 0.6, cy - R * 0.6, cx + R * 0.6, cy + R * 0.6), fill=(20, 20, 24, int(150 * (1 - q))))
            dr.ellipse((cx - R, cy - R, cx + R, cy + R), outline=(255, 255, 255, int(230 * (1 - q))), width=max(1, round(4 * (1 - q))))
            if q < 0.3: dr.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(255, 255, 255, int(255 * (1 - q / 0.3))))
    fr.alpha_composite(lay.filter(ImageFilter.GaussianBlur(1.2)))
    fr.convert("RGB").save(os.path.join(OUT, "f", "%04d.png" % n))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "f", "%04d.png"), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", os.path.join(OUT, "fireball_volley_gamesize.mp4")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(OUT, "f", "%04d.png"), "-vf", "crop=500:240:220:110,scale=1000:480:flags=lanczos", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", os.path.join(OUT, "fireball_volley_zoom2x.mp4")], check=True)
import shutil; shutil.rmtree(t, ignore_errors=True); print("frames", n + 1)
