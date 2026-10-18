"""Bat enemy (replaces the Conquest 'archer' curled sprite, Harley 19 Oct 2026).
Source: art/originals/bat_flap_hailuo.mp4 (480x480, 24fps, magenta bg). One flap = 20 frames; we keep every 2nd (10 frames, play at 12fps).
Writes: art/originals/sprites_hires/bat/bat_flap_10.png (full size, keyed) and art/conquest/bat_flap.webp (phone copy).
Run: python3 dev/bat/build_bat.py  (needs ffmpeg + Pillow)"""
import os, subprocess, tempfile, glob
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SRC = os.path.join(ROOT, "art/originals/bat_flap_hailuo.mp4")
FIRST, N, STEP, CELL_H = 41, 10, 2, 144  # CELL_H: phone copy cell height in px (drawn ~48 game px tall = ~150 phone px)
ANCHOR = (145, 111)                      # body centre in the full-size cell (sits on the old archer spot)
tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-i", SRC, os.path.join(tmp, "%03d.png")], check=True)
def key(im):
    im = im.convert("RGBA"); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            m = min(r, b) - g                      # how magenta
            if m > 120: px[x, y] = (0, 0, 0, 0); continue
            if m > 35:
                al = int(255 * (120 - m) / 85)
                s = m - 35                          # despill: remove the magenta cast from edge pixels
                px[x, y] = (max(0, r - s), g, max(0, b - s), al)
            # inner pixels with a pink cast (wing edges): soften the cast only
            elif m > 10:
                s = (m - 10) // 2; px[x, y] = (r - s, g, b - s, a)
    return im
fr = [key(Image.open(os.path.join(tmp, "%03d.png" % (FIRST + i * STEP)))) for i in range(N)]
bb = None
for f in fr:
    b = f.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
bb = (bb[0] - 2, bb[1] - 2, bb[2] + 2, bb[3] + 2)
fr = [f.crop(bb) for f in fr]
cw, ch = fr[0].size
out = Image.new("RGBA", (cw * N, ch)); [out.paste(f, (i * cw, 0)) for i, f in enumerate(fr)]
os.makedirs(os.path.join(ROOT, "art/originals/sprites_hires/bat"), exist_ok=True)
out.save(os.path.join(ROOT, "art/originals/sprites_hires/bat/bat_flap_10.png"))
k = CELL_H / ch; pw = round(cw * k)
ph = Image.new("RGBA", (pw * N, CELL_H))
for i, f in enumerate(fr): ph.paste(f.resize((pw, CELL_H), Image.LANCZOS), (i * pw, 0))
ph.save(os.path.join(ROOT, "art/conquest/bat_flap.webp"), quality=88, method=6)
print("crop box in video frame", bb, "full cell", cw, ch, "phone cell", pw, CELL_H, "anchor", round(ANCHOR[0] * k, 1), round(ANCHOR[1] * k, 1))
