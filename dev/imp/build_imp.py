"""Imp grenadier enemy (replaces the Conquest 'lancer' skeleton, Harley 19 Oct 2026).
Sources (Leonardo / Hailuo, 480x480 24fps, magenta bg, all from the same padded start image so scale and feet line up):
  art/originals/imp_idle_hailuo.mp4    idle loop  = frames 66-114 (seamless), every 3rd -> 17 frames @8fps
  art/originals/imp_walk_hailuo.mp4    walk loop  = frames 47-84 (two steps, seamless), every 2nd -> 19 frames
  art/originals/imp_throw3_hailuo.mp4  throw      = frames 1-35, every 2nd -> 18 frames played over 1.0s (the lancer attacks once a second);
                                       release (bomb overhead, leaving) = row index 12. The bomb's smoke streak is erased after release.
Writes art/originals/sprites_hires/imp/imp_{idle,walk,throw}.png (full size, keyed) and art/conquest/imp.webp (phone copy, 3 rows).
Run: python3 dev/imp/build_imp.py  (needs ffmpeg + Pillow)"""
import os, subprocess, tempfile
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
CROP = (130, 55, 455, 372)          # shared box in the video frame (feet at y 370 in every clip)
CELL_H = 112                        # phone copy cell height (px)
ANCHOR = (120, 315)                 # body centre x / feet y inside the full-size cell
CLIPS = [("idle", "imp_idle_hailuo.mp4", list(range(66, 115, 3))),
         ("walk", "imp_walk_hailuo.mp4", list(range(47, 85, 2))),
         ("throw", "imp_throw3_hailuo.mp4", list(range(1, 37, 2)))]
RELEASE_SRC = 25                    # throw video frame (1-based) where the bomb leaves; later frames lose the streak above his head
def key(im):
    im = im.convert("RGBA"); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]; m = min(r, b) - g
            if m > 120: px[x, y] = (0, 0, 0, 0); continue
            if m > 35:
                s = m - 35; px[x, y] = (max(0, r - s), g, max(0, b - s), int(255 * (120 - m) / 85))
            elif m > 10:
                s = (m - 10) // 2; px[x, y] = (r - s, g, b - s, a)
    return im
rows = []
for name, vid, nums in CLIPS:
    tmp = tempfile.mkdtemp()
    subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "art/originals", vid), os.path.join(tmp, "%03d.png")], check=True)
    fr = []
    for n in nums:
        f = key(Image.open(os.path.join(tmp, "%03d.png" % n))).crop(CROP)
        if name == "throw" and n > RELEASE_SRC:      # bomb gone: wipe its streak (everything above his horns / left of his reach)
            px = f.load()
            for y in range(f.height):
                for x in range(f.width):
                    if y < 75 or (x < 15 and y < 200): px[x, y] = (0, 0, 0, 0)
        fr.append(f)
    cw, ch = fr[0].size
    strip = Image.new("RGBA", (cw * len(fr), ch)); [strip.paste(f, (i * cw, 0)) for i, f in enumerate(fr)]
    strip.save(os.path.join(ROOT, "art/originals/sprites_hires/imp/imp_%s.png" % name))
    rows.append(fr)
cw, ch = rows[0][0].size; k = CELL_H / ch; pw = round(cw * k); n = max(len(r) for r in rows)
sheet = Image.new("RGBA", (pw * n, CELL_H * len(rows)))
for ri, fr in enumerate(rows):
    for i, f in enumerate(fr): sheet.paste(f.resize((pw, CELL_H), Image.LANCZOS), (i * pw, ri * CELL_H))
sheet.save(os.path.join(ROOT, "art/conquest/imp.webp"), quality=80, method=6)
print("rows", [len(r) for r in rows], "phone cell", pw, CELL_H, "anchor", round(ANCHOR[0] * k, 1), round(ANCHOR[1] * k, 1), "full cell", cw, ch)
